import { createClient } from '@/lib/supabase/server'
import {
  BallInput,
  CurrentBatsman,
  CurrentBowler,
  Match,
  WicketType,
} from '@/types/match'
import {
  shouldRotateStrike,
  isOverComplete,
  shouldEndInnings,
  ballsToOvers,
  calculateMatchResult,
  calculateTarget,
  isMaidenOver,
} from './rules'
import { calculateStrikeRate, calculateEconomy } from './stats-calculator'

/**
 * Match Engine - Core cricket match state machine
 * Handles all match operations: recording balls, wickets, overs, innings
 */
export class MatchEngine {
  private supabase = createClient()
  private matchId: string

  constructor(matchId: string) {
    this.matchId = matchId
  }

  /**
   * Record a legal delivery (runs scored)
   */
  async recordRuns(
    runs: number,
    batsmanId: string,
    nonStrikerId: string,
    bowlerId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current match state
      const { data: match, error: matchError } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', this.matchId)
        .single()

      if (matchError || !match) {
        return { success: false, error: 'Match not found' }
      }

      const currentInnings = match.current_innings
      const isFirstInnings = currentInnings === 1

      // Calculate ball number
      const totalBalls = isFirstInnings
        ? match.team1_overs * 6 + match.team1_balls
        : match.team2_overs * 6 + match.team2_balls

      const { overs, balls } = ballsToOvers(totalBalls)
      const ballNumber = balls + 1

      // Record ball
      await this.supabase.from('balls').insert({
        match_id: this.matchId,
        innings_number: currentInnings,
        over_number: overs,
        ball_number: ballNumber,
        batsman_id: batsmanId,
        non_striker_id: nonStrikerId,
        bowler_id: bowlerId,
        runs_scored: runs,
        ball_type: 'legal',
        is_boundary: runs === 4,
        is_six: runs === 6,
      })

      // Update batting stats
      await this.updateBattingStats(batsmanId, {
        runs,
        balls: 1,
        fours: runs === 4 ? 1 : 0,
        sixes: runs === 6 ? 1 : 0,
      })

      // Update bowling stats
      await this.updateBowlingStats(bowlerId, {
        balls: 1,
        runs,
      })

      // Update match score
      const newScore = isFirstInnings
        ? match.team1_score + runs
        : match.team2_score + runs
      const newBalls = balls + 1

      const updateData = isFirstInnings
        ? {
            team1_score: newScore,
            team1_balls: newBalls,
          }
        : {
            team2_score: newScore,
            team2_balls: newBalls,
          }

      // Check if over is complete (6 balls)
      if (newBalls === 6) {
        const newOvers = isFirstInnings
          ? match.team1_overs + 1
          : match.team2_overs + 1
        Object.assign(updateData, isFirstInnings ? { team1_overs: newOvers, team1_balls: 0 } : { team2_overs: newOvers, team2_balls: 0 })
      }

      await this.supabase
        .from('matches')
        .update(updateData)
        .eq('id', this.matchId)

      // Check for innings end (overs complete or target chased)
      const currentWickets = isFirstInnings
        ? match.team1_wickets
        : match.team2_wickets
      const currentOvers = isFirstInnings
        ? match.team1_overs + (newBalls === 6 ? 1 : 0)
        : match.team2_overs + (newBalls === 6 ? 1 : 0)
      const currentBalls = newBalls === 6 ? 0 : newBalls

      // Check overs complete or target chased (not all out - that's checked elsewhere)
      if (currentOvers >= match.total_overs && currentBalls === 0) {
        await this.handleInningsEnd('overs_complete')
      } else if (match.target && newScore >= match.target) {
        await this.handleInningsEnd('target_chased')
      }

      return { success: true }
    } catch (error) {
      console.error('Error recording runs:', error)
      return { success: false, error: 'Failed to record runs' }
    }
  }

  /**
   * Record a wide delivery
   */
  async recordWide(
    batsmanId: string,
    nonStrikerId: string,
    bowlerId: string,
    additionalRuns: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: match } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', this.matchId)
        .single()

      if (!match) return { success: false, error: 'Match not found' }

      const currentInnings = match.current_innings
      const isFirstInnings = currentInnings === 1

      const totalBalls = isFirstInnings
        ? match.team1_overs * 6 + match.team1_balls
        : match.team2_overs * 6 + match.team2_balls

      const { overs, balls } = ballsToOvers(totalBalls)

      // Wide: 1 run penalty + any additional runs
      const totalRuns = 1 + additionalRuns

      // Record ball (note: ball_number doesn't increment for wide)
      await this.supabase.from('balls').insert({
        match_id: this.matchId,
        innings_number: currentInnings,
        over_number: overs,
        ball_number: balls, // Same ball number (doesn't count)
        batsman_id: batsmanId,
        non_striker_id: nonStrikerId,
        bowler_id: bowlerId,
        runs_scored: additionalRuns,
        extras: 1,
        ball_type: 'wide',
      })

      // Update bowling stats (runs but no ball counted)
      await this.updateBowlingStats(bowlerId, {
        balls: 0, // Wide doesn't count as ball
        runs: totalRuns,
      })

      // Update match score
      const newScore = isFirstInnings
        ? match.team1_score + totalRuns
        : match.team2_score + totalRuns

      await this.supabase
        .from('matches')
        .update(
          isFirstInnings
            ? { team1_score: newScore }
            : { team2_score: newScore }
        )
        .eq('id', this.matchId)

      // Update innings extras
      await this.supabase
        .from('match_innings')
        .update({ extras_wide: match.current_innings === 1 ? 1 : 1 })
        .eq('match_id', this.matchId)
        .eq('innings_number', currentInnings)

      return { success: true }
    } catch (error) {
      console.error('Error recording wide:', error)
      return { success: false, error: 'Failed to record wide' }
    }
  }

  /**
   * Record a no ball
   */
  async recordNoBall(
    batsmanId: string,
    nonStrikerId: string,
    bowlerId: string,
    additionalRuns: number = 0
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: match } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', this.matchId)
        .single()

      if (!match) return { success: false, error: 'Match not found' }

      const currentInnings = match.current_innings
      const isFirstInnings = currentInnings === 1

      const totalBalls = isFirstInnings
        ? match.team1_overs * 6 + match.team1_balls
        : match.team2_overs * 6 + match.team2_balls

      const { overs, balls } = ballsToOvers(totalBalls)

      // No ball: 1 run penalty + runs scored off bat
      const totalRuns = 1 + additionalRuns

      await this.supabase.from('balls').insert({
        match_id: this.matchId,
        innings_number: currentInnings,
        over_number: overs,
        ball_number: balls,
        batsman_id: batsmanId,
        non_striker_id: nonStrikerId,
        bowler_id: bowlerId,
        runs_scored: additionalRuns,
        extras: 1,
        ball_type: 'noball',
      })

      // Update batting stats for runs scored off bat
      if (additionalRuns > 0) {
        await this.updateBattingStats(batsmanId, {
          runs: additionalRuns,
          balls: 0, // No ball doesn't count
          fours: additionalRuns === 4 ? 1 : 0,
          sixes: additionalRuns === 6 ? 1 : 0,
        })
      }

      // Update bowling stats
      await this.updateBowlingStats(bowlerId, {
        balls: 0,
        runs: totalRuns,
      })

      // Update match score
      const newScore = isFirstInnings
        ? match.team1_score + totalRuns
        : match.team2_score + totalRuns

      await this.supabase
        .from('matches')
        .update(
          isFirstInnings
            ? { team1_score: newScore }
            : { team2_score: newScore }
        )
        .eq('id', this.matchId)

      // Update innings extras
      await this.supabase
        .from('match_innings')
        .update({ extras_noball: 1 })
        .eq('match_id', this.matchId)
        .eq('innings_number', currentInnings)

      return { success: true }
    } catch (error) {
      console.error('Error recording no ball:', error)
      return { success: false, error: 'Failed to record no ball' }
    }
  }

  /**
   * Record a wicket
   */
  async recordWicket(
    batsmanId: string,
    nonStrikerId: string,
    bowlerId: string,
    wicketType: WicketType
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: match } = await this.supabase
        .from('matches')
        .select('*')
        .eq('id', this.matchId)
        .single()

      if (!match) return { success: false, error: 'Match not found' }

      const currentInnings = match.current_innings
      const isFirstInnings = currentInnings === 1

      const totalBalls = isFirstInnings
        ? match.team1_overs * 6 + match.team1_balls
        : match.team2_overs * 6 + match.team2_balls

      const { overs, balls } = ballsToOvers(totalBalls)
      const ballNumber = balls + 1

      // Record ball
      await this.supabase.from('balls').insert({
        match_id: this.matchId,
        innings_number: currentInnings,
        over_number: overs,
        ball_number: ballNumber,
        batsman_id: batsmanId,
        non_striker_id: nonStrikerId,
        bowler_id: bowlerId,
        runs_scored: 0,
        ball_type: 'wicket',
        wicket_type: wicketType,
      })

      // Update batting stats (mark as out)
      await this.updateBattingStats(batsmanId, {
        balls: 1,
        isOut: true,
        dismissalType: wicketType,
      })

      // Update bowling stats (if bowler gets credit)
      const bowlerGetsWicket = !['run_out', 'retired_hurt'].includes(wicketType)
      if (bowlerGetsWicket) {
        await this.updateBowlingStats(bowlerId, {
          balls: 1,
          wickets: 1,
        })
      } else {
        await this.updateBowlingStats(bowlerId, {
          balls: 1,
        })
      }

      // Update match wickets and balls
      // Retired hurt does NOT count as a wicket
      const isRetiredHurt = wicketType === 'retired_hurt'
      const currentWickets = isFirstInnings ? match.team1_wickets : match.team2_wickets
      const newWickets = isRetiredHurt ? currentWickets : currentWickets + 1
      const newBalls = balls + 1

      const updateData = isFirstInnings
        ? {
            team1_wickets: newWickets,
            team1_balls: newBalls,
          }
        : {
            team2_wickets: newWickets,
            team2_balls: newBalls,
          }

      // Check if over is complete
      if (newBalls === 6) {
        const newOvers = isFirstInnings
          ? match.team1_overs + 1
          : match.team2_overs + 1
        Object.assign(updateData, isFirstInnings ? { team1_overs: newOvers, team1_balls: 0 } : { team2_overs: newOvers, team2_balls: 0 })
      }

      await this.supabase
        .from('matches')
        .update(updateData)
        .eq('id', this.matchId)

      // Check for innings end (all out) - retired hurt doesn't end innings
      if (!isRetiredHurt) {
        // Get the batting team's total players
        const { data: matchData } = await this.supabase
          .from('matches')
          .select('*, team1:team1_id(*, team_players(*)), team2:team2_id(*, team_players(*))')
          .eq('id', this.matchId)
          .single()

        if (matchData) {
          const battingTeam = isFirstInnings ? matchData.team1 : matchData.team2
          const totalPlayers = (battingTeam as any)?.team_players?.length || 0

          // Get count of actual wickets (excluding retired hurt)
          const { data: stats } = await this.supabase
            .from('batting_stats')
            .select('*')
            .eq('match_id', this.matchId)
            .eq('innings_number', currentInnings)

          // Count how many are actually out (not retired hurt)
          const actualWickets = stats?.filter(
            (s) => s.is_out && s.dismissal_type !== 'retired_hurt'
          ).length || 0

          // All out when all players are out (regardless of team size)
          if (actualWickets >= totalPlayers) {
            await this.handleInningsEnd('all_out')
          }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error recording wicket:', error)
      return { success: false, error: 'Failed to record wicket' }
    }
  }

  /**
   * Update batting stats for a player
   */
  private async updateBattingStats(
    playerId: string,
    updates: {
      runs?: number
      balls?: number
      fours?: number
      sixes?: number
      isOut?: boolean
      dismissalType?: string
    }
  ) {
    const { data: match } = await this.supabase
      .from('matches')
      .select('current_innings')
      .eq('id', this.matchId)
      .single()

    if (!match) return

    // Get existing stats
    const { data: existing } = await this.supabase
      .from('batting_stats')
      .select('*')
      .eq('match_id', this.matchId)
      .eq('team_player_id', playerId)
      .eq('innings_number', match.current_innings)
      .single()

    const newRuns = (existing?.runs || 0) + (updates.runs || 0)
    const newBalls = (existing?.balls_faced || 0) + (updates.balls || 0)
    const newFours = (existing?.fours || 0) + (updates.fours || 0)
    const newSixes = (existing?.sixes || 0) + (updates.sixes || 0)

    const statsData = {
      runs: newRuns,
      balls_faced: newBalls,
      fours: newFours,
      sixes: newSixes,
      strike_rate: calculateStrikeRate(newRuns, newBalls),
      is_out: updates.isOut !== undefined ? updates.isOut : existing?.is_out,
      dismissal_type:
        updates.dismissalType || existing?.dismissal_type || null,
    }

    if (existing) {
      await this.supabase
        .from('batting_stats')
        .update(statsData)
        .eq('id', existing.id)
    } else {
      await this.supabase.from('batting_stats').insert({
        match_id: this.matchId,
        team_player_id: playerId,
        innings_number: match.current_innings,
        ...statsData,
      })
    }
  }

  /**
   * Update bowling stats for a player
   */
  private async updateBowlingStats(
    playerId: string,
    updates: {
      balls?: number
      runs?: number
      wickets?: number
    }
  ) {
    const { data: match } = await this.supabase
      .from('matches')
      .select('current_innings')
      .eq('id', this.matchId)
      .single()

    if (!match) return

    const { data: existing } = await this.supabase
      .from('bowling_stats')
      .select('*')
      .eq('match_id', this.matchId)
      .eq('team_player_id', playerId)
      .eq('innings_number', match.current_innings)
      .single()

    const newBalls = (existing?.balls_bowled || 0) + (updates.balls || 0)
    const newRuns = (existing?.runs_conceded || 0) + (updates.runs || 0)
    const newWickets = (existing?.wickets || 0) + (updates.wickets || 0)

    const { overs, balls } = ballsToOvers(newBalls)

    const statsData = {
      overs,
      balls_bowled: newBalls,
      runs_conceded: newRuns,
      wickets: newWickets,
      economy_rate: calculateEconomy(newRuns, overs, balls),
    }

    if (existing) {
      await this.supabase
        .from('bowling_stats')
        .update(statsData)
        .eq('id', existing.id)
    } else {
      await this.supabase.from('bowling_stats').insert({
        match_id: this.matchId,
        team_player_id: playerId,
        innings_number: match.current_innings,
        ...statsData,
      })
    }
  }

  /**
   * Handle innings end
   */
  private async handleInningsEnd(reason?: string) {
    const { data: match } = await this.supabase
      .from('matches')
      .select('*')
      .eq('id', this.matchId)
      .single()

    if (!match) return

    if (match.current_innings === 1) {
      // First innings complete, start second innings
      const target = calculateTarget(match.team1_score)

      await this.supabase
        .from('matches')
        .update({
          current_innings: 2,
          target,
          batting_team_id: match.team2_id,
        })
        .eq('id', this.matchId)
    } else {
      // Match complete
      await this.completeMatch()
    }
  }

  /**
   * Complete the match and calculate result
   */
  private async completeMatch() {
    const { data: match } = await this.supabase
      .from('matches')
      .select('*, team1:team1_id(name), team2:team2_id(name, team_players(*))')
      .eq('id', this.matchId)
      .single()

    if (!match) return

    const team1Name = (match.team1 as any)?.name || 'Team 1'
    const team2Name = (match.team2 as any)?.name || 'Team 2'
    const team2TotalPlayers = (match.team2 as any)?.team_players?.length || 10

    const { winnerTeam, resultText } = calculateMatchResult(
      team1Name,
      team2Name,
      match.team1_score,
      match.team1_wickets,
      match.team2_score,
      match.team2_wickets,
      match.current_innings,
      team2TotalPlayers
    )

    await this.supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_team_id: winnerTeam === 1 ? match.team1_id : winnerTeam === 2 ? match.team2_id : null,
        result_text: resultText,
        completed_at: new Date().toISOString(),
      })
      .eq('id', this.matchId)
  }
}

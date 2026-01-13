/**
 * Local Match Engine - handles all scoring operations in localStorage
 * Provides instant, 0-lag scoring experience
 */

import { WicketType } from '@/types/match'
import { loadLocalMatchState, saveLocalMatchState, saveStateSnapshot, loadStateSnapshot } from './local-scorer'
import { generateCommentary, getPlayerShortName } from './commentary-generator'

export class LocalMatchEngine {
  private matchId: string

  constructor(matchId: string) {
    this.matchId = matchId
  }

  private getState() {
    return loadLocalMatchState(this.matchId)
  }

  private saveState(state: any) {
    return saveLocalMatchState(this.matchId, state)
  }

  /**
   * Save current state as a snapshot for undo
   */
  private saveSnapshot() {
    const state = this.getState()
    if (state) {
      const { match, battingStats, bowlingStats, balls } = state
      // Deep clone to avoid reference issues
      saveStateSnapshot(this.matchId, {
        match: JSON.parse(JSON.stringify(match)),
        battingStats: JSON.parse(JSON.stringify(battingStats)),
        bowlingStats: JSON.parse(JSON.stringify(bowlingStats)),
        balls: JSON.parse(JSON.stringify(balls))
      })
    }
  }

  /**
   * Record runs scored
   */
  recordRuns(runs: number, batsmanId: string, nonStrikerId: string, bowlerId: string) {
    // Save snapshot before recording
    this.saveSnapshot()
    const state = this.getState()
    if (!state) return { success: false, error: 'Match state not found' }

    const { match, battingStats, bowlingStats, balls } = state
    const isFirstInnings = match.current_innings === 1

    // Capture current state BEFORE any updates
    const currentBalls = isFirstInnings ? match.team1_balls : match.team2_balls
    const currentOvers = isFirstInnings ? match.team1_overs : match.team2_overs

    // Update batsman stats
    const batsmanStat = battingStats.find(
      (s: any) => s.team_player_id === batsmanId && s.innings_number === match.current_innings
    )
    if (batsmanStat) {
      batsmanStat.runs += runs
      batsmanStat.balls_faced++
      if (runs === 4) batsmanStat.fours = (batsmanStat.fours || 0) + 1
      if (runs === 6) batsmanStat.sixes = (batsmanStat.sixes || 0) + 1
      batsmanStat.strike_rate = batsmanStat.balls_faced > 0
        ? parseFloat(((batsmanStat.runs / batsmanStat.balls_faced) * 100).toFixed(2))
        : 0
    }

    // Update bowler stats
    const bowlerStat = bowlingStats.find(
      (s: any) => s.team_player_id === bowlerId && s.innings_number === match.current_innings
    )
    if (bowlerStat) {
      bowlerStat.balls_bowled++
      bowlerStat.runs_conceded += runs
      bowlerStat.overs = Math.floor(bowlerStat.balls_bowled / 6)
      const totalOvers = bowlerStat.overs + (bowlerStat.balls_bowled % 6) / 6
      bowlerStat.economy_rate = totalOvers > 0
        ? parseFloat((bowlerStat.runs_conceded / totalOvers).toFixed(2))
        : 0
    }

    // Get player names for commentary
    let batsmanName = batsmanStat?.player?.player_name || 'Batsman'
    let bowlerName = bowlerStat?.player?.player_name || 'Bowler'

    // Fallback: try to get player name from match data if not in stat
    if (batsmanName === 'Batsman') {
      const isFirstInnings = match.current_innings === 1
      const battingTeam = isFirstInnings ? match.team1 : match.team2
      const playerData = battingTeam?.team_players?.find((p: any) => p.id === batsmanId)
      batsmanName = playerData?.player_name || 'Batsman'
    }
    if (bowlerName === 'Bowler') {
      const isFirstInnings = match.current_innings === 1
      const bowlingTeam = isFirstInnings ? match.team2 : match.team1
      const playerData = bowlingTeam?.team_players?.find((p: any) => p.id === bowlerId)
      bowlerName = playerData?.player_name || 'Bowler'
    }

    console.log('Batsman:', batsmanName, 'Bowler:', bowlerName)

    // Generate commentary
    const commentary = generateCommentary(
      getPlayerShortName(bowlerName),
      getPlayerShortName(batsmanName),
      runs,
      'legal',
      currentOvers,
      currentBalls
    )

    console.log('Generated commentary:', commentary)

    // Record ball BEFORE updating match state
    const ballRecord = {
      id: `local_${Date.now()}_${Math.random()}`,
      match_id: this.matchId,
      innings_number: match.current_innings,
      over_number: currentOvers,
      ball_number: currentBalls,
      batsman_id: batsmanId,
      bowler_id: bowlerId,
      runs_scored: runs,
      ball_type: 'legal',
      is_boundary: runs === 4,
      is_six: runs === 6,
      extras: 0,
      commentary: commentary,
      created_at: new Date().toISOString()
    }

    console.log('Pushing ball record:', ballRecord)
    balls.push(ballRecord)

    // NOW update match score
    if (isFirstInnings) {
      match.team1_score += runs
      match.team1_balls++
      if (match.team1_balls >= 6) {
        match.team1_overs++
        match.team1_balls = 0
      }
    } else {
      match.team2_score += runs
      match.team2_balls++
      if (match.team2_balls >= 6) {
        match.team2_overs++
        match.team2_balls = 0
      }
    }

    this.saveState({ match, battingStats, bowlingStats, balls })
    return { success: true }
  }

  /**
   * Record a wide delivery
   */
  recordWide(batsmanId: string, nonStrikerId: string, bowlerId: string, additionalRuns: number) {
    // Save snapshot before recording
    this.saveSnapshot()

    const state = this.getState()
    if (!state) return { success: false, error: 'Match state not found' }

    const { match, battingStats, bowlingStats, balls } = state
    const isFirstInnings = match.current_innings === 1

    // Capture current state BEFORE any updates
    const currentBalls = isFirstInnings ? match.team1_balls : match.team2_balls
    const currentOvers = isFirstInnings ? match.team1_overs : match.team2_overs

    const totalRuns = 1 + additionalRuns

    // Get batsman and bowler stats for updates and commentary
    const batsmanStat = battingStats.find(
      (s: any) => s.team_player_id === batsmanId && s.innings_number === match.current_innings
    )
    const bowlerStat = bowlingStats.find(
      (s: any) => s.team_player_id === bowlerId && s.innings_number === match.current_innings
    )

    // Update batsman stats (only for additional runs)
    if (additionalRuns > 0 && batsmanStat) {
      batsmanStat.runs += additionalRuns
      if (additionalRuns === 4) batsmanStat.fours = (batsmanStat.fours || 0) + 1
    }

    // Update bowler stats
    if (bowlerStat) {
      bowlerStat.runs_conceded += totalRuns
      const totalOvers = bowlerStat.overs + (bowlerStat.balls_bowled % 6) / 6
      bowlerStat.economy_rate = totalOvers > 0
        ? parseFloat((bowlerStat.runs_conceded / totalOvers).toFixed(2))
        : 0
    }

    // Get player names for commentary
    let batsmanName = batsmanStat?.player?.player_name || 'Batsman'
    let bowlerName = bowlerStat?.player?.player_name || 'Bowler'

    // Fallback: try to get player name from match data if not in stat
    if (batsmanName === 'Batsman') {
      const isFirstInnings = match.current_innings === 1
      const battingTeam = isFirstInnings ? match.team1 : match.team2
      const playerData = battingTeam?.team_players?.find((p: any) => p.id === batsmanId)
      batsmanName = playerData?.player_name || 'Batsman'
    }
    if (bowlerName === 'Bowler') {
      const isFirstInnings = match.current_innings === 1
      const bowlingTeam = isFirstInnings ? match.team2 : match.team1
      const playerData = bowlingTeam?.team_players?.find((p: any) => p.id === bowlerId)
      bowlerName = playerData?.player_name || 'Bowler'
    }

    // Generate commentary
    const commentary = generateCommentary(
      getPlayerShortName(bowlerName),
      getPlayerShortName(batsmanName),
      additionalRuns,
      'wide',
      currentOvers,
      currentBalls
    )

    // Record ball BEFORE updating match state
    balls.push({
      id: `local_${Date.now()}_${Math.random()}`,
      match_id: this.matchId,
      innings_number: match.current_innings,
      over_number: currentOvers,
      ball_number: currentBalls,
      batsman_id: batsmanId,
      bowler_id: bowlerId,
      runs_scored: additionalRuns,
      ball_type: 'wide',
      extras: 1,
      commentary: commentary,
      created_at: new Date().toISOString()
    })

    // NOW update match score (no ball increment for wide)
    if (isFirstInnings) {
      match.team1_score += totalRuns
    } else {
      match.team2_score += totalRuns
    }

    this.saveState({ match, battingStats, bowlingStats, balls })
    return { success: true }
  }

  /**
   * Record a no ball
   */
  recordNoBall(batsmanId: string, nonStrikerId: string, bowlerId: string, additionalRuns: number) {
    // Save snapshot before recording
    this.saveSnapshot()

    const state = this.getState()
    if (!state) return { success: false, error: 'Match state not found' }

    const { match, battingStats, bowlingStats, balls } = state
    const isFirstInnings = match.current_innings === 1

    // Capture current state BEFORE any updates
    const currentBalls = isFirstInnings ? match.team1_balls : match.team2_balls
    const currentOvers = isFirstInnings ? match.team1_overs : match.team2_overs

    const totalRuns = 1 + additionalRuns

    // Update batsman stats (batsman gets the additional runs)
    const batsmanStat = battingStats.find(
      (s: any) => s.team_player_id === batsmanId && s.innings_number === match.current_innings
    )
    if (batsmanStat) {
      batsmanStat.runs += additionalRuns
      if (additionalRuns === 4) batsmanStat.fours = (batsmanStat.fours || 0) + 1
      if (additionalRuns === 6) batsmanStat.sixes = (batsmanStat.sixes || 0) + 1
      batsmanStat.strike_rate = batsmanStat.balls_faced > 0
        ? parseFloat(((batsmanStat.runs / batsmanStat.balls_faced) * 100).toFixed(2))
        : 0
    }

    // Update bowler stats
    const bowlerStat = bowlingStats.find(
      (s: any) => s.team_player_id === bowlerId && s.innings_number === match.current_innings
    )
    if (bowlerStat) {
      bowlerStat.runs_conceded += totalRuns
      const totalOvers = bowlerStat.overs + (bowlerStat.balls_bowled % 6) / 6
      bowlerStat.economy_rate = totalOvers > 0
        ? parseFloat((bowlerStat.runs_conceded / totalOvers).toFixed(2))
        : 0
    }

    // Get player names for commentary
    let batsmanName = batsmanStat?.player?.player_name || 'Batsman'
    let bowlerName = bowlerStat?.player?.player_name || 'Bowler'

    // Fallback: try to get player name from match data if not in stat
    if (batsmanName === 'Batsman') {
      const isFirstInnings = match.current_innings === 1
      const battingTeam = isFirstInnings ? match.team1 : match.team2
      const playerData = battingTeam?.team_players?.find((p: any) => p.id === batsmanId)
      batsmanName = playerData?.player_name || 'Batsman'
    }
    if (bowlerName === 'Bowler') {
      const isFirstInnings = match.current_innings === 1
      const bowlingTeam = isFirstInnings ? match.team2 : match.team1
      const playerData = bowlingTeam?.team_players?.find((p: any) => p.id === bowlerId)
      bowlerName = playerData?.player_name || 'Bowler'
    }

    // Generate commentary
    const commentary = generateCommentary(
      getPlayerShortName(bowlerName),
      getPlayerShortName(batsmanName),
      additionalRuns,
      'noball',
      currentOvers,
      currentBalls
    )

    // Record ball BEFORE updating match state
    balls.push({
      id: `local_${Date.now()}_${Math.random()}`,
      match_id: this.matchId,
      innings_number: match.current_innings,
      over_number: currentOvers,
      ball_number: currentBalls,
      batsman_id: batsmanId,
      bowler_id: bowlerId,
      runs_scored: additionalRuns,
      ball_type: 'noball',
      is_boundary: additionalRuns === 4,
      is_six: additionalRuns === 6,
      extras: 1,
      commentary: commentary,
      created_at: new Date().toISOString()
    })

    // NOW update match score (no ball increment for no ball)
    if (isFirstInnings) {
      match.team1_score += totalRuns
    } else {
      match.team2_score += totalRuns
    }

    this.saveState({ match, battingStats, bowlingStats, balls })
    return { success: true }
  }

  /**
   * Record a wicket
   */
  recordWicket(batsmanId: string, nonStrikerId: string, bowlerId: string, wicketType: WicketType) {
    // Save snapshot before recording
    this.saveSnapshot()

    const state = this.getState()
    if (!state) return { success: false, error: 'Match state not found' }

    const { match, battingStats, bowlingStats, balls } = state
    const isFirstInnings = match.current_innings === 1

    // Capture current state BEFORE any updates
    const currentBalls = isFirstInnings ? match.team1_balls : match.team2_balls
    const currentOvers = isFirstInnings ? match.team1_overs : match.team2_overs

    // Get batsman and bowler stats for updates and commentary
    const batsmanStat = battingStats.find(
      (s: any) => s.team_player_id === batsmanId && s.innings_number === match.current_innings
    )
    const bowlerStat = bowlingStats.find(
      (s: any) => s.team_player_id === bowlerId && s.innings_number === match.current_innings
    )

    // Update batsman stats
    if (batsmanStat) {
      batsmanStat.is_out = true
      batsmanStat.dismissal_type = wicketType
      batsmanStat.balls_faced++
      batsmanStat.strike_rate = batsmanStat.balls_faced > 0
        ? parseFloat(((batsmanStat.runs / batsmanStat.balls_faced) * 100).toFixed(2))
        : 0
    }

    // Update bowler stats
    if (bowlerStat) {
      // Wickets only for non-run out and non-retired hurt
      if (wicketType !== 'run_out' && wicketType !== 'retired_hurt') {
        bowlerStat.wickets = (bowlerStat.wickets || 0) + 1
      }

      // Balls bowled increments for all wickets except retired_hurt
      if (wicketType !== 'retired_hurt') {
        bowlerStat.balls_bowled++
        bowlerStat.overs = Math.floor(bowlerStat.balls_bowled / 6)
        const totalOvers = bowlerStat.overs + (bowlerStat.balls_bowled % 6) / 6
        bowlerStat.economy_rate = totalOvers > 0
          ? parseFloat((bowlerStat.runs_conceded / totalOvers).toFixed(2))
          : 0
      }
    }

    // Get player names for commentary
    let batsmanName = batsmanStat?.player?.player_name || 'Batsman'
    let bowlerName = bowlerStat?.player?.player_name || 'Bowler'

    // Fallback: try to get player name from match data if not in stat
    if (batsmanName === 'Batsman') {
      const isFirstInnings = match.current_innings === 1
      const battingTeam = isFirstInnings ? match.team1 : match.team2
      const playerData = battingTeam?.team_players?.find((p: any) => p.id === batsmanId)
      batsmanName = playerData?.player_name || 'Batsman'
    }
    if (bowlerName === 'Bowler') {
      const isFirstInnings = match.current_innings === 1
      const bowlingTeam = isFirstInnings ? match.team2 : match.team1
      const playerData = bowlingTeam?.team_players?.find((p: any) => p.id === bowlerId)
      bowlerName = playerData?.player_name || 'Bowler'
    }

    // Generate commentary
    const commentary = generateCommentary(
      getPlayerShortName(bowlerName),
      getPlayerShortName(batsmanName),
      0,
      'wicket',
      currentOvers,
      currentBalls,
      wicketType
    )

    // Record ball BEFORE updating match state
    balls.push({
      id: `local_${Date.now()}_${Math.random()}`,
      match_id: this.matchId,
      innings_number: match.current_innings,
      over_number: currentOvers,
      ball_number: currentBalls,
      batsman_id: batsmanId,
      bowler_id: bowlerId,
      runs_scored: 0,
      ball_type: 'wicket',
      wicket_type: wicketType,
      commentary: commentary,
      created_at: new Date().toISOString()
    })

    // NOW update match score
    if (wicketType !== 'retired_hurt') {
      if (isFirstInnings) {
        match.team1_wickets++
        match.team1_balls++
        if (match.team1_balls >= 6) {
          match.team1_overs++
          match.team1_balls = 0
        }
      } else {
        match.team2_wickets++
        match.team2_balls++
        if (match.team2_balls >= 6) {
          match.team2_overs++
          match.team2_balls = 0
        }
      }

      // DO NOT auto-end innings based on wickets with dynamic player registration!
      // Innings will end when:
      // 1. All overs are bowled (checked in checkAndCompleteMatch)
      // 2. Target is reached (checked in checkAndCompleteMatch)
      // 3. User manually ends via "End Innings" or "No New Batsman" with no players left
    }

    this.saveState({ match, battingStats, bowlingStats, balls })
    return { success: true }
  }

  /**
   * Handle innings end - transition to next innings or complete match
   */
  private handleInningsEnd(match: any, battingStats: any[], bowlingStats: any[], balls: any[]) {
    if (match.current_innings === 1) {
      // First innings complete, start second innings
      const target = match.team1_score + 1
      match.current_innings = 2
      match.target = target
      match.batting_team_id = match.team2_id
    } else {
      // Second innings complete, mark match as completed
      match.status = 'completed'

      // Determine winner
      if (match.team2_score > match.team1_score) {
        match.winner_team_id = match.team2_id
        const totalTeam2Players = match.team2?.team_players?.length || 0
        const wicketsLeft = totalTeam2Players - match.team2_wickets
        match.result = `${match.team2?.name || 'Team 2'} won by ${wicketsLeft} wickets`
      } else if (match.team1_score > match.team2_score) {
        match.winner_team_id = match.team1_id
        const runsDiff = match.team1_score - match.team2_score
        match.result = `${match.team1?.name || 'Team 1'} won by ${runsDiff} runs`
      } else {
        match.result = 'Match tied'
      }
    }
  }

  /**
   * Undo last ball by restoring previous state snapshot
   */
  undoLastBall() {
    // Check if there are any balls in current innings
    const currentState = this.getState()
    if (!currentState) return { success: false, error: 'Match state not found' }

    const currentInningsBalls = currentState.balls.filter(
      (b: any) => b.innings_number === currentState.match.current_innings
    )
    if (currentInningsBalls.length === 0) {
      return { success: false, error: 'No balls to undo' }
    }

    // Load the snapshot (state before the last ball was recorded)
    const previousState = loadStateSnapshot(this.matchId)
    if (!previousState) {
      return { success: false, error: 'No previous state found. Cannot undo.' }
    }

    // Restore the previous state completely
    this.saveState(previousState)
    return { success: true }
  }

  /**
   * Add a new batsman
   */
  /**
   * Retire hurt a batsman (doesn't consume a ball, no wicket)
   */
  retireHurt(batsmanId: string) {
    const state = this.getState()
    if (!state) return { success: false, error: 'Match state not found' }

    const { match, battingStats } = state

    // Find the batsman in current innings
    const batsmanStat = battingStats.find(
      (s: any) => s.team_player_id === batsmanId && s.innings_number === match.current_innings
    )

    if (!batsmanStat) {
      return { success: false, error: 'Batsman not found' }
    }

    // Mark as retired hurt (is_out = true but doesn't count as wicket)
    batsmanStat.is_out = true
    batsmanStat.dismissal_type = 'retired_hurt'

    // DON'T increment wickets (retired hurt is not a wicket)
    // DON'T create a ball entry (no ball was bowled)
    // DON'T increment bowler's stats

    this.saveState(state)
    return { success: true }
  }

  addBatsman(batsmanId: string, inningsNumber: number) {
    const state = this.getState()
    if (!state) return { success: false, error: 'Match state not found' }

    const { match, battingStats } = state

    // Check if batsman already exists
    const existing = battingStats.find(
      (s: any) => s.team_player_id === batsmanId && s.innings_number === inningsNumber
    )

    if (existing) {
      // Player returning (e.g., from retired hurt)
      existing.is_out = false
      existing.dismissal_type = null
    } else {
      // Get player object from match data
      // Determine batting team from existing batting stats, not from innings number
      const existingBatsmen = battingStats.filter((s: any) => s.innings_number === inningsNumber && !s.is_out)
      let battingTeam

      if (existingBatsmen.length > 0) {
        // Find which team the existing batsmen belong to
        const existingBatsmanId = existingBatsmen[0].team_player_id
        const isTeam1Batting = match.team1.team_players?.some((p: any) => p.id === existingBatsmanId)
        battingTeam = isTeam1Batting ? match.team1 : match.team2
      } else {
        // Fallback: check if this player is in team1 or team2
        const isInTeam1 = match.team1.team_players?.some((p: any) => p.id === batsmanId)
        battingTeam = isInTeam1 ? match.team1 : match.team2
      }

      const playerData = battingTeam.team_players?.find((p: any) => p.id === batsmanId)

      // New batsman
      battingStats.push({
        id: `local_${Date.now()}_${Math.random()}`,
        match_id: this.matchId,
        team_player_id: batsmanId,
        innings_number: inningsNumber,
        runs: 0,
        balls_faced: 0,
        fours: 0,
        sixes: 0,
        strike_rate: 0,
        is_out: false,
        dismissal_type: null,
        player: playerData ? {
          player_name: playerData.player_name
        } : null
      })
    }

    this.saveState({ ...state, battingStats })
    return { success: true }
  }

  /**
   * Add a new bowler
   */
  addBowler(bowlerId: string, inningsNumber: number) {
    const state = this.getState()
    if (!state) return { success: false, error: 'Match state not found' }

    const { match, bowlingStats } = state

    // Check if bowler already exists
    const existing = bowlingStats.find(
      (s: any) => s.team_player_id === bowlerId && s.innings_number === inningsNumber
    )

    if (!existing) {
      // Get player object from match data
      // Determine bowling team from batting stats (opposite of batting team), not from innings number
      const { battingStats } = state
      const existingBatsmen = battingStats.filter((s: any) => s.innings_number === inningsNumber && !s.is_out)
      let bowlingTeam

      if (existingBatsmen.length > 0) {
        // Find which team is batting, then get the opposite team for bowling
        const existingBatsmanId = existingBatsmen[0].team_player_id
        const isTeam1Batting = match.team1.team_players?.some((p: any) => p.id === existingBatsmanId)
        bowlingTeam = isTeam1Batting ? match.team2 : match.team1
      } else {
        // Fallback: check if this bowler is in team1 or team2
        const isInTeam1 = match.team1.team_players?.some((p: any) => p.id === bowlerId)
        bowlingTeam = isInTeam1 ? match.team1 : match.team2
      }

      const playerData = bowlingTeam.team_players?.find((p: any) => p.id === bowlerId)

      // New bowler
      bowlingStats.push({
        id: `local_${Date.now()}_${Math.random()}`,
        match_id: this.matchId,
        team_player_id: bowlerId,
        innings_number: inningsNumber,
        overs: 0,
        balls_bowled: 0,
        runs_conceded: 0,
        wickets: 0,
        maidens: 0,
        economy_rate: 0,
        player: playerData ? {
          player_name: playerData.player_name
        } : null
      })
    }

    this.saveState({ ...state, bowlingStats })
    return { success: true }
  }
}

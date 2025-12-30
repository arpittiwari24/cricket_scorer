'use server'

import { MatchEngine } from '@/lib/cricket/match-engine'
import { WicketType } from '@/types/match'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Record runs scored
 */
export async function recordRuns(data: {
  matchId: string
  runs: number
  batsmanId: string
  nonStrikerId: string
  bowlerId: string
}) {
  const engine = new MatchEngine(data.matchId)

  const result = await engine.recordRuns(
    data.runs,
    data.batsmanId,
    data.nonStrikerId,
    data.bowlerId
  )

  revalidatePath(`/matches/${data.matchId}`)
  return result
}

/**
 * Record a wide delivery
 */
export async function recordWide(data: {
  matchId: string
  batsmanId: string
  nonStrikerId: string
  bowlerId: string
  additionalRuns?: number
}) {
  const engine = new MatchEngine(data.matchId)

  const result = await engine.recordWide(
    data.batsmanId,
    data.nonStrikerId,
    data.bowlerId,
    data.additionalRuns || 0
  )

  revalidatePath(`/matches/${data.matchId}`)
  return result
}

/**
 * Record a no ball
 */
export async function recordNoBall(data: {
  matchId: string
  batsmanId: string
  nonStrikerId: string
  bowlerId: string
  additionalRuns?: number
}) {
  const engine = new MatchEngine(data.matchId)

  const result = await engine.recordNoBall(
    data.batsmanId,
    data.nonStrikerId,
    data.bowlerId,
    data.additionalRuns || 0
  )

  revalidatePath(`/matches/${data.matchId}`)
  return result
}

/**
 * Record a wicket
 */
export async function recordWicket(data: {
  matchId: string
  batsmanId: string
  nonStrikerId: string
  bowlerId: string
  wicketType: WicketType
}) {
  const engine = new MatchEngine(data.matchId)

  const result = await engine.recordWicket(
    data.batsmanId,
    data.nonStrikerId,
    data.bowlerId,
    data.wicketType
  )

  revalidatePath(`/matches/${data.matchId}`)
  return result
}

/**
 * Undo last ball
 */
export async function undoLastBall(matchId: string) {
  const supabase = createClient()

  try {
    // Get the match to know current innings
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (!match) {
      return { success: false, error: 'Match not found' }
    }

    // Get the last ball in the current innings
    const { data: balls } = await supabase
      .from('balls')
      .select('*')
      .eq('match_id', matchId)
      .eq('innings_number', match.current_innings)
      .order('over_number', { ascending: false })
      .order('ball_number', { ascending: false })
      .limit(1)

    if (!balls || balls.length === 0) {
      return { success: false, error: 'No balls to undo' }
    }

    const lastBall = balls[0]
    const isFirstInnings = match.current_innings === 1

    // Delete the ball
    await supabase.from('balls').delete().eq('id', lastBall.id)

    // Revert batting stats
    const { data: batsmanStats } = await supabase
      .from('batting_stats')
      .select('*')
      .eq('match_id', matchId)
      .eq('team_player_id', lastBall.batsman_id)
      .eq('innings_number', match.current_innings)
      .single()

    if (batsmanStats) {
      const newRuns = Math.max(0, batsmanStats.runs - (lastBall.runs_scored || 0))
      const newBalls = Math.max(0, batsmanStats.balls_faced - (lastBall.ball_type === 'legal' || lastBall.ball_type === 'wicket' ? 1 : 0))
      const newFours = Math.max(0, batsmanStats.fours - (lastBall.is_boundary ? 1 : 0))
      const newSixes = Math.max(0, batsmanStats.sixes - (lastBall.is_six ? 1 : 0))

      await supabase
        .from('batting_stats')
        .update({
          runs: newRuns,
          balls_faced: newBalls,
          fours: newFours,
          sixes: newSixes,
          is_out: lastBall.ball_type === 'wicket' ? false : batsmanStats.is_out,
          dismissal_type: lastBall.ball_type === 'wicket' ? null : batsmanStats.dismissal_type,
          strike_rate: newBalls > 0 ? parseFloat(((newRuns / newBalls) * 100).toFixed(2)) : 0,
        })
        .eq('id', batsmanStats.id)
    }

    // Revert bowling stats
    const { data: bowlerStats } = await supabase
      .from('bowling_stats')
      .select('*')
      .eq('match_id', matchId)
      .eq('team_player_id', lastBall.bowler_id)
      .eq('innings_number', match.current_innings)
      .single()

    if (bowlerStats) {
      const ballsToDeduct = lastBall.ball_type === 'legal' || lastBall.ball_type === 'wicket' ? 1 : 0
      const newBallsBowled = Math.max(0, bowlerStats.balls_bowled - ballsToDeduct)
      const totalRunsInBall = (lastBall.runs_scored || 0) + (lastBall.extras || 0)
      const newRunsConceded = Math.max(0, bowlerStats.runs_conceded - totalRunsInBall)

      const wicketsToDeduct = lastBall.ball_type === 'wicket' &&
        lastBall.wicket_type !== 'run_out' &&
        lastBall.wicket_type !== 'retired_hurt' ? 1 : 0
      const newWickets = Math.max(0, bowlerStats.wickets - wicketsToDeduct)

      const newOvers = Math.floor(newBallsBowled / 6)
      const newBalls = newBallsBowled % 6

      await supabase
        .from('bowling_stats')
        .update({
          balls_bowled: newBallsBowled,
          runs_conceded: newRunsConceded,
          wickets: newWickets,
          overs: newOvers,
          economy_rate: newOvers > 0 || newBalls > 0 ? parseFloat((newRunsConceded / ((newOvers * 6 + newBalls) / 6)).toFixed(2)) : 0,
        })
        .eq('id', bowlerStats.id)
    }

    // Revert match score
    const totalRunsInBall = (lastBall.runs_scored || 0) + (lastBall.extras || 0)
    const currentScore = isFirstInnings ? match.team1_score : match.team2_score
    const currentBalls = isFirstInnings ? match.team1_balls : match.team2_balls
    const currentOvers = isFirstInnings ? match.team1_overs : match.team2_overs
    const currentWickets = isFirstInnings ? match.team1_wickets : match.team2_wickets

    const newScore = Math.max(0, currentScore - totalRunsInBall)

    // Calculate new balls and overs
    let newBalls = currentBalls
    let newOvers = currentOvers

    if (lastBall.ball_type === 'legal' || lastBall.ball_type === 'wicket') {
      if (currentBalls === 0) {
        newOvers = Math.max(0, currentOvers - 1)
        newBalls = 5
      } else {
        newBalls = currentBalls - 1
      }
    }

    // Revert wickets
    const wicketsToDeduct = lastBall.ball_type === 'wicket' && lastBall.wicket_type !== 'retired_hurt' ? 1 : 0
    const newWickets = Math.max(0, currentWickets - wicketsToDeduct)

    const updateData = isFirstInnings
      ? {
          team1_score: newScore,
          team1_balls: newBalls,
          team1_overs: newOvers,
          team1_wickets: newWickets,
        }
      : {
          team2_score: newScore,
          team2_balls: newBalls,
          team2_overs: newOvers,
          team2_wickets: newWickets,
        }

    await supabase.from('matches').update(updateData).eq('id', matchId)

    revalidatePath(`/matches/${matchId}`)
    return { success: true }
  } catch (error) {
    console.error('Error undoing last ball:', error)
    return { success: false, error: 'Failed to undo last ball' }
  }
}

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Sync all local match data to database
 * Called when match is completed
 */
export async function syncLocalMatchToDatabase(
  matchId: string,
  localData: {
    match: any
    battingStats: any[]
    bowlingStats: any[]
    balls: any[]
  }
) {
  const supabase = createClient()

  try {
    const { match, battingStats, bowlingStats, balls } = localData

    // 1. Update match data - ONLY send valid database fields, not nested objects
    const matchUpdateData: any = {
      status: match.status,
      current_innings: match.current_innings,
      team1_score: match.team1_score || 0,
      team1_wickets: match.team1_wickets || 0,
      team1_overs: match.team1_overs || 0,
      team1_balls: match.team1_balls || 0,
      team2_score: match.team2_score || 0,
      team2_wickets: match.team2_wickets || 0,
      team2_overs: match.team2_overs || 0,
      team2_balls: match.team2_balls || 0,
      completed_at: match.status === 'completed' ? new Date().toISOString() : null
    }

    // Only include these fields if they exist and are primitive values (string or number)
    if (match.batting_team_id && typeof match.batting_team_id === 'string') {
      matchUpdateData.batting_team_id = match.batting_team_id
    }
    if (match.target && typeof match.target === 'number') {
      matchUpdateData.target = match.target
    }
    if (match.result_text && typeof match.result_text === 'string') {
      matchUpdateData.result_text = match.result_text
    }
    if (match.winner_team_id && typeof match.winner_team_id === 'string') {
      matchUpdateData.winner_team_id = match.winner_team_id
    }

    console.log('Updating match with data:', matchUpdateData)
    const { error: matchError } = await supabase
      .from('matches')
      .update(matchUpdateData)
      .eq('id', matchId)

    if (matchError) {
      console.error('Match update error:', matchError)
      console.error('Match update data:', JSON.stringify(matchUpdateData, null, 2))
      throw new Error(`Match update failed: ${matchError.message}`)
    }

    // 2. Delete existing stats and balls (clean slate)
    await supabase.from('batting_stats').delete().eq('match_id', matchId)
    await supabase.from('bowling_stats').delete().eq('match_id', matchId)
    await supabase.from('balls').delete().eq('match_id', matchId)

    // 3. Insert all batting stats (filter out local IDs and enriched player objects)
    const cleanBattingStats = battingStats
      .map((stat: any) => {
        const { id, player, ...rest } = stat
        // Remove player object (added for display) and local IDs
        // Only keep primitive values that belong to the database schema
        return {
          match_id: rest.match_id,
          team_player_id: rest.team_player_id,
          innings_number: rest.innings_number,
          runs: rest.runs || 0,
          balls_faced: rest.balls_faced || 0,
          fours: rest.fours || 0,
          sixes: rest.sixes || 0,
          strike_rate: rest.strike_rate || 0,
          is_out: rest.is_out || false,
          dismissal_type: rest.dismissal_type || null
        }
      })
      .filter((stat: any) => stat.match_id && stat.team_player_id) // Ensure required fields exist

    if (cleanBattingStats.length > 0) {
      console.log('Inserting batting stats, count:', cleanBattingStats.length)
      const { error: battingError } = await supabase
        .from('batting_stats')
        .insert(cleanBattingStats)

      if (battingError) {
        console.error('Batting stats insert error:', battingError)
        console.error('Sample batting stat:', JSON.stringify(cleanBattingStats[0], null, 2))
        throw new Error(`Batting stats insert failed: ${battingError.message}`)
      }
    }

    // 4. Insert all bowling stats (filter out local IDs and enriched player objects)
    const cleanBowlingStats = bowlingStats
      .map((stat: any) => {
        const { id, player, ...rest } = stat
        // Remove player object (added for display) and local IDs
        // Only keep primitive values that belong to the database schema
        return {
          match_id: rest.match_id,
          team_player_id: rest.team_player_id,
          innings_number: rest.innings_number,
          overs: rest.overs || 0,
          balls_bowled: rest.balls_bowled || 0,
          runs_conceded: rest.runs_conceded || 0,
          wickets: rest.wickets || 0,
          maidens: rest.maidens || 0,
          economy_rate: rest.economy_rate || 0
        }
      })
      .filter((stat: any) => stat.match_id && stat.team_player_id) // Ensure required fields exist

    if (cleanBowlingStats.length > 0) {
      console.log('Inserting bowling stats, count:', cleanBowlingStats.length)
      const { error: bowlingError } = await supabase
        .from('bowling_stats')
        .insert(cleanBowlingStats)

      if (bowlingError) {
        console.error('Bowling stats insert error:', bowlingError)
        console.error('Sample bowling stat:', JSON.stringify(cleanBowlingStats[0], null, 2))
        throw new Error(`Bowling stats insert failed: ${bowlingError.message}`)
      }
    }

    // 5. Insert all balls (map to actual database schema)
    const cleanBalls = balls.map((ball: any) => {
      // Determine ball_type - use existing ball_type if present, otherwise map from flags
      let ballType = 'legal'
      if (ball.ball_type) {
        // LocalMatchEngine sets ball_type directly ('legal', 'wide', 'noball', 'wicket')
        ballType = ball.ball_type === 'noball' ? 'no_ball' : ball.ball_type
      } else if (ball.is_wide) {
        ballType = 'wide'
      } else if (ball.is_no_ball) {
        ballType = 'no_ball'
      }

      // STRICT: Only map EXACT database schema fields, nothing else
      // Ensure all values are primitives (string, number, boolean, null)
      const cleanBall: any = {
        match_id: String(ball.match_id),
        innings_number: Number(ball.innings_number),
        over_number: Number(ball.over_number),
        ball_number: Number(ball.ball_number),
        batsman_id: String(ball.batsman_id),
        non_striker_id: (ball.non_striker_id && ball.non_striker_id !== 'undefined') ? String(ball.non_striker_id) : null,
        bowler_id: String(ball.bowler_id),
        runs_scored: Number(ball.runs_scored || ball.runs || 0),
        extras: Number(ball.extras || 0),
        ball_type: String(ballType),
        wicket_type: ball.wicket_type ? String(ball.wicket_type) : null,
        is_boundary: Boolean(ball.is_boundary),
        is_six: Boolean(ball.is_six)
      }

      // Commentary is TEXT type - send as plain string only if exists
      // CRITICAL: Remove broken unicode emojis that cause JSON errors
      if (ball.commentary && typeof ball.commentary === 'string' && ball.commentary.trim().length > 0) {
        // Remove all emojis and broken unicode characters
        cleanBall.commentary = ball.commentary
          .replace(/[\uD800-\uDFFF]/g, '') // Remove all surrogate pairs (emojis)
          .trim()
      }

      return cleanBall
    })

    // Deduplicate balls by unique constraint (match_id, innings_number, over_number, ball_number)
    const uniqueBalls = cleanBalls.filter((ball: any, index: number, self: any[]) => {
      return index === self.findIndex((b: any) =>
        b.match_id === ball.match_id &&
        b.innings_number === ball.innings_number &&
        b.over_number === ball.over_number &&
        b.ball_number === ball.ball_number
      )
    })

    if (uniqueBalls.length > 0) {
      console.log('Inserting balls, count:', uniqueBalls.length)
      console.log('Sample ball before insert:', JSON.stringify(uniqueBalls[0], null, 2))

      const { error: ballsError } = await supabase
        .from('balls')
        .insert(uniqueBalls)

      if (ballsError) {
        console.error('Balls insert error:', ballsError)
        console.error('Error details:', {
          message: ballsError.message,
          code: ballsError.code,
          details: ballsError.details,
          hint: ballsError.hint
        })
        console.error('Sample ball data:', JSON.stringify(uniqueBalls[0], null, 2))
        throw new Error(`Balls insert failed: ${ballsError.message}`)
      }
    }

    revalidatePath(`/matches/${matchId}`)
    revalidatePath('/matches')

    return { success: true }
  } catch (error: any) {
    console.error('Error syncing match to database:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return { success: false, error: error.message || 'Unknown error occurred during sync' }
  }
}

/**
 * Update player career stats based on match performance
 */
async function updatePlayerCareerStats(
  matchId: string,
  battingStats: any[],
  bowlingStats: any[]
) {
  const supabase = createClient()

  try {
    // Get all team_players with their user_ids for this match
    const { data: teamPlayers, error: playersError } = await supabase
      .from('team_players')
      .select('id, user_id, player_name')

    if (playersError) throw playersError

    // Process batting stats
    for (const stat of battingStats) {
      const player = teamPlayers?.find(p => p.id === stat.team_player_id)
      if (!player?.user_id) continue

      // Get current career stats or create new
      const { data: careerStats } = await supabase
        .from('career_stats')
        .select('*')
        .eq('user_id', player.user_id)
        .single()

      const newTotalMatches = (careerStats?.total_matches || 0) + 1
      const newTotalRuns = (careerStats?.total_runs || 0) + (stat.runs || 0)
      const newTotalBalls = (careerStats?.total_balls_faced || 0) + (stat.balls_faced || 0)
      const newTotalFours = (careerStats?.total_fours || 0) + (stat.fours || 0)
      const newTotalSixes = (careerStats?.total_sixes || 0) + (stat.sixes || 0)
      const newInningsBatted = (careerStats?.total_innings_batted || 0) + 1
      const newTimesOut = (careerStats?.times_out || 0) + (stat.is_out ? 1 : 0)
      const newHighestScore = Math.max(careerStats?.highest_score || 0, stat.runs || 0)

      // Calculate averages
      const battingAverage = newTimesOut > 0 ? (newTotalRuns / newTimesOut).toFixed(2) : newTotalRuns.toFixed(2)
      const battingStrikeRate = newTotalBalls > 0 ? ((newTotalRuns / newTotalBalls) * 100).toFixed(2) : '0.00'

      // Upsert career stats
      await supabase
        .from('career_stats')
        .upsert({
          user_id: player.user_id,
          total_matches: newTotalMatches,
          total_runs: newTotalRuns,
          total_balls_faced: newTotalBalls,
          total_fours: newTotalFours,
          total_sixes: newTotalSixes,
          highest_score: newHighestScore,
          total_innings_batted: newInningsBatted,
          times_out: newTimesOut,
          batting_average: parseFloat(battingAverage),
          batting_strike_rate: parseFloat(battingStrikeRate),
        }, { onConflict: 'user_id' })
    }

    // Process bowling stats
    for (const stat of bowlingStats) {
      const player = teamPlayers?.find(p => p.id === stat.team_player_id)
      if (!player?.user_id) continue

      // Get current career stats
      const { data: careerStats } = await supabase
        .from('career_stats')
        .select('*')
        .eq('user_id', player.user_id)
        .single()

      const newTotalOvers = (careerStats?.total_overs_bowled || 0) + (stat.overs || 0)
      const newTotalBalls = (careerStats?.total_balls_bowled || 0) + (stat.balls_bowled || 0)
      const newTotalRuns = (careerStats?.total_runs_conceded || 0) + (stat.runs_conceded || 0)
      const newTotalWickets = (careerStats?.total_wickets || 0) + (stat.wickets || 0)
      const newTotalMaidens = (careerStats?.total_maidens || 0) + (stat.maidens || 0)

      // Calculate bowling averages
      const bowlingAverage = newTotalWickets > 0 ? (newTotalRuns / newTotalWickets).toFixed(2) : '0.00'
      const economyRate = newTotalOvers > 0 ? (newTotalRuns / newTotalOvers).toFixed(2) : '0.00'

      // Update best bowling figures
      let bestBowling = careerStats?.best_bowling_figures || '0/0'
      const currentFigures = `${stat.wickets || 0}/${stat.runs_conceded || 0}`
      const [bestWickets] = bestBowling.split('/').map(Number)
      if ((stat.wickets || 0) > bestWickets) {
        bestBowling = currentFigures
      }

      // Upsert career stats
      await supabase
        .from('career_stats')
        .upsert({
          user_id: player.user_id,
          total_overs_bowled: newTotalOvers,
          total_balls_bowled: newTotalBalls,
          total_runs_conceded: newTotalRuns,
          total_wickets: newTotalWickets,
          total_maidens: newTotalMaidens,
          bowling_average: parseFloat(bowlingAverage),
          economy_rate: parseFloat(economyRate),
          best_bowling_figures: bestBowling,
        }, { onConflict: 'user_id' })
    }

    return { success: true }
  } catch (error: any) {
    console.error('Error updating career stats:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Complete a match and sync all data
 */
export async function completeMatch(
  matchId: string,
  localData: {
    match: any
    battingStats: any[]
    bowlingStats: any[]
    balls: any[]
  },
  resultText: string
) {
  // Update match status to completed
  localData.match.status = 'completed'
  localData.match.result_text = resultText

  // Sync to database
  const syncResult = await syncLocalMatchToDatabase(matchId, localData)

  if (!syncResult.success) {
    return syncResult
  }

  // Update player career stats
  await updatePlayerCareerStats(matchId, localData.battingStats, localData.bowlingStats)

  return syncResult
}

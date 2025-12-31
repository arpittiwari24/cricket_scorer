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

    // 1. Update match data
    const { error: matchError } = await supabase
      .from('matches')
      .update({
        status: match.status,
        current_innings: match.current_innings,
        team1_score: match.team1_score,
        team1_wickets: match.team1_wickets,
        team1_overs: match.team1_overs,
        team1_balls: match.team1_balls,
        team2_score: match.team2_score,
        team2_wickets: match.team2_wickets,
        team2_overs: match.team2_overs,
        team2_balls: match.team2_balls,
        result_text: match.result_text,
        completed_at: match.status === 'completed' ? new Date().toISOString() : null
      })
      .eq('id', matchId)

    if (matchError) throw matchError

    // 2. Delete existing stats and balls (clean slate)
    await supabase.from('batting_stats').delete().eq('match_id', matchId)
    await supabase.from('bowling_stats').delete().eq('match_id', matchId)
    await supabase.from('balls').delete().eq('match_id', matchId)

    // 3. Insert all batting stats (filter out local IDs and enriched player objects)
    const cleanBattingStats = battingStats.map((stat: any) => {
      const { id, player, ...rest } = stat
      // Remove player object (added for display) and local IDs
      if (id && id.toString().startsWith('local_')) {
        return rest
      }
      // Still remove player object even for non-local IDs
      return rest
    })

    if (cleanBattingStats.length > 0) {
      const { error: battingError } = await supabase
        .from('batting_stats')
        .insert(cleanBattingStats)

      if (battingError) throw battingError
    }

    // 4. Insert all bowling stats (filter out local IDs and enriched player objects)
    const cleanBowlingStats = bowlingStats.map((stat: any) => {
      const { id, player, ...rest } = stat
      // Remove player object (added for display) and local IDs
      if (id && id.toString().startsWith('local_')) {
        return rest
      }
      // Still remove player object even for non-local IDs
      return rest
    })

    if (cleanBowlingStats.length > 0) {
      const { error: bowlingError } = await supabase
        .from('bowling_stats')
        .insert(cleanBowlingStats)

      if (bowlingError) throw bowlingError
    }

    // 5. Insert all balls (remove id and created_at, keep commentary, deduplicate)
    const cleanBalls = balls.map((ball: any) => {
      const { id, created_at, ...rest } = ball
      // Keep commentary for display in scorecard
      return rest
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
      const { error: ballsError } = await supabase
        .from('balls')
        .insert(uniqueBalls)

      if (ballsError) throw ballsError
    }

    revalidatePath(`/matches/${matchId}`)
    revalidatePath('/matches')

    return { success: true }
  } catch (error: any) {
    console.error('Error syncing match to database:', error)
    return { success: false, error: error.message }
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

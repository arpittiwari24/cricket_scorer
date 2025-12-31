'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get career stats for a user
 */
export async function getCareerStats(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('career_stats')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get match stats for a specific match
 */
export async function getMatchStats(matchId: string) {
  const supabase = createClient()

  const { data: batting, error: battingError } = await supabase
    .from('batting_stats')
    .select('*, player:team_player_id(*)')
    .eq('match_id', matchId)

  const { data: bowling, error: bowlingError } = await supabase
    .from('bowling_stats')
    .select('*, player:team_player_id(*)')
    .eq('match_id', matchId)

  const { data: balls, error: ballsError } = await supabase
    .from('balls')
    .select('*')
    .eq('match_id', matchId)
    .order('over_number', { ascending: true })
    .order('ball_number', { ascending: true })

  if (battingError || bowlingError) {
    return {
      success: false,
      error: battingError?.message || bowlingError?.message,
    }
  }

  return {
    success: true,
    data: {
      batting,
      bowling,
      balls: balls || [],
    },
  }
}

/**
 * Get batting leaderboard
 */
export async function getBattingLeaderboard(limit: number = 10) {
  const supabase = createClient()

  const { data, error} = await supabase
    .from('career_stats')
    .select('*, user:user_id(name, avatar_url)')
    .order('total_runs', { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get bowling leaderboard
 */
export async function getBowlingLeaderboard(limit: number = 10) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('career_stats')
    .select('*, user:user_id(name, avatar_url)')
    .order('total_wickets', { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get user's match history
 */
export async function getUserMatchHistory(userId: string, limit: number = 20) {
  const supabase = createClient()

  // Get all matches where user participated
  const { data: participations } = await supabase
    .from('match_participants')
    .select('match_id')
    .eq('user_id', userId)

  if (!participations || participations.length === 0) {
    return { success: true, data: [] }
  }

  const matchIds = participations.map((p) => p.match_id)

  const { data, error } = await supabase
    .from('matches')
    .select('*, team1:team1_id(name), team2:team2_id(name)')
    .in('id', matchIds)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get user's batting stats in a specific match
 */
export async function getUserMatchBattingStats(
  userId: string,
  matchId: string
) {
  const supabase = createClient()

  // Get user's team_player_id for this match
  const { data: player } = await supabase
    .from('team_players')
    .select('id, team_id')
    .eq('user_id', userId)
    .single()

  if (!player) {
    return { success: false, error: 'Player not found in this match' }
  }

  const { data, error } = await supabase
    .from('batting_stats')
    .select('*')
    .eq('match_id', matchId)
    .eq('team_player_id', player.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get user's bowling stats in a specific match
 */
export async function getUserMatchBowlingStats(
  userId: string,
  matchId: string
) {
  const supabase = createClient()

  const { data: player } = await supabase
    .from('team_players')
    .select('id, team_id')
    .eq('user_id', userId)
    .single()

  if (!player) {
    return { success: false, error: 'Player not found in this match' }
  }

  const { data, error } = await supabase
    .from('bowling_stats')
    .select('*')
    .eq('match_id', matchId)
    .eq('team_player_id', player.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}


export async function getMatch(matchId: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('id', matchId)
    .single()
  
  if (error) {
    return { success: false, error: error.message }
  }
  
  return { success: true, data }
}



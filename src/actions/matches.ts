'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { MatchSetup } from '@/types/match'

/**
 * Create a new match
 */
export async function createMatch(data: {
  team1Id: string
  team2Id: string
  totalOvers: number
  venue?: string
  createdBy: string
}) {
  const supabase = createClient()

  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      team1_id: data.team1Id,
      team2_id: data.team2Id,
      total_overs: data.totalOvers,
      venue: data.venue,
      created_by: data.createdBy,
      status: 'not_started',
      batting_team_id: data.team1Id, // Team 1 bats first by default
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  // Create match innings records
  await supabase.from('match_innings').insert([
    {
      match_id: match.id,
      innings_number: 1,
      batting_team_id: data.team1Id,
      bowling_team_id: data.team2Id,
    },
    {
      match_id: match.id,
      innings_number: 2,
      batting_team_id: data.team2Id,
      bowling_team_id: data.team1Id,
    },
  ])

  // Get all players from both teams
  const { data: team1Players } = await supabase
    .from('team_players')
    .select('user_id')
    .eq('team_id', data.team1Id)

  const { data: team2Players } = await supabase
    .from('team_players')
    .select('user_id')
    .eq('team_id', data.team2Id)

  // Create match participants (only for registered players)
  const participants = [
    ...(team1Players?.filter((p) => p.user_id).map((p) => ({
      match_id: match.id,
      user_id: p.user_id!,
      team_id: data.team1Id,
    })) || []),
    ...(team2Players?.filter((p) => p.user_id).map((p) => ({
      match_id: match.id,
      user_id: p.user_id!,
      team_id: data.team2Id,
    })) || []),
  ]

  if (participants.length > 0) {
    await supabase.from('match_participants').insert(participants)
  }

  revalidatePath('/matches')
  return { success: true, data: match }
}

/**
 * Setup match with opening batsmen and bowler
 */
export async function setupMatch(
  matchId: string,
  setup: {
    openingBatsmen: [string, string]
    openingBowler: string
  }
) {
  const supabase = createClient()

  // Initialize batting stats for opening batsmen
  await supabase.from('batting_stats').insert([
    {
      match_id: matchId,
      team_player_id: setup.openingBatsmen[0],
      innings_number: 1,
      runs: 0,
      balls_faced: 0,
    },
    {
      match_id: matchId,
      team_player_id: setup.openingBatsmen[1],
      innings_number: 1,
      runs: 0,
      balls_faced: 0,
    },
  ])

  // Initialize bowling stats for opening bowler
  await supabase.from('bowling_stats').insert({
    match_id: matchId,
    team_player_id: setup.openingBowler,
    innings_number: 1,
    overs: 0,
    balls_bowled: 0,
  })

  // Update match status to live
  const { error } = await supabase
    .from('matches')
    .update({ status: 'live' })
    .eq('id', matchId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

/**
 * Get a single match with all details
 */
export async function getMatch(matchId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      *,
      team1:team1_id(*, team_players(*)),
      team2:team2_id(*, team_players(*)),
      batting_stats(*),
      bowling_stats(*),
      balls(*)
    `
    )
    .eq('id', matchId)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get all matches
 */
export async function getMatches(filters?: {
  status?: 'not_started' | 'live' | 'completed' | 'abandoned'
  userId?: string
}) {
  const supabase = createClient()

  let query = supabase
    .from('matches')
    .select('*, team1:team1_id(name), team2:team2_id(name)')
    .order('match_date', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.userId) {
    const { data: participantMatches } = await supabase
      .from('match_participants')
      .select('match_id')
      .eq('user_id', filters.userId)
    
    if (participantMatches && participantMatches.length > 0) {
      query = query.in('id', participantMatches.map(p => p.match_id))
    } else {
      // If user has no matches, return empty result
      return { success: true, data: [] }
    }
  }

  const { data, error } = await query

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get live matches for a user
 */
export async function getUserLiveMatches(userId: string) {
  return getMatches({ status: 'live', userId })
}

/**
 * Get all live matches (public)
 */
export async function getAllLiveMatches() {
  return getMatches({ status: 'live' })
}

/**
 * Update current bowler
 */
export async function changeBowler(
  matchId: string,
  newBowlerId: string,
  inningsNumber: number
) {
  const supabase = createClient()

  // Check if bowler already has stats for this innings
  const { data: existing } = await supabase
    .from('bowling_stats')
    .select('*')
    .eq('match_id', matchId)
    .eq('team_player_id', newBowlerId)
    .eq('innings_number', inningsNumber)
    .single()

  if (!existing) {
    // Initialize bowling stats
    await supabase.from('bowling_stats').insert({
      match_id: matchId,
      team_player_id: newBowlerId,
      innings_number: inningsNumber,
      overs: 0,
      balls_bowled: 0,
    })
  }

  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

/**
 * Select new batsman after wicket
 */
export async function selectNewBatsman(
  matchId: string,
  batsmanId: string,
  inningsNumber: number
) {
  const supabase = createClient()

  // Check if this batsman has existing stats (e.g., retired hurt)
  const { data: existingStat } = await supabase
    .from('batting_stats')
    .select('*')
    .eq('match_id', matchId)
    .eq('team_player_id', batsmanId)
    .eq('innings_number', inningsNumber)
    .single()

  if (existingStat) {
    // Player is returning (e.g., from retired hurt)
    // Mark them as not out so they can bat again
    const { error } = await supabase
      .from('batting_stats')
      .update({
        is_out: false,
        dismissal_type: null,
      })
      .eq('id', existingStat.id)

    if (error) {
      return { success: false, error: error.message }
    }
  } else {
    // Initialize batting stats for new batsman
    const { error } = await supabase.from('batting_stats').insert({
      match_id: matchId,
      team_player_id: batsmanId,
      innings_number: inningsNumber,
      runs: 0,
      balls_faced: 0,
    })

    if (error) {
      return { success: false, error: error.message }
    }
  }

  revalidatePath(`/matches/${matchId}`)
  return { success: true }
}

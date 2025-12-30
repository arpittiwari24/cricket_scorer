'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Create a new team
 */
export async function createTeam(data: {
  name: string
  createdBy: string
}) {
  const supabase = createClient()

  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      name: data.name,
      created_by: data.createdBy,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teams')
  return { success: true, data: team }
}

/**
 * Update a team
 */
export async function updateTeam(teamId: string, data: { name: string }) {
  const supabase = createClient()

  const { error } = await supabase
    .from('teams')
    .update({ name: data.name })
    .eq('id', teamId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teams')
  revalidatePath(`/teams/${teamId}`)
  return { success: true }
}

/**
 * Delete a team
 */
export async function deleteTeam(teamId: string) {
  const supabase = createClient()

  const { error } = await supabase.from('teams').delete().eq('id', teamId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teams')
  return { success: true }
}

/**
 * Add a player to a team (registered user or guest)
 */
export async function addPlayerToTeam(data: {
  teamId: string
  userId?: string // null for guest
  playerName: string
  isCaptain?: boolean
  isGuest: boolean
  avatarIndex?: number
  battingOrder?: number
}) {
  const supabase = createClient()

  const { data: player, error } = await supabase
    .from('team_players')
    .insert({
      team_id: data.teamId,
      user_id: data.userId || null,
      player_name: data.playerName,
      is_captain: data.isCaptain || false,
      is_guest: data.isGuest,
      avatar_index: data.avatarIndex || 0,
      batting_order: data.battingOrder || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/teams/${data.teamId}`)
  return { success: true, data: player }
}

/**
 * Update a player in a team
 */
export async function updateTeamPlayer(
  playerId: string,
  data: {
    playerName?: string
    isCaptain?: boolean
    avatarIndex?: number
    battingOrder?: number
  }
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('team_players')
    .update(data)
    .eq('id', playerId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/teams')
  return { success: true }
}

/**
 * Remove a player from a team
 */
export async function removePlayerFromTeam(playerId: string, teamId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('team_players')
    .delete()
    .eq('id', playerId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/teams/${teamId}`)
  return { success: true }
}

/**
 * Get all teams
 */
export async function getTeams() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('teams')
    .select('*, players:team_players(*)')
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Get a single team with players
 */
export async function getTeam(teamId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('teams')
    .select('*, players:team_players(*)')
    .eq('id', teamId)
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

/**
 * Search for registered users by name or email
 */
export async function searchUsers(query: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, avatar_url')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

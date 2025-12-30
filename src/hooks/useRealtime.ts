'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Match } from '@/types/match'

/**
 * Subscribe to real-time match updates
 */
export function useRealtimeMatch(matchId: string) {
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient(true) // Enable realtime for live match updates

  useEffect(() => {
    // Fetch initial match data
    const fetchMatch = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (data) {
        setMatch(data)
      }
      setIsLoading(false)
    }

    fetchMatch()

    // Subscribe to changes
    const channel = supabase
      .channel(`match:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          setMatch(payload.new as Match)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId])

  return { match, isLoading }
}

/**
 * Subscribe to all live matches
 */
export function useRealtimeLiveMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient(true) // Enable realtime for live matches

  useEffect(() => {
    const fetchLiveMatches = async () => {
      const { data } = await supabase
        .from('matches')
        .select('*, team1:team1_id(name), team2:team2_id(name)')
        .eq('status', 'live')
        .order('match_date', { ascending: false })

      if (data) {
        setMatches(data as any)
      }
      setIsLoading(false)
    }

    fetchLiveMatches()

    // Subscribe to changes
    const channel = supabase
      .channel('live-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: 'status=eq.live',
        },
        () => {
          // Refetch when any live match changes
          fetchLiveMatches()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { matches, isLoading }
}

/**
 * Subscribe to match stats updates
 */
export function useRealtimeMatchStats(matchId: string) {
  const [battingStats, setBattingStats] = useState<any[]>([])
  const [bowlingStats, setBowlingStats] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient(true) // Enable realtime for match stats

  useEffect(() => {
    const fetchStats = async () => {
      const { data: batting } = await supabase
        .from('batting_stats')
        .select('*, player:team_player_id(*)')
        .eq('match_id', matchId)

      const { data: bowling } = await supabase
        .from('bowling_stats')
        .select('*, player:team_player_id(*)')
        .eq('match_id', matchId)

      if (batting) setBattingStats(batting)
      if (bowling) setBowlingStats(bowling)
      setIsLoading(false)
    }

    fetchStats()

    // Subscribe to batting stats
    const battingChannel = supabase
      .channel(`batting:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batting_stats',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          fetchStats()
        }
      )
      .subscribe()

    // Subscribe to bowling stats
    const bowlingChannel = supabase
      .channel(`bowling:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bowling_stats',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(battingChannel)
      supabase.removeChannel(bowlingChannel)
    }
  }, [matchId])

  return { battingStats, bowlingStats, isLoading }
}

import { Database } from './database'

export type Team = Database['public']['Tables']['teams']['Row']
export type TeamPlayer = Database['public']['Tables']['team_players']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Ball = Database['public']['Tables']['balls']['Row']
export type BattingStats = Database['public']['Tables']['batting_stats']['Row']
export type BowlingStats = Database['public']['Tables']['bowling_stats']['Row']
export type CareerStats = Database['public']['Tables']['career_stats']['Row']

export interface TeamWithPlayers extends Team {
  players: TeamPlayer[]
}

export interface CurrentBatsman extends TeamPlayer {
  runs: number
  balls: number
  fours: number
  sixes: number
  onStrike: boolean
}

export interface CurrentBowler extends TeamPlayer {
  overs: number
  balls: number
  runs: number
  wickets: number
  maidens: number
}

export interface MatchState extends Match {
  team1: TeamWithPlayers
  team2: TeamWithPlayers
  currentBatsmen: CurrentBatsman[]
  currentBowler: CurrentBowler | null
  ballHistory: Ball[]
}

export type BallType = 'legal' | 'wide' | 'noball' | 'wicket'

export type WicketType =
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'run_out'
  | 'stumped'
  | 'hit_wicket'
  | 'retired_hurt'

export interface BallInput {
  runs: number
  isWide?: boolean
  isNoBall?: boolean
  isWicket?: boolean
  wicketType?: WicketType
  isBoundary?: boolean
  isSix?: boolean
}

export interface MatchSetup {
  team1_id: string
  team2_id: string
  total_overs: number
  venue?: string
  opening_batsmen: [string, string] // two player IDs
  opening_bowler: string
}

export interface OverComplete {
  overNumber: number
  maidenOver: boolean
  runsConceded: number
  wickets: number
}

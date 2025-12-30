export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string
          avatar_url: string | null
          google_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          avatar_url?: string | null
          google_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          avatar_url?: string | null
          google_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      team_players: {
        Row: {
          id: string
          team_id: string
          user_id: string | null
          player_name: string
          is_captain: boolean
          is_guest: boolean
          avatar_index: number
          batting_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id?: string | null
          player_name: string
          is_captain?: boolean
          is_guest?: boolean
          avatar_index?: number
          batting_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string | null
          player_name?: string
          is_captain?: boolean
          is_guest?: boolean
          avatar_index?: number
          batting_order?: number | null
          created_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          team1_id: string
          team2_id: string
          created_by: string | null
          total_overs: number
          venue: string | null
          match_date: string
          status: 'not_started' | 'live' | 'completed' | 'abandoned'
          current_innings: number
          batting_team_id: string | null
          team1_score: number
          team1_wickets: number
          team1_overs: number
          team1_balls: number
          team2_score: number
          team2_wickets: number
          team2_overs: number
          team2_balls: number
          target: number | null
          winner_team_id: string | null
          result_text: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          team1_id: string
          team2_id: string
          created_by?: string | null
          total_overs: number
          venue?: string | null
          match_date?: string
          status?: 'not_started' | 'live' | 'completed' | 'abandoned'
          current_innings?: number
          batting_team_id?: string | null
          team1_score?: number
          team1_wickets?: number
          team1_overs?: number
          team1_balls?: number
          team2_score?: number
          team2_wickets?: number
          team2_overs?: number
          team2_balls?: number
          target?: number | null
          winner_team_id?: string | null
          result_text?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          team1_id?: string
          team2_id?: string
          created_by?: string | null
          total_overs?: number
          venue?: string | null
          match_date?: string
          status?: 'not_started' | 'live' | 'completed' | 'abandoned'
          current_innings?: number
          batting_team_id?: string | null
          team1_score?: number
          team1_wickets?: number
          team1_overs?: number
          team1_balls?: number
          team2_score?: number
          team2_wickets?: number
          team2_overs?: number
          team2_balls?: number
          target?: number | null
          winner_team_id?: string | null
          result_text?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
      }
      balls: {
        Row: {
          id: string
          match_id: string
          innings_number: number
          over_number: number
          ball_number: number
          batsman_id: string | null
          non_striker_id: string | null
          bowler_id: string | null
          runs_scored: number
          extras: number
          ball_type: 'legal' | 'wide' | 'noball' | 'wicket'
          wicket_type: string | null
          is_boundary: boolean
          is_six: boolean
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          innings_number: number
          over_number: number
          ball_number: number
          batsman_id?: string | null
          non_striker_id?: string | null
          bowler_id?: string | null
          runs_scored?: number
          extras?: number
          ball_type?: 'legal' | 'wide' | 'noball' | 'wicket'
          wicket_type?: string | null
          is_boundary?: boolean
          is_six?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          innings_number?: number
          over_number?: number
          ball_number?: number
          batsman_id?: string | null
          non_striker_id?: string | null
          bowler_id?: string | null
          runs_scored?: number
          extras?: number
          ball_type?: 'legal' | 'wide' | 'noball' | 'wicket'
          wicket_type?: string | null
          is_boundary?: boolean
          is_six?: boolean
          created_at?: string
        }
      }
      batting_stats: {
        Row: {
          id: string
          match_id: string
          team_player_id: string
          innings_number: number
          runs: number
          balls_faced: number
          fours: number
          sixes: number
          strike_rate: number
          is_out: boolean
          dismissal_type: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          team_player_id: string
          innings_number: number
          runs?: number
          balls_faced?: number
          fours?: number
          sixes?: number
          strike_rate?: number
          is_out?: boolean
          dismissal_type?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          team_player_id?: string
          innings_number?: number
          runs?: number
          balls_faced?: number
          fours?: number
          sixes?: number
          strike_rate?: number
          is_out?: boolean
          dismissal_type?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bowling_stats: {
        Row: {
          id: string
          match_id: string
          team_player_id: string
          innings_number: number
          overs: number
          balls_bowled: number
          runs_conceded: number
          wickets: number
          maidens: number
          economy_rate: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          match_id: string
          team_player_id: string
          innings_number: number
          overs?: number
          balls_bowled?: number
          runs_conceded?: number
          wickets?: number
          maidens?: number
          economy_rate?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          team_player_id?: string
          innings_number?: number
          overs?: number
          balls_bowled?: number
          runs_conceded?: number
          wickets?: number
          maidens?: number
          economy_rate?: number
          created_at?: string
          updated_at?: string
        }
      }
      career_stats: {
        Row: {
          id: string
          user_id: string
          total_matches: number
          total_runs: number
          total_balls_faced: number
          total_fours: number
          total_sixes: number
          highest_score: number
          total_innings_batted: number
          times_out: number
          batting_average: number
          batting_strike_rate: number
          total_overs_bowled: number
          total_balls_bowled: number
          total_runs_conceded: number
          total_wickets: number
          total_maidens: number
          bowling_average: number
          economy_rate: number
          best_bowling_figures: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_matches?: number
          total_runs?: number
          total_balls_faced?: number
          total_fours?: number
          total_sixes?: number
          highest_score?: number
          total_innings_batted?: number
          times_out?: number
          batting_average?: number
          batting_strike_rate?: number
          total_overs_bowled?: number
          total_balls_bowled?: number
          total_runs_conceded?: number
          total_wickets?: number
          total_maidens?: number
          bowling_average?: number
          economy_rate?: number
          best_bowling_figures?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_matches?: number
          total_runs?: number
          total_balls_faced?: number
          total_fours?: number
          total_sixes?: number
          highest_score?: number
          total_innings_batted?: number
          times_out?: number
          batting_average?: number
          batting_strike_rate?: number
          total_overs_bowled?: number
          total_balls_bowled?: number
          total_runs_conceded?: number
          total_wickets?: number
          total_maidens?: number
          bowling_average?: number
          economy_rate?: number
          best_bowling_figures?: string | null
          updated_at?: string
        }
      }
      match_participants: {
        Row: {
          id: string
          match_id: string
          user_id: string
          team_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          user_id: string
          team_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          user_id?: string
          team_id?: string | null
          created_at?: string
        }
      }
    }
  }
}

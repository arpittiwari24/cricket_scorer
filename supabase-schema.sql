-- =====================================================
-- Cricket Scorer Platform - Complete Database Schema
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  google_id TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- =====================================================
-- TEAMS TABLE
-- =====================================================
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_teams_created_by ON teams(created_by);

-- =====================================================
-- TEAM PLAYERS TABLE (Junction table with player details)
-- =====================================================
CREATE TABLE team_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  is_captain BOOLEAN DEFAULT FALSE,
  is_guest BOOLEAN DEFAULT FALSE,
  avatar_index INTEGER DEFAULT 0,
  batting_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id),
  UNIQUE(team_id, batting_order)
);

CREATE INDEX idx_team_players_team_id ON team_players(team_id);
CREATE INDEX idx_team_players_user_id ON team_players(user_id);

-- =====================================================
-- MATCHES TABLE
-- =====================================================
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team1_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  team2_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  total_overs INTEGER NOT NULL,
  venue TEXT,
  match_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'not_started',
  current_innings INTEGER DEFAULT 1,
  batting_team_id UUID,
  team1_score INTEGER DEFAULT 0,
  team1_wickets INTEGER DEFAULT 0,
  team1_overs INTEGER DEFAULT 0,
  team1_balls INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  team2_wickets INTEGER DEFAULT 0,
  team2_overs INTEGER DEFAULT 0,
  team2_balls INTEGER DEFAULT 0,
  target INTEGER,
  winner_team_id UUID,
  result_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_created_by ON matches(created_by);
CREATE INDEX idx_matches_team1 ON matches(team1_id);
CREATE INDEX idx_matches_team2 ON matches(team2_id);
CREATE INDEX idx_matches_date ON matches(match_date DESC);

-- =====================================================
-- MATCH INNINGS TABLE
-- =====================================================
CREATE TABLE match_innings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings_number INTEGER NOT NULL,
  batting_team_id UUID REFERENCES teams(id),
  bowling_team_id UUID REFERENCES teams(id),
  total_score INTEGER DEFAULT 0,
  total_wickets INTEGER DEFAULT 0,
  total_overs INTEGER DEFAULT 0,
  total_balls INTEGER DEFAULT 0,
  extras_wide INTEGER DEFAULT 0,
  extras_noball INTEGER DEFAULT 0,
  UNIQUE(match_id, innings_number)
);

CREATE INDEX idx_match_innings_match_id ON match_innings(match_id);

-- =====================================================
-- BALLS TABLE (Ball-by-ball data)
-- =====================================================
CREATE TABLE balls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  innings_number INTEGER NOT NULL,
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  batsman_id UUID REFERENCES team_players(id),
  non_striker_id UUID REFERENCES team_players(id),
  bowler_id UUID REFERENCES team_players(id),
  runs_scored INTEGER DEFAULT 0,
  extras INTEGER DEFAULT 0,
  ball_type TEXT DEFAULT 'legal',
  wicket_type TEXT,
  is_boundary BOOLEAN DEFAULT FALSE,
  is_six BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, innings_number, over_number, ball_number)
);

CREATE INDEX idx_balls_match_id ON balls(match_id);
CREATE INDEX idx_balls_batsman_id ON balls(batsman_id);
CREATE INDEX idx_balls_bowler_id ON balls(bowler_id);

-- =====================================================
-- BATTING STATS TABLE (Per match, per player)
-- =====================================================
CREATE TABLE batting_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_player_id UUID REFERENCES team_players(id) ON DELETE CASCADE,
  innings_number INTEGER NOT NULL,
  runs INTEGER DEFAULT 0,
  balls_faced INTEGER DEFAULT 0,
  fours INTEGER DEFAULT 0,
  sixes INTEGER DEFAULT 0,
  strike_rate DECIMAL(5,2) DEFAULT 0,
  is_out BOOLEAN DEFAULT FALSE,
  dismissal_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, team_player_id, innings_number)
);

CREATE INDEX idx_batting_stats_match_id ON batting_stats(match_id);
CREATE INDEX idx_batting_stats_player_id ON batting_stats(team_player_id);

-- =====================================================
-- BOWLING STATS TABLE (Per match, per player)
-- =====================================================
CREATE TABLE bowling_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_player_id UUID REFERENCES team_players(id) ON DELETE CASCADE,
  innings_number INTEGER NOT NULL,
  overs INTEGER DEFAULT 0,
  balls_bowled INTEGER DEFAULT 0,
  runs_conceded INTEGER DEFAULT 0,
  wickets INTEGER DEFAULT 0,
  maidens INTEGER DEFAULT 0,
  economy_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, team_player_id, innings_number)
);

CREATE INDEX idx_bowling_stats_match_id ON bowling_stats(match_id);
CREATE INDEX idx_bowling_stats_player_id ON bowling_stats(team_player_id);

-- =====================================================
-- CAREER STATS TABLE (Aggregated career stats for registered users)
-- =====================================================
CREATE TABLE career_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  total_matches INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  total_balls_faced INTEGER DEFAULT 0,
  total_fours INTEGER DEFAULT 0,
  total_sixes INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  total_innings_batted INTEGER DEFAULT 0,
  times_out INTEGER DEFAULT 0,
  batting_average DECIMAL(6,2) DEFAULT 0,
  batting_strike_rate DECIMAL(5,2) DEFAULT 0,
  total_overs_bowled INTEGER DEFAULT 0,
  total_balls_bowled INTEGER DEFAULT 0,
  total_runs_conceded INTEGER DEFAULT 0,
  total_wickets INTEGER DEFAULT 0,
  total_maidens INTEGER DEFAULT 0,
  bowling_average DECIMAL(6,2) DEFAULT 0,
  economy_rate DECIMAL(5,2) DEFAULT 0,
  best_bowling_figures TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_career_stats_user_id ON career_stats(user_id);

-- =====================================================
-- MATCH PARTICIPANTS (Track who can see/edit a match)
-- =====================================================
CREATE TABLE match_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

CREATE INDEX idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX idx_match_participants_user_id ON match_participants(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_innings ENABLE ROW LEVEL SECURITY;
ALTER TABLE balls ENABLE ROW LEVEL SECURITY;
ALTER TABLE batting_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE bowling_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

-- Users: Can read all, update own
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Teams: Can read all, create/update own
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Authenticated create teams" ON teams FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own teams" ON teams FOR UPDATE USING (auth.uid() = created_by);

-- Team Players: Can read all, manage own teams
CREATE POLICY "Public read team_players" ON team_players FOR SELECT USING (true);
CREATE POLICY "Team owners manage players" ON team_players FOR ALL USING (
  team_id IN (SELECT id FROM teams WHERE created_by = auth.uid())
);

-- Matches: Public read, participants can update
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Authenticated create matches" ON matches FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Participants update matches" ON matches FOR UPDATE USING (
  auth.uid() IN (SELECT user_id FROM match_participants WHERE match_id = id)
);

-- Match Innings: Public read, match participants can write
CREATE POLICY "Public read innings" ON match_innings FOR SELECT USING (true);
CREATE POLICY "Participants manage innings" ON match_innings FOR ALL USING (
  match_id IN (SELECT match_id FROM match_participants WHERE user_id = auth.uid())
);

-- Balls: Public read, match participants can write
CREATE POLICY "Public read balls" ON balls FOR SELECT USING (true);
CREATE POLICY "Participants record balls" ON balls FOR INSERT WITH CHECK (
  match_id IN (SELECT match_id FROM match_participants WHERE user_id = auth.uid())
);

-- Batting Stats: Public read, match participants can write
CREATE POLICY "Public read batting_stats" ON batting_stats FOR SELECT USING (true);
CREATE POLICY "Participants manage batting_stats" ON batting_stats FOR ALL USING (
  match_id IN (SELECT match_id FROM match_participants WHERE user_id = auth.uid())
);

-- Bowling Stats: Public read, match participants can write
CREATE POLICY "Public read bowling_stats" ON bowling_stats FOR SELECT USING (true);
CREATE POLICY "Participants manage bowling_stats" ON bowling_stats FOR ALL USING (
  match_id IN (SELECT match_id FROM match_participants WHERE user_id = auth.uid())
);

-- Career Stats: Public read
CREATE POLICY "Public read career_stats" ON career_stats FOR SELECT USING (true);

-- Match Participants: Read own or live matches
CREATE POLICY "Users read participations" ON match_participants FOR SELECT USING (
  auth.uid() = user_id OR
  match_id IN (SELECT id FROM matches WHERE status = 'live')
);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update career stats after match completion
CREATE OR REPLACE FUNCTION update_career_stats_after_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update batting stats for all registered players
    INSERT INTO career_stats (user_id, total_matches, total_runs, total_balls_faced, total_fours, total_sixes, highest_score, total_innings_batted, times_out, batting_average, batting_strike_rate)
    SELECT
      tp.user_id,
      1,
      COALESCE(SUM(bs.runs), 0),
      COALESCE(SUM(bs.balls_faced), 0),
      COALESCE(SUM(bs.fours), 0),
      COALESCE(SUM(bs.sixes), 0),
      COALESCE(MAX(bs.runs), 0),
      COUNT(*),
      COALESCE(SUM(CASE WHEN bs.is_out THEN 1 ELSE 0 END), 0),
      CASE
        WHEN SUM(CASE WHEN bs.is_out THEN 1 ELSE 0 END) > 0
        THEN ROUND(SUM(bs.runs)::NUMERIC / SUM(CASE WHEN bs.is_out THEN 1 ELSE 0 END)::NUMERIC, 2)
        ELSE 0
      END,
      CASE
        WHEN SUM(bs.balls_faced) > 0
        THEN ROUND((SUM(bs.runs)::NUMERIC / SUM(bs.balls_faced)::NUMERIC) * 100, 2)
        ELSE 0
      END
    FROM batting_stats bs
    JOIN team_players tp ON bs.team_player_id = tp.id
    WHERE bs.match_id = NEW.id AND tp.user_id IS NOT NULL AND tp.is_guest = FALSE
    GROUP BY tp.user_id
    ON CONFLICT (user_id) DO UPDATE SET
      total_matches = career_stats.total_matches + 1,
      total_runs = career_stats.total_runs + EXCLUDED.total_runs,
      total_balls_faced = career_stats.total_balls_faced + EXCLUDED.total_balls_faced,
      total_fours = career_stats.total_fours + EXCLUDED.total_fours,
      total_sixes = career_stats.total_sixes + EXCLUDED.total_sixes,
      highest_score = GREATEST(career_stats.highest_score, EXCLUDED.highest_score),
      total_innings_batted = career_stats.total_innings_batted + EXCLUDED.total_innings_batted,
      times_out = career_stats.times_out + EXCLUDED.times_out,
      batting_average = CASE
        WHEN career_stats.times_out + EXCLUDED.times_out > 0
        THEN ROUND((career_stats.total_runs + EXCLUDED.total_runs)::NUMERIC / (career_stats.times_out + EXCLUDED.times_out)::NUMERIC, 2)
        ELSE 0
      END,
      batting_strike_rate = CASE
        WHEN career_stats.total_balls_faced + EXCLUDED.total_balls_faced > 0
        THEN ROUND(((career_stats.total_runs + EXCLUDED.total_runs)::NUMERIC / (career_stats.total_balls_faced + EXCLUDED.total_balls_faced)::NUMERIC) * 100, 2)
        ELSE 0
      END,
      updated_at = NOW();

    -- Update bowling stats for all registered players
    UPDATE career_stats cs SET
      total_overs_bowled = cs.total_overs_bowled + bws.overs,
      total_balls_bowled = cs.total_balls_bowled + bws.balls_bowled,
      total_runs_conceded = cs.total_runs_conceded + bws.runs_conceded,
      total_wickets = cs.total_wickets + bws.wickets,
      total_maidens = cs.total_maidens + bws.maidens,
      bowling_average = CASE
        WHEN cs.total_wickets + bws.wickets > 0
        THEN ROUND((cs.total_runs_conceded + bws.runs_conceded)::NUMERIC / (cs.total_wickets + bws.wickets)::NUMERIC, 2)
        ELSE 0
      END,
      economy_rate = CASE
        WHEN cs.total_overs_bowled + bws.overs > 0
        THEN ROUND((cs.total_runs_conceded + bws.runs_conceded)::NUMERIC / (cs.total_overs_bowled + bws.overs)::NUMERIC, 2)
        ELSE 0
      END,
      updated_at = NOW()
    FROM (
      SELECT
        tp.user_id,
        SUM(bows.overs) as overs,
        SUM(bows.balls_bowled) as balls_bowled,
        SUM(bows.runs_conceded) as runs_conceded,
        SUM(bows.wickets) as wickets,
        SUM(bows.maidens) as maidens
      FROM bowling_stats bows
      JOIN team_players tp ON bows.team_player_id = tp.id
      WHERE bows.match_id = NEW.id AND tp.user_id IS NOT NULL AND tp.is_guest = FALSE
      GROUP BY tp.user_id
    ) bws
    WHERE cs.user_id = bws.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_career_stats
AFTER UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_career_stats_after_match();

-- Function to auto-update match timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

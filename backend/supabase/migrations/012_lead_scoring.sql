-- ============================================
-- Migration: Lead Scoring System
-- ============================================

-- Add scoring columns to prospects table
ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS score_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_badge TEXT DEFAULT 'cold' CHECK (score_badge IN ('hot', 'warm', 'cold')),
  ADD COLUMN IF NOT EXISTS score_signals JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMPTZ;

-- Create prospect_signals table for detailed signal tracking
CREATE TABLE IF NOT EXISTS prospect_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Signal: Nouveau poste / lancement récent
  is_new_position BOOLEAN DEFAULT FALSE,
  new_position_date DATE,
  new_position_source TEXT, -- "bio", "post", "manual"
  new_position_evidence TEXT,

  -- Signal: A posté sur une douleur
  has_pain_post BOOLEAN DEFAULT FALSE,
  pain_post_content TEXT,
  pain_post_date DATE,
  pain_topic TEXT,

  -- Signal: Engagement avec concurrent
  engaged_with_competitor BOOLEAN DEFAULT FALSE,
  competitor_name TEXT,
  engagement_type TEXT, -- "like", "comment", "follow"

  -- Signal: Petite audience
  audience_size INTEGER,
  is_small_audience BOOLEAN DEFAULT FALSE,

  -- Signal: Même localisation
  location TEXT,
  is_same_location BOOLEAN DEFAULT FALSE,

  -- Score calculé
  score_total INTEGER DEFAULT 0,
  score_badge TEXT DEFAULT 'cold' CHECK (score_badge IN ('hot', 'warm', 'cold')),

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(prospect_id)
);

-- Create user_scoring_config table for competitor tracking
CREATE TABLE IF NOT EXISTS user_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  competitors JSONB DEFAULT '[]', -- Array of competitor usernames
  user_location TEXT,

  -- Custom weights (optional override)
  custom_weights JSONB DEFAULT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prospects_score ON prospects(score_total DESC);
CREATE INDEX IF NOT EXISTS idx_prospects_badge ON prospects(score_badge);
CREATE INDEX IF NOT EXISTS idx_prospect_signals_prospect ON prospect_signals(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_signals_user ON prospect_signals(user_id);

-- RLS Policies
ALTER TABLE prospect_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_scoring_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own prospect_signals" ON prospect_signals;
CREATE POLICY "Users own prospect_signals" ON prospect_signals
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users own scoring_config" ON user_scoring_config;
CREATE POLICY "Users own scoring_config" ON user_scoring_config
  FOR ALL USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE prospect_signals IS 'Stores detected buying signals for each prospect';
COMMENT ON TABLE user_scoring_config IS 'User configuration for lead scoring (competitors, location)';
COMMENT ON COLUMN prospects.score_total IS 'Lead score from 0 to 100';
COMMENT ON COLUMN prospects.score_badge IS 'Score category: hot (60+), warm (30-59), cold (<30)';

-- ============================================
-- Campaign Voice Profiles (Agency Mode)
-- Each campaign/client can have its own voice
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Voice profile content (same structure as voice_profiles)
  client_name VARCHAR(255), -- The client's name for personalization
  industry VARCHAR(255),
  expertise TEXT,
  tone VARCHAR(100), -- ex: "professionnel mais accessible"
  style_notes TEXT, -- Additional style notes

  -- Sample texts for AI learning
  sample_intro TEXT, -- How they introduce themselves
  sample_dm TEXT, -- Example DM in their voice
  sample_comment TEXT, -- Example comment in their voice
  keywords TEXT[], -- Words/phrases they commonly use
  avoid_words TEXT[], -- Words/phrases to avoid

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One voice profile per campaign
  UNIQUE(campaign_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_voice_profiles_campaign ON campaign_voice_profiles(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_voice_profiles_user ON campaign_voice_profiles(user_id);

-- RLS Policies
ALTER TABLE campaign_voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own campaign voice profiles"
  ON campaign_voice_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own campaign voice profiles"
  ON campaign_voice_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own campaign voice profiles"
  ON campaign_voice_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own campaign voice profiles"
  ON campaign_voice_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_campaign_voice_profiles_updated_at
  BEFORE UPDATE ON campaign_voice_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

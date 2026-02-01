-- Migration: Système de Campagnes LinkedIn
-- Date: 2025-01-30

-- ============================================
-- TABLE: campaigns
-- Campagnes de prospection
-- ============================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  message_templates JSONB DEFAULT '{
    "accroche": "",
    "relance_j3": "",
    "relance_j7": "",
    "relance_j14": ""
  }',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaigns" ON campaigns
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own campaigns" ON campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" ON campaigns
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" ON campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- MODIFY: prospects table - Ajouter colonnes pipeline
-- ============================================

ALTER TABLE prospects
  ADD COLUMN IF NOT EXISTS pipeline_status TEXT DEFAULT 'demande_envoyee'
    CHECK (pipeline_status IN (
      'demande_envoyee', 'connecte', 'message_1', 'relance_1', 'relance_2',
      'repondu_chaud', 'repondu_froid', 'rdv_pris', 'converti', 'ignore'
    )),
  ADD COLUMN IF NOT EXISTS next_action_date DATE;

CREATE INDEX IF NOT EXISTS idx_prospects_pipeline_status ON prospects(pipeline_status);
CREATE INDEX IF NOT EXISTS idx_prospects_next_action ON prospects(next_action_date);

-- ============================================
-- TABLE: campaign_prospects (junction)
-- Liaison campagnes <-> prospects
-- ============================================

CREATE TABLE IF NOT EXISTS campaign_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  stage TEXT DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  last_action_at TIMESTAMPTZ,
  UNIQUE(campaign_id, prospect_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_prospects_campaign ON campaign_prospects(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_prospects_prospect ON campaign_prospects(prospect_id);

ALTER TABLE campaign_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access campaign_prospects via campaigns" ON campaign_prospects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can insert campaign_prospects for their campaigns" ON campaign_prospects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can update campaign_prospects for their campaigns" ON campaign_prospects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );

CREATE POLICY "Users can delete campaign_prospects for their campaigns" ON campaign_prospects
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM campaigns WHERE campaigns.id = campaign_id AND campaigns.user_id = auth.uid())
  );

-- ============================================
-- FUNCTION: update_updated_at
-- Met à jour automatiquement updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_campaigns_updated_at();

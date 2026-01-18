-- Migration 007: Ajout de la catégorisation IA des réponses
-- Social Prospector - CRM Dashboard

-- Ajouter les champs de catégorisation aux prospects
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS response_category VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS response_category_confidence DECIMAL(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS response_category_reasoning TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS response_signals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS response_categorized_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS needs_attention BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attention_reason VARCHAR(100) DEFAULT NULL;

-- Index pour filtrer rapidement par catégorie
CREATE INDEX IF NOT EXISTS idx_prospects_response_category ON prospects(response_category);
CREATE INDEX IF NOT EXISTS idx_prospects_needs_attention ON prospects(needs_attention) WHERE needs_attention = TRUE;

-- Table pour l'historique des catégorisations (audit trail)
CREATE TABLE IF NOT EXISTS response_categorization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  confidence DECIMAL(3,2),
  reasoning TEXT,
  signals JSONB DEFAULT '[]'::jsonb,
  objection_type VARCHAR(50),
  question_type VARCHAR(50),
  suggested_tone VARCHAR(50),
  was_overridden BOOLEAN DEFAULT FALSE,
  override_category VARCHAR(50),
  override_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour l'historique
CREATE INDEX IF NOT EXISTS idx_categorization_history_prospect ON response_categorization_history(prospect_id);
CREATE INDEX IF NOT EXISTS idx_categorization_history_user ON response_categorization_history(user_id);
CREATE INDEX IF NOT EXISTS idx_categorization_history_category ON response_categorization_history(category);

-- Vue pour le dashboard CRM avec stats par catégorie
CREATE OR REPLACE VIEW crm_dashboard_stats AS
SELECT
  user_id,
  response_category,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE needs_attention = TRUE) as needs_attention_count,
  MAX(updated_at) as last_activity
FROM prospects
WHERE response_category IS NOT NULL
GROUP BY user_id, response_category;

-- Vue pour les prospects nécessitant une attention
CREATE OR REPLACE VIEW prospects_needing_attention AS
SELECT
  p.*,
  CASE
    WHEN p.response_category = 'hot_lead' THEN 1
    WHEN p.response_category = 'meeting_request' THEN 2
    WHEN p.response_category = 'question' THEN 3
    WHEN p.response_category = 'objection' THEN 4
    WHEN p.response_category = 'warm_lead' THEN 5
    ELSE 10
  END as priority_order
FROM prospects p
WHERE p.needs_attention = TRUE
  OR p.response_category IN ('hot_lead', 'meeting_request', 'question', 'objection')
ORDER BY priority_order, p.updated_at DESC;

-- Fonction pour mettre à jour needs_attention automatiquement
CREATE OR REPLACE FUNCTION update_needs_attention()
RETURNS TRIGGER AS $$
BEGIN
  -- Marquer comme nécessitant attention si catégorie prioritaire
  IF NEW.response_category IN ('hot_lead', 'meeting_request', 'question', 'objection') THEN
    NEW.needs_attention := TRUE;
    NEW.attention_reason := CASE NEW.response_category
      WHEN 'hot_lead' THEN 'Lead chaud à relancer'
      WHEN 'meeting_request' THEN 'Demande de RDV à planifier'
      WHEN 'question' THEN 'Question à répondre'
      WHEN 'objection' THEN 'Objection à traiter'
    END;
  ELSIF NEW.response_category IN ('not_interested', 'negative') THEN
    NEW.needs_attention := FALSE;
    NEW.attention_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour auto-update needs_attention
DROP TRIGGER IF EXISTS trigger_update_needs_attention ON prospects;
CREATE TRIGGER trigger_update_needs_attention
  BEFORE UPDATE OF response_category ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION update_needs_attention();

-- Commentaires pour documentation
COMMENT ON COLUMN prospects.response_category IS 'Catégorie IA: hot_lead, meeting_request, warm_lead, question, objection, not_interested, negative, neutral';
COMMENT ON COLUMN prospects.response_category_confidence IS 'Niveau de confiance de la catégorisation (0.0 à 1.0)';
COMMENT ON COLUMN prospects.needs_attention IS 'Flag pour le dashboard CRM - à traiter rapidement';
COMMENT ON TABLE response_categorization_history IS 'Historique des catégorisations pour audit et amélioration du modèle';

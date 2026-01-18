-- Migration 008: Ajout du scoring ICP (Ideal Customer Profile)
-- Social Prospector - ICP Extraction & Matching

-- Ajouter le champ ICP aux utilisateurs
ALTER TABLE users
ADD COLUMN IF NOT EXISTS icp_data JSONB DEFAULT NULL;

-- Ajouter les champs de score ICP aux prospects
ALTER TABLE prospects
ADD COLUMN IF NOT EXISTS icp_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS icp_score_confidence DECIMAL(3,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS icp_score_reasoning TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS icp_matches TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS icp_gaps TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS icp_recommendation VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS icp_personalization_hooks TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS icp_scored_at TIMESTAMPTZ DEFAULT NULL;

-- Index pour filtrer/trier par score ICP
CREATE INDEX IF NOT EXISTS idx_prospects_icp_score ON prospects(icp_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_prospects_icp_recommendation ON prospects(icp_recommendation);

-- Vue pour les meilleurs prospects selon l'ICP
CREATE OR REPLACE VIEW top_icp_prospects AS
SELECT
  p.*,
  CASE
    WHEN p.icp_score >= 80 THEN 'excellent'
    WHEN p.icp_score >= 60 THEN 'good'
    WHEN p.icp_score >= 40 THEN 'average'
    ELSE 'low'
  END as icp_tier
FROM prospects p
WHERE p.icp_score IS NOT NULL
  AND p.status NOT IN ('converted', 'not_interested')
ORDER BY p.icp_score DESC;

-- Vue pour les stats ICP par utilisateur
CREATE OR REPLACE VIEW icp_stats_by_user AS
SELECT
  user_id,
  COUNT(*) as total_scored,
  AVG(icp_score) as avg_score,
  COUNT(*) FILTER (WHERE icp_score >= 80) as excellent_count,
  COUNT(*) FILTER (WHERE icp_score >= 60 AND icp_score < 80) as good_count,
  COUNT(*) FILTER (WHERE icp_score >= 40 AND icp_score < 60) as average_count,
  COUNT(*) FILTER (WHERE icp_score < 40) as low_count,
  COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
  COUNT(*) FILTER (WHERE status = 'converted' AND icp_score >= 70) as high_score_converted
FROM prospects
WHERE icp_score IS NOT NULL
GROUP BY user_id;

-- Commentaires
COMMENT ON COLUMN users.icp_data IS 'Profil Client Idéal (ICP) enrichi par l''IA';
COMMENT ON COLUMN prospects.icp_score IS 'Score de correspondance avec l''ICP (0-100)';
COMMENT ON COLUMN prospects.icp_recommendation IS 'Recommandation: action_immediate, nurturing, observer, a_eviter';
COMMENT ON COLUMN prospects.icp_personalization_hooks IS 'Angles de personnalisation suggérés pour ce prospect';

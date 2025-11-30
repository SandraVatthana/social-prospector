-- Migration 004: Méthodes d'approche pour les messages
-- À exécuter dans Supabase SQL Editor

-- =====================================================
-- 1. Ajouter la colonne approach_method à messages
-- =====================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS approach_method TEXT;
-- Valeurs possibles: mini_aida, avant_apres, miroir, story_seed

-- Index pour les analytics par méthode
CREATE INDEX IF NOT EXISTS idx_messages_approach_method ON messages(approach_method);

-- =====================================================
-- 2. Créer la table approach_analytics pour les stats
-- =====================================================

CREATE TABLE IF NOT EXISTS approach_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  approach_method TEXT NOT NULL,
  month DATE NOT NULL, -- Premier jour du mois
  messages_generated INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  responses INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, approach_method, month)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_approach_analytics_user_id ON approach_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_approach_analytics_month ON approach_analytics(month);
CREATE INDEX IF NOT EXISTS idx_approach_analytics_response_rate ON approach_analytics(response_rate DESC);

-- RLS
ALTER TABLE approach_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own approach analytics"
  ON approach_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own approach analytics"
  ON approach_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own approach analytics"
  ON approach_analytics FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. Ajouter méthode préférée dans users
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_approach_method TEXT DEFAULT 'mini_aida';

-- =====================================================
-- 4. Vue pour les stats des méthodes par utilisateur
-- =====================================================

CREATE OR REPLACE VIEW user_approach_stats AS
SELECT
  user_id,
  approach_method,
  SUM(messages_sent) as total_sent,
  SUM(responses) as total_responses,
  SUM(conversions) as total_conversions,
  CASE
    WHEN SUM(messages_sent) >= 5 THEN
      ROUND((SUM(responses)::DECIMAL / SUM(messages_sent)) * 100, 1)
    ELSE NULL -- Pas assez de données
  END as response_rate,
  CASE
    WHEN SUM(responses) >= 3 THEN
      ROUND((SUM(conversions)::DECIMAL / SUM(responses)) * 100, 1)
    ELSE NULL
  END as conversion_rate
FROM approach_analytics
WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
GROUP BY user_id, approach_method
ORDER BY response_rate DESC NULLS LAST;

-- =====================================================
-- 5. Fonction pour obtenir la méthode recommandée
-- =====================================================

CREATE OR REPLACE FUNCTION get_recommended_approach(p_user_id UUID)
RETURNS TABLE (
  recommended_method TEXT,
  response_rate DECIMAL,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    approach_method,
    ROUND((SUM(responses)::DECIMAL / NULLIF(SUM(messages_sent), 0)) * 100, 1) as rate,
    CASE
      WHEN SUM(messages_sent) < 5 THEN 'Pas assez de données - essaie Mini-AIDA pour commencer'
      ELSE CONCAT('Meilleur taux de réponse (',
        ROUND((SUM(responses)::DECIMAL / SUM(messages_sent)) * 100, 1),
        '% sur ', SUM(messages_sent), ' messages)')
    END as reason_text
  FROM approach_analytics
  WHERE user_id = p_user_id
    AND month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
  GROUP BY approach_method
  HAVING SUM(messages_sent) >= 5
  ORDER BY rate DESC NULLS LAST
  LIMIT 1;

  -- Si pas de résultat, retourner mini_aida par défaut
  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'mini_aida'::TEXT,
      NULL::DECIMAL,
      'Méthode recommandée pour débuter - claire et efficace'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Grant pour la vue et fonction
-- =====================================================

GRANT SELECT ON user_approach_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_recommended_approach(UUID) TO authenticated;

-- =====================================================
-- Message de confirmation
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 004 Approach Methods terminée avec succès!';
  RAISE NOTICE 'Colonne ajoutée à messages: approach_method';
  RAISE NOTICE 'Colonne ajoutée à users: preferred_approach_method';
  RAISE NOTICE 'Table créée: approach_analytics';
  RAISE NOTICE 'Vue créée: user_approach_stats';
  RAISE NOTICE 'Fonction créée: get_recommended_approach';
END $$;

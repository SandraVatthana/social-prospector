-- Migration 003: Analytics Agence - Métriques différenciantes MA VOIX + Hooks
-- À exécuter dans Supabase SQL Editor

-- =====================================================
-- 1. Modifier la table messages pour les analytics
-- =====================================================

-- Ajouter le type de hook pour catégoriser les accroches
ALTER TABLE messages ADD COLUMN IF NOT EXISTS hook_type TEXT;
-- Types possibles: post_reference, story_reference, common_point, direct_offer, question, compliment

-- Ajouter la date/heure de réponse
ALTER TABLE messages ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ;

-- Ajouter le temps de réponse en minutes (calculé automatiquement)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER;

-- Ajouter un flag de conversion
ALTER TABLE messages ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT FALSE;

-- Ajouter la date de conversion
ALTER TABLE messages ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;

-- Créer un index pour les requêtes analytics
CREATE INDEX IF NOT EXISTS idx_messages_hook_type ON messages(hook_type);
CREATE INDEX IF NOT EXISTS idx_messages_replied_at ON messages(replied_at);
CREATE INDEX IF NOT EXISTS idx_messages_converted ON messages(converted);

-- =====================================================
-- 2. Modifier la table users pour le panier moyen
-- =====================================================

-- Ajouter le panier moyen pour calculer le ROI
ALTER TABLE users ADD COLUMN IF NOT EXISTS average_basket INTEGER DEFAULT 0;

-- =====================================================
-- 3. Créer la table agency_clients (pour plan Agence)
-- =====================================================

CREATE TABLE IF NOT EXISTS agency_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les requêtes par agence
CREATE INDEX IF NOT EXISTS idx_agency_clients_user_id ON agency_clients(user_id);

-- RLS pour agency_clients
ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own agency clients"
  ON agency_clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agency clients"
  ON agency_clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agency clients"
  ON agency_clients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agency clients"
  ON agency_clients FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. Créer la table analytics_by_client
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_by_client (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES agency_clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  prospects_added INTEGER DEFAULT 0,
  messages_generated INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  responses INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  platform TEXT, -- 'instagram' ou 'tiktok'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, client_id, date, platform)
);

-- Index pour les requêtes analytics
CREATE INDEX IF NOT EXISTS idx_analytics_by_client_user_id ON analytics_by_client(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_by_client_date ON analytics_by_client(date);
CREATE INDEX IF NOT EXISTS idx_analytics_by_client_client_id ON analytics_by_client(client_id);

-- RLS pour analytics_by_client
ALTER TABLE analytics_by_client ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own analytics"
  ON analytics_by_client FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON analytics_by_client FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
  ON analytics_by_client FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. Créer la table hook_analytics pour tracker les hooks
-- =====================================================

CREATE TABLE IF NOT EXISTS hook_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  hook_type TEXT NOT NULL,
  hook_pattern TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  response_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0,
  month DATE NOT NULL, -- Premier jour du mois
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hook_pattern, month)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_hook_analytics_user_id ON hook_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_hook_analytics_month ON hook_analytics(month);
CREATE INDEX IF NOT EXISTS idx_hook_analytics_response_rate ON hook_analytics(response_rate DESC);

-- RLS
ALTER TABLE hook_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hook analytics"
  ON hook_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hook analytics"
  ON hook_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hook analytics"
  ON hook_analytics FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. Créer la table time_analytics pour les meilleurs créneaux
-- =====================================================

CREATE TABLE IF NOT EXISTS time_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Dimanche, 1=Lundi, ..., 6=Samedi
  hour_of_day INTEGER NOT NULL, -- 0-23
  messages_sent INTEGER DEFAULT 0,
  responses INTEGER DEFAULT 0,
  response_rate DECIMAL(5,2) DEFAULT 0,
  month DATE NOT NULL, -- Premier jour du mois
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day_of_week, hour_of_day, month)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_time_analytics_user_id ON time_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_time_analytics_response_rate ON time_analytics(response_rate DESC);

-- RLS
ALTER TABLE time_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own time analytics"
  ON time_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own time analytics"
  ON time_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own time analytics"
  ON time_analytics FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 7. Fonction pour détecter automatiquement le type de hook
-- =====================================================

CREATE OR REPLACE FUNCTION detect_hook_type(message_content TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Détection basée sur des mots-clés
  IF message_content ILIKE '%j''ai vu ton post%' OR message_content ILIKE '%ton post sur%' THEN
    RETURN 'post_reference';
  ELSIF message_content ILIKE '%ta story%' OR message_content ILIKE '%tes stories%' THEN
    RETURN 'story_reference';
  ELSIF message_content ILIKE '%on a%en commun%' OR message_content ILIKE '%nous avons%en commun%' THEN
    RETURN 'common_point';
  ELSIF message_content ILIKE '%j''aide les%' OR message_content ILIKE '%je propose%' OR message_content ILIKE '%mon offre%' THEN
    RETURN 'direct_offer';
  ELSIF message_content LIKE '%?%' AND LENGTH(message_content) < 200 THEN
    RETURN 'question';
  ELSIF message_content ILIKE '%j''adore%' OR message_content ILIKE '%bravo%' OR message_content ILIKE '%super%' THEN
    RETURN 'compliment';
  ELSE
    RETURN 'other';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. Trigger pour calculer le temps de réponse
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.replied_at IS NOT NULL AND OLD.replied_at IS NULL THEN
    NEW.response_time_minutes := EXTRACT(EPOCH FROM (NEW.replied_at - NEW.sent_at)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger (si la colonne sent_at existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sent_at') THEN
    DROP TRIGGER IF EXISTS trigger_calculate_response_time ON messages;
    CREATE TRIGGER trigger_calculate_response_time
      BEFORE UPDATE ON messages
      FOR EACH ROW
      EXECUTE FUNCTION calculate_response_time();
  END IF;
END $$;

-- =====================================================
-- 9. Vue pour les KPIs globaux agence
-- =====================================================

CREATE OR REPLACE VIEW agency_kpis AS
SELECT
  user_id,
  COUNT(DISTINCT client_id) as total_clients,
  SUM(prospects_added) as total_prospects,
  SUM(messages_sent) as total_messages,
  SUM(responses) as total_responses,
  SUM(conversions) as total_conversions,
  CASE
    WHEN SUM(messages_sent) > 0
    THEN ROUND((SUM(responses)::DECIMAL / SUM(messages_sent)) * 100, 1)
    ELSE 0
  END as response_rate,
  CASE
    WHEN SUM(responses) > 0
    THEN ROUND((SUM(conversions)::DECIMAL / SUM(responses)) * 100, 1)
    ELSE 0
  END as conversion_rate
FROM analytics_by_client
WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY user_id;

-- =====================================================
-- 10. Vue pour les top hooks du mois
-- =====================================================

CREATE OR REPLACE VIEW top_hooks_monthly AS
SELECT
  user_id,
  hook_type,
  hook_pattern,
  usage_count,
  response_count,
  response_rate,
  RANK() OVER (PARTITION BY user_id ORDER BY response_rate DESC, usage_count DESC) as rank
FROM hook_analytics
WHERE month = DATE_TRUNC('month', CURRENT_DATE)
  AND usage_count >= 5; -- Minimum 5 utilisations pour être significatif

-- =====================================================
-- GRANT pour les vues
-- =====================================================

GRANT SELECT ON agency_kpis TO authenticated;
GRANT SELECT ON top_hooks_monthly TO authenticated;

-- =====================================================
-- Message de confirmation
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 003 Analytics Agence terminée avec succès!';
  RAISE NOTICE 'Tables créées: agency_clients, analytics_by_client, hook_analytics, time_analytics';
  RAISE NOTICE 'Colonnes ajoutées à messages: hook_type, replied_at, response_time_minutes, converted, converted_at';
  RAISE NOTICE 'Colonne ajoutée à users: average_basket';
END $$;

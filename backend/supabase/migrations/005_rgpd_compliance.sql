-- Migration 005: Conformité RGPD et Protection anti-abus
-- À exécuter dans Supabase SQL Editor

-- =====================================================
-- 1. Table opt_out_requests (demandes de suppression)
-- =====================================================

CREATE TABLE IF NOT EXISTS opt_out_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  reason TEXT,
  delete_existing BOOLEAN DEFAULT TRUE,
  block_future BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'pending', -- pending, processed, rejected
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  UNIQUE(platform, username)
);

-- Index pour vérification rapide avant scrape
CREATE INDEX IF NOT EXISTS idx_opt_out_platform_username ON opt_out_requests(platform, username);
CREATE INDEX IF NOT EXISTS idx_opt_out_status ON opt_out_requests(status);

-- Pas de RLS sur cette table - accès public pour soumission, admin pour traitement

-- =====================================================
-- 2. Table daily_usage (suivi quotidien)
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  prospects_scraped INTEGER DEFAULT 0,
  messages_generated INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_daily_usage_user_date ON daily_usage(user_id, date);

-- RLS
ALTER TABLE daily_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily usage"
  ON daily_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily usage"
  ON daily_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily usage"
  ON daily_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. Table admin_alerts
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL, -- quota_warning, daily_limit_streak, suspicious_activity, opt_out_request
  severity TEXT DEFAULT 'warning', -- info, warning, critical
  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_admin_alerts_unread ON admin_alerts(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_admin_alerts_type ON admin_alerts(alert_type);

-- =====================================================
-- 4. Table admin_whitelist (accès admin)
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_whitelist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin', -- admin, super_admin
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by TEXT
);

-- Ajouter Sandra comme super admin
INSERT INTO admin_whitelist (email, role, added_by)
VALUES ('sandra@myinnerquest.fr', 'super_admin', 'system')
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 5. Modifier la table users
-- =====================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

-- =====================================================
-- 6. Modifier la table prospects
-- =====================================================

ALTER TABLE prospects ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS auto_delete_at TIMESTAMPTZ;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT FALSE;

-- Index pour le job de nettoyage
CREATE INDEX IF NOT EXISTS idx_prospects_last_activity ON prospects(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_prospects_auto_delete ON prospects(auto_delete_at) WHERE auto_delete_at IS NOT NULL;

-- =====================================================
-- 7. Fonction pour mettre à jour last_activity_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_prospect_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at := NOW();
  NEW.auto_delete_at := NOW() + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur prospects
DROP TRIGGER IF EXISTS trigger_update_prospect_activity ON prospects;
CREATE TRIGGER trigger_update_prospect_activity
  BEFORE UPDATE ON prospects
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.notes IS DISTINCT FROM NEW.notes)
  EXECUTE FUNCTION update_prospect_activity();

-- =====================================================
-- 8. Fonction pour vérifier la blacklist avant insert
-- =====================================================

CREATE OR REPLACE FUNCTION check_opt_out_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si ce username est dans la liste opt-out
  IF EXISTS (
    SELECT 1 FROM opt_out_requests
    WHERE platform = NEW.platform
    AND username = NEW.username
    AND block_future = TRUE
  ) THEN
    RAISE EXCEPTION 'Ce profil a demandé à ne pas être collecté';
  END IF;

  -- Définir la date d'auto-suppression
  NEW.auto_delete_at := NOW() + INTERVAL '30 days';
  NEW.last_activity_at := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_opt_out ON prospects;
CREATE TRIGGER trigger_check_opt_out
  BEFORE INSERT ON prospects
  FOR EACH ROW
  EXECUTE FUNCTION check_opt_out_before_insert();

-- =====================================================
-- 9. Fonction pour incrémenter le daily_usage
-- =====================================================

CREATE OR REPLACE FUNCTION increment_daily_usage(
  p_user_id UUID,
  p_field TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_usage (user_id, date, prospects_scraped, messages_generated, messages_sent)
  VALUES (
    p_user_id,
    CURRENT_DATE,
    CASE WHEN p_field = 'prospects_scraped' THEN p_amount ELSE 0 END,
    CASE WHEN p_field = 'messages_generated' THEN p_amount ELSE 0 END,
    CASE WHEN p_field = 'messages_sent' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    prospects_scraped = daily_usage.prospects_scraped +
      CASE WHEN p_field = 'prospects_scraped' THEN p_amount ELSE 0 END,
    messages_generated = daily_usage.messages_generated +
      CASE WHEN p_field = 'messages_generated' THEN p_amount ELSE 0 END,
    messages_sent = daily_usage.messages_sent +
      CASE WHEN p_field = 'messages_sent' THEN p_amount ELSE 0 END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. Fonction pour créer une alerte admin
-- =====================================================

CREATE OR REPLACE FUNCTION create_admin_alert(
  p_user_id UUID,
  p_alert_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'warning',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO admin_alerts (user_id, alert_type, title, message, severity, metadata)
  VALUES (p_user_id, p_alert_type, p_title, p_message, p_severity, p_metadata)
  RETURNING id INTO alert_id;

  RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. Fonction pour vérifier les quotas et alerter
-- =====================================================

CREATE OR REPLACE FUNCTION check_usage_and_alert()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  monthly_usage INTEGER;
  daily_streak INTEGER;
BEGIN
  -- Pour chaque utilisateur actif
  FOR user_record IN
    SELECT u.id, u.email, u.plan,
           COALESCE(
             CASE u.plan
               WHEN 'solo' THEN 500
               WHEN 'agence' THEN 2000
               WHEN 'agency_plus' THEN 10000
               ELSE 50
             END, 50
           ) as monthly_limit
    FROM users u
    WHERE u.is_suspended = FALSE OR u.is_suspended IS NULL
  LOOP
    -- Calculer usage mensuel
    SELECT COALESCE(SUM(prospects_scraped), 0) INTO monthly_usage
    FROM daily_usage
    WHERE user_id = user_record.id
    AND date >= DATE_TRUNC('month', CURRENT_DATE);

    -- Alerte si > 80% du quota en moins de 7 jours
    IF monthly_usage > user_record.monthly_limit * 0.8 THEN
      -- Vérifier si l'alerte n'existe pas déjà ce mois
      IF NOT EXISTS (
        SELECT 1 FROM admin_alerts
        WHERE user_id = user_record.id
        AND alert_type = 'quota_warning'
        AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
      ) THEN
        PERFORM create_admin_alert(
          user_record.id,
          'quota_warning',
          'Usage élevé détecté',
          format('%s a utilisé %s%% de son quota mensuel', user_record.email, ROUND(monthly_usage::DECIMAL / user_record.monthly_limit * 100)),
          'warning',
          jsonb_build_object('usage', monthly_usage, 'limit', user_record.monthly_limit)
        );
      END IF;
    END IF;

    -- Vérifier les 3 jours consécutifs à la limite quotidienne
    SELECT COUNT(*) INTO daily_streak
    FROM daily_usage
    WHERE user_id = user_record.id
    AND date >= CURRENT_DATE - INTERVAL '3 days'
    AND prospects_scraped >=
      CASE user_record.plan
        WHEN 'solo' THEN 45  -- 90% de 50
        WHEN 'agence' THEN 135  -- 90% de 150
        WHEN 'agency_plus' THEN 450  -- 90% de 500
        ELSE 9  -- 90% de 10
      END;

    IF daily_streak >= 3 THEN
      IF NOT EXISTS (
        SELECT 1 FROM admin_alerts
        WHERE user_id = user_record.id
        AND alert_type = 'daily_limit_streak'
        AND created_at >= CURRENT_DATE - INTERVAL '7 days'
      ) THEN
        PERFORM create_admin_alert(
          user_record.id,
          'daily_limit_streak',
          'Limite quotidienne atteinte 3 jours de suite',
          format('%s atteint sa limite quotidienne depuis 3 jours', user_record.email),
          'warning'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 12. Fonction pour anonymiser un prospect
-- =====================================================

CREATE OR REPLACE FUNCTION anonymize_prospect(p_prospect_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE prospects
  SET
    username = 'anon_' || SUBSTRING(MD5(username || id::TEXT) FOR 8),
    full_name = NULL,
    bio = NULL,
    avatar_url = NULL,
    profile_pic_url = NULL,
    email = NULL,
    website = NULL,
    is_anonymized = TRUE
  WHERE id = p_prospect_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. Fonction pour traiter une demande opt-out
-- =====================================================

CREATE OR REPLACE FUNCTION process_opt_out_request(p_request_id UUID, p_admin_id UUID)
RETURNS void AS $$
DECLARE
  req RECORD;
BEGIN
  -- Récupérer la demande
  SELECT * INTO req FROM opt_out_requests WHERE id = p_request_id;

  IF req IS NULL THEN
    RAISE EXCEPTION 'Demande non trouvée';
  END IF;

  -- Si suppression demandée, anonymiser tous les prospects correspondants
  IF req.delete_existing THEN
    UPDATE prospects
    SET
      username = 'anon_' || SUBSTRING(MD5(username || id::TEXT) FOR 8),
      full_name = NULL,
      bio = NULL,
      avatar_url = NULL,
      profile_pic_url = NULL,
      email = NULL,
      website = NULL,
      is_anonymized = TRUE
    WHERE platform = req.platform AND username = req.username;
  END IF;

  -- Marquer comme traité
  UPDATE opt_out_requests
  SET
    status = 'processed',
    processed_at = NOW(),
    processed_by = p_admin_id
  WHERE id = p_request_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 14. Vue pour le dashboard admin
-- =====================================================

CREATE OR REPLACE VIEW admin_dashboard AS
SELECT
  (SELECT COUNT(*) FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as new_users_this_month,
  (SELECT COUNT(*) FROM users WHERE plan != 'free') as paying_users,
  (SELECT COUNT(*) FROM opt_out_requests WHERE status = 'pending') as pending_opt_outs,
  (SELECT COUNT(*) FROM admin_alerts WHERE is_read = FALSE) as unread_alerts,
  (SELECT SUM(prospects_scraped) FROM daily_usage WHERE date = CURRENT_DATE) as prospects_today,
  (SELECT SUM(messages_generated) FROM daily_usage WHERE date = CURRENT_DATE) as messages_today;

-- =====================================================
-- 15. Vue pour les top utilisateurs
-- =====================================================

CREATE OR REPLACE VIEW admin_top_users AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.plan,
  COALESCE(SUM(d.prospects_scraped), 0) as monthly_prospects,
  COALESCE(SUM(d.messages_generated), 0) as monthly_messages,
  CASE u.plan
    WHEN 'solo' THEN 500
    WHEN 'agence' THEN 2000
    WHEN 'agency_plus' THEN 10000
    ELSE 50
  END as monthly_limit
FROM users u
LEFT JOIN daily_usage d ON u.id = d.user_id
  AND d.date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY u.id, u.email, u.full_name, u.plan
ORDER BY monthly_prospects DESC
LIMIT 20;

-- =====================================================
-- GRANT permissions
-- =====================================================

GRANT SELECT ON admin_dashboard TO authenticated;
GRANT SELECT ON admin_top_users TO authenticated;
GRANT EXECUTE ON FUNCTION increment_daily_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_usage_and_alert() TO authenticated;

-- =====================================================
-- Message de confirmation
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 005 RGPD Compliance terminée avec succès!';
  RAISE NOTICE 'Tables créées: opt_out_requests, daily_usage, admin_alerts, admin_whitelist';
  RAISE NOTICE 'Colonnes ajoutées à users: terms_accepted_at, privacy_accepted_at, is_suspended, suspended_reason, suspended_at';
  RAISE NOTICE 'Colonnes ajoutées à prospects: last_activity_at, auto_delete_at, is_anonymized';
  RAISE NOTICE 'Fonctions créées: check_opt_out_before_insert, increment_daily_usage, create_admin_alert, check_usage_and_alert, anonymize_prospect, process_opt_out_request';
END $$;

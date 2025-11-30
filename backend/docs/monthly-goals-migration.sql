-- ============================================
-- MIGRATION: Ajout des objectifs mensuels
-- Social Prospector
-- ============================================

-- Ajouter les colonnes d'objectifs mensuels à la table users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS monthly_goal_responses INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS monthly_goal_meetings INTEGER DEFAULT 5;

-- Commentaires pour documentation
COMMENT ON COLUMN users.monthly_goal_responses IS 'Objectif mensuel de réponses à obtenir';
COMMENT ON COLUMN users.monthly_goal_meetings IS 'Objectif mensuel de RDV à décrocher';

-- Index pour les requêtes d'analytics (optionnel)
-- CREATE INDEX IF NOT EXISTS idx_users_goals ON users(monthly_goal_responses, monthly_goal_meetings);

-- ============================================
-- Note: Pour exécuter cette migration sur Supabase:
-- 1. Aller dans le Dashboard Supabase
-- 2. SQL Editor > New Query
-- 3. Coller ce script
-- 4. Exécuter
-- ============================================

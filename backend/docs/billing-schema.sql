-- ============================================
-- Sprint 8 — Billing
-- Colonnes à ajouter à la table users
-- ============================================

-- Ajouter les colonnes pour Lemon Squeezy
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lemon_customer_id VARCHAR(255);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_users_subscription_id ON users(subscription_id);
CREATE INDEX IF NOT EXISTS idx_users_lemon_customer_id ON users(lemon_customer_id);

-- Commentaires
COMMENT ON COLUMN users.plan IS 'Plan actuel: free, solo, agence, agency_plus';
COMMENT ON COLUMN users.subscription_id IS 'ID abonnement Lemon Squeezy';
COMMENT ON COLUMN users.subscription_status IS 'Statut: active, on_trial, cancelled, past_due, expired';
COMMENT ON COLUMN users.subscription_ends_at IS 'Date de fin de période ou prochaine facturation';
COMMENT ON COLUMN users.lemon_customer_id IS 'ID client Lemon Squeezy pour accès portail';

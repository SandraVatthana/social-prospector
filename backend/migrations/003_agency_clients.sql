-- Migration: Mode Agence Multi-Clients
-- Description: Ajoute la table agency_clients et modifie les tables existantes

-- 1. Créer la table agency_clients
CREATE TABLE IF NOT EXISTS agency_clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  onboarding_data JSONB,
  voice_profile_id UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_agency_clients_user ON agency_clients(user_id);

-- 2. Modifier voice_profiles pour lier à un client (nullable car peut être pour l'utilisateur lui-même)
ALTER TABLE voice_profiles ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES agency_clients(id) ON DELETE CASCADE;

-- 3. Modifier prospects pour lier à un client
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES agency_clients(id) ON DELETE CASCADE;

-- 4. Modifier messages pour lier à un client
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES agency_clients(id) ON DELETE CASCADE;

-- 5. Ajouter la foreign key pour voice_profile_id dans agency_clients
ALTER TABLE agency_clients
  ADD CONSTRAINT fk_agency_clients_voice_profile
  FOREIGN KEY (voice_profile_id)
  REFERENCES voice_profiles(id)
  ON DELETE SET NULL;

-- 6. Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_agency_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agency_clients_updated_at ON agency_clients;
CREATE TRIGGER trigger_agency_clients_updated_at
  BEFORE UPDATE ON agency_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_clients_updated_at();

-- 7. RLS Policies pour agency_clients
ALTER TABLE agency_clients ENABLE ROW LEVEL SECURITY;

-- Policy: Les utilisateurs ne peuvent voir que leurs propres clients
CREATE POLICY "Users can view own clients" ON agency_clients
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer des clients
CREATE POLICY "Users can create clients" ON agency_clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent modifier leurs propres clients
CREATE POLICY "Users can update own clients" ON agency_clients
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent supprimer leurs propres clients
CREATE POLICY "Users can delete own clients" ON agency_clients
  FOR DELETE USING (auth.uid() = user_id);

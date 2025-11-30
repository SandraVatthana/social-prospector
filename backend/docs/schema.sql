-- ============================================
-- Social Prospector - Database Schema
-- À exécuter dans Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  plan VARCHAR(50) DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_data JSONB,
  monthly_goal_responses INTEGER DEFAULT 50,
  monthly_goal_meetings INTEGER DEFAULT 5,
  subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  subscription_ends_at TIMESTAMPTZ,
  lemon_customer_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VOICE PROFILES TABLE (MA VOIX)
-- ============================================
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) DEFAULT 'Mon style',
  tone VARCHAR(100), -- amical, professionnel, décontracté, etc.
  style VARCHAR(100), -- court, détaillé, emoji, etc.
  signature TEXT, -- phrase signature
  examples TEXT, -- exemples de messages
  keywords TEXT[], -- mots à utiliser
  avoid_words TEXT[], -- mots à éviter
  target_audience TEXT, -- description de la cible
  offer_description TEXT, -- description de l'offre
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SOCIAL ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS social_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- instagram, tiktok
  username VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_connected BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, username)
);

-- ============================================
-- SEARCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query VARCHAR(500) NOT NULL,
  platform VARCHAR(50) DEFAULT 'instagram',
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROSPECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  full_name VARCHAR(255),
  bio TEXT,
  avatar_url TEXT,
  followers INTEGER,
  following INTEGER,
  posts_count INTEGER,
  engagement DECIMAL(5,2),
  score INTEGER,
  status VARCHAR(50) DEFAULT 'new', -- new, contacted, replied, converted, ignored
  tags TEXT[],
  notes TEXT,
  profile_data JSONB, -- données complètes du profil
  recent_posts JSONB, -- derniers posts analysés
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, username)
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prospect_id UUID REFERENCES prospects(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, replied
  generated_by VARCHAR(50) DEFAULT 'ai', -- ai, manual
  hook_used TEXT,
  sent_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANALYTICS DAILY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  dms_sent INTEGER DEFAULT 0,
  dms_replied INTEGER DEFAULT 0,
  searches_made INTEGER DEFAULT 0,
  prospects_added INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);
CREATE INDEX IF NOT EXISTS idx_voice_profiles_user ON voice_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_user ON social_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_user ON searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_created ON searches(created_at);
CREATE INDEX IF NOT EXISTS idx_prospects_user ON prospects(user_id);
CREATE INDEX IF NOT EXISTS idx_prospects_status ON prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_platform ON prospects(platform);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_prospect ON messages(prospect_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics_daily(user_id, date);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
CREATE POLICY users_policy ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY voice_profiles_policy ON voice_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY social_accounts_policy ON social_accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY searches_policy ON searches FOR ALL USING (auth.uid() = user_id);
CREATE POLICY prospects_policy ON prospects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY messages_policy ON messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY analytics_daily_policy ON analytics_daily FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER voice_profiles_updated_at BEFORE UPDATE ON voice_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER prospects_updated_at BEFORE UPDATE ON prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

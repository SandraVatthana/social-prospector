-- ============================================
-- Migration: Add missing columns to voice_profiles
-- Run this in Supabase SQL Editor
-- ============================================

-- Add profil_json column to store full voice profile as JSONB
ALTER TABLE voice_profiles
ADD COLUMN IF NOT EXISTS profil_json JSONB;

-- Add source column to track where the profile came from
ALTER TABLE voice_profiles
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';

-- Comment for clarity
COMMENT ON COLUMN voice_profiles.profil_json IS 'Full voice profile data as JSON (from onboarding or analysis)';
COMMENT ON COLUMN voice_profiles.source IS 'Source of the profile: onboarding, text_analysis, manual';

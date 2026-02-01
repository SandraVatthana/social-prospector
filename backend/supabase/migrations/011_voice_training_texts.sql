-- ============================================
-- Migration: Add training_texts column to voice_profiles
-- ============================================

-- Add training_texts column to store user's text samples for voice analysis
ALTER TABLE voice_profiles
  ADD COLUMN IF NOT EXISTS training_texts JSONB DEFAULT '[]';

-- Add comment
COMMENT ON COLUMN voice_profiles.training_texts IS 'Array of text samples used for voice profile analysis';

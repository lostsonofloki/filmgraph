-- Phase 5: AI Integration Setup
-- Run this in Supabase SQL Editor to enable AI features

-- Add AI toggle column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_ai_enabled ON profiles(ai_enabled);

-- Comment explaining the column
COMMENT ON COLUMN profiles.ai_enabled IS 'User opt-in for AI-powered movie recommendations via Gemini API';

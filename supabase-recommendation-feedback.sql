-- Phase 5: AI Recommendation Feedback Table
-- Run this in Supabase SQL Editor to enable feedback tracking

-- Create recommendation_feedback table
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  tmdb_id INTEGER,
  is_liked BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON recommendation_feedback(user_id);

-- Add index for sorting by date
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON recommendation_feedback(created_at DESC);

-- Enable Row Level Security
ALTER TABLE recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own feedback
CREATE POLICY "Users can view own feedback"
  ON recommendation_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON recommendation_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy: Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON recommendation_feedback
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comment explaining the table
COMMENT ON TABLE recommendation_feedback IS 'User feedback on AI-generated movie recommendations';
COMMENT ON COLUMN recommendation_feedback.is_liked IS 'True for thumbs up, false for thumbs down';

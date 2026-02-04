-- ============================================
-- Comment Interactions Table
-- Track strategic comments for follow-up
-- ============================================

CREATE TABLE IF NOT EXISTS comment_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Post author info
  platform VARCHAR(50) NOT NULL DEFAULT 'linkedin',
  author_name VARCHAR(255),
  author_headline TEXT,
  post_url TEXT,
  post_content TEXT,

  -- Comment info
  comment_text TEXT,
  commented_at TIMESTAMPTZ DEFAULT NOW(),

  -- Tracking
  icp_match BOOLEAN DEFAULT FALSE,
  follow_up_status VARCHAR(50) DEFAULT 'pending', -- pending, dm_sent, converted, ignored
  follow_up_at TIMESTAMPTZ,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comment_interactions_user ON comment_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_interactions_status ON comment_interactions(follow_up_status);
CREATE INDEX IF NOT EXISTS idx_comment_interactions_commented_at ON comment_interactions(commented_at);
CREATE INDEX IF NOT EXISTS idx_comment_interactions_icp ON comment_interactions(icp_match);

-- RLS Policies
ALTER TABLE comment_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own comment interactions"
  ON comment_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own comment interactions"
  ON comment_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comment interactions"
  ON comment_interactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comment interactions"
  ON comment_interactions FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE TRIGGER update_comment_interactions_updated_at
  BEFORE UPDATE ON comment_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

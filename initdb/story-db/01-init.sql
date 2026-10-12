CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS story_choices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  text VARCHAR(255) NOT NULL,
  next_story_id UUID REFERENCES stories(id) ON DELETE SET NULL,
  position INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_choices_story ON story_choices (story_id);
CREATE INDEX IF NOT EXISTS idx_stories_author ON stories (author_id);
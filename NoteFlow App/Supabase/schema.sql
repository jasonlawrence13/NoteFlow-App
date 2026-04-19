-- NoteFlow Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- If you already ran the previous schema, run only the ALTER TABLE section at the bottom

CREATE TABLE IF NOT EXISTS notes (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date              date,
  people            text DEFAULT '',
  topic             text DEFAULT '',
  body              text DEFAULT '',
  category          text DEFAULT 'meetings',
  follow_ups        jsonb DEFAULT '[]'::jsonb,
  source            text DEFAULT 'manual',
  teams_reviewed    boolean DEFAULT true,
  teams_meeting_id  text,
  created_at        timestamptz DEFAULT now(),
  edited_at         timestamptz
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON notes
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS notes_created_at_idx   ON notes (created_at DESC);
CREATE INDEX IF NOT EXISTS notes_category_idx     ON notes (category);
CREATE INDEX IF NOT EXISTS notes_source_idx       ON notes (source);
CREATE INDEX IF NOT EXISTS notes_teams_review_idx ON notes (teams_reviewed) WHERE source = 'teams';

-- IF YOU ALREADY RAN THE PREVIOUS SCHEMA, run just these lines instead:
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS teams_reviewed boolean DEFAULT true;
-- ALTER TABLE notes ADD COLUMN IF NOT EXISTS teams_meeting_id text;
-- CREATE INDEX IF NOT EXISTS notes_source_idx ON notes (source);
-- CREATE INDEX IF NOT EXISTS notes_teams_review_idx ON notes (teams_reviewed) WHERE source = 'teams';

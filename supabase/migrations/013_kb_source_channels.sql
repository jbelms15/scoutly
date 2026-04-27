-- Migration 013: Source provenance + kb_channels
-- Adds source/source_notes/needs_review to all kb_* tables.
-- Creates kb_channels with 6 entries from Benedikt deck (page 13).
-- Audits all existing records and tags with appropriate source.

-- ─── SOURCE COLUMNS: all kb_* tables ────────────────────────────────────────────

ALTER TABLE kb_icp_segments
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

ALTER TABLE kb_geographic_priorities
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

ALTER TABLE kb_modules
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

ALTER TABLE kb_proof_points
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

ALTER TABLE kb_competitors
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

ALTER TABLE kb_pain_points
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

ALTER TABLE kb_objections
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

ALTER TABLE kb_framing_rules
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

ALTER TABLE kb_conversation_patterns
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

ALTER TABLE kb_copy_preferences
  ADD COLUMN IF NOT EXISTS source        text DEFAULT 'AI_INFERRED',
  ADD COLUMN IF NOT EXISTS source_notes  text,
  ADD COLUMN IF NOT EXISTS needs_review  boolean NOT NULL DEFAULT false;

-- ─── CREATE kb_channels ──────────────────────────────────────────────────────────

CREATE TABLE kb_channels (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_name         text    NOT NULL,
  description          text,
  covers_what          text,
  primary_competitors  text[]  DEFAULT '{}',
  differentiation_note text,
  applies_to_segments  text[]  DEFAULT '{}',
  active               boolean NOT NULL DEFAULT true,
  source               text    NOT NULL DEFAULT 'AI_INFERRED',
  source_notes         text,
  needs_review         boolean NOT NULL DEFAULT false,
  sort_order           int     NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kb_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_only" ON kb_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- AUDIT: Tag all existing records with their source
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── kb_icp_segments ────────────────────────────────────────────────────────────
-- Core segments are from Benedikt deck; enhanced fields (framing_rule labels,
-- target_title_array, do_not_target_titles) are AI_INFERRED.

UPDATE kb_icp_segments SET
  source       = 'BENEDIKT_TRAINING_DECK_2026_04_27',
  source_notes = 'Core segment definitions (Rights Holder, Brand, Agency, Club & Team) are from Benedikt training deck. framing_rule labels (ROI_FIRST/REVENUE_GROWTH/EFFICIENCY/VISIBILITY) differ from Benedikt deck labels (PRE_EDUCATED_SWITCH/DISCOVERY_CATEGORY/DISCOVERY_INFRASTRUCTURE/PRE_EDUCATED_UPGRADE) — AI_INFERRED, needs correction. target_title_array and do_not_target_titles are AI_INFERRED.',
  needs_review = true;

-- ─── kb_geographic_priorities ───────────────────────────────────────────────────
-- P1/P2/P3 tier structure referenced in deck but country lists and multipliers
-- are AI_INFERRED.

UPDATE kb_geographic_priorities SET
  source       = 'AI_INFERRED',
  source_notes = 'P1/P2/P3 tier structure referenced in Benedikt deck; specific country lists, region labels, and score multipliers (×1.2/×1.0/×0.5) are AI_INFERRED.',
  needs_review = true;

-- ─── kb_modules (Shikenso products) ────────────────────────────────────────────
-- Sports Analytics, Esports Analytics, Campaign — from Shikenso website.

UPDATE kb_modules SET
  source       = 'SHIKENSO_WEBSITE',
  source_notes = 'Products directly from shikenso.com product pages.',
  needs_review = false;

-- ─── kb_proof_points ────────────────────────────────────────────────────────────
-- Source unknown — seeded from earlier migration, not verified against deck.

UPDATE kb_proof_points SET
  source       = 'PENDING_CONFIRMATION',
  source_notes = 'Seeded from earlier migration; not verified against Benedikt deck or Shikenso website. Review with Benedikt.',
  needs_review = true;

-- ─── kb_competitors ─────────────────────────────────────────────────────────────
-- Competitor names are real but positioning notes and differentiation are AI_INFERRED.

UPDATE kb_competitors SET
  source       = 'PENDING_CONFIRMATION',
  source_notes = 'Competitor names from known market; positioning notes and Shikenso differentiation text are AI_INFERRED. Review with Benedikt.',
  needs_review = true;

-- ─── kb_pain_points ─────────────────────────────────────────────────────────────
-- Benedikt deck listed 6 universal pains. These 18 detailed points are AI_INFERRED.

UPDATE kb_pain_points SET
  source       = 'AI_INFERRED',
  source_notes = 'Benedikt deck lists 6 universal pain categories: "We can''t prove it works", "Our measurement is incomplete", "We pay too much for too little", "Reporting is too slow", "It''s a black box", "Four vendors. One report." These 18 detailed pain points are AI_INFERRED and do not match Benedikt''s exact formulation.',
  needs_review = true;

-- ─── kb_objections ──────────────────────────────────────────────────────────────
-- Core objection categories referenced in deck; specific scripts are AI_INFERRED.

UPDATE kb_objections SET
  source       = 'AI_INFERRED',
  source_notes = 'Core objection categories referenced in Benedikt deck; specific reframes, scripts, and follow-up questions are AI_INFERRED and require review with Benedikt.',
  needs_review = true;

-- ─── kb_framing_rules ───────────────────────────────────────────────────────────
-- Labels are WRONG — Benedikt uses different labels.

UPDATE kb_framing_rules SET
  source       = 'AI_INFERRED',
  source_notes = 'IMPORTANT: Benedikt deck uses PRE_EDUCATED_SWITCH, DISCOVERY_CATEGORY, DISCOVERY_INFRASTRUCTURE, PRE_EDUCATED_UPGRADE. Current labels (ROI_FIRST/REVENUE_GROWTH/EFFICIENCY/VISIBILITY) are AI_INFERRED and must be corrected before use in production prompts.',
  needs_review = true;

-- ─── kb_conversation_patterns ───────────────────────────────────────────────────
-- Objection Handling (Acknowledge → Reframe → Next-step) is from Benedikt deck.
-- Other patterns are AI_INFERRED.

UPDATE kb_conversation_patterns SET
  source       = 'BENEDIKT_TRAINING_DECK_2026_04_27',
  source_notes = 'Acknowledge → Reframe → Next-step framework from Benedikt training deck.',
  needs_review = false
WHERE pattern_type = 'OBJECTION';

UPDATE kb_conversation_patterns SET
  source       = 'AI_INFERRED',
  source_notes = 'This pattern was not explicitly specified in Benedikt deck and is AI_INFERRED. Benedikt only documented the Acknowledge → Reframe → Next-step (OBJECTION) pattern.',
  needs_review = true
WHERE pattern_type != 'OBJECTION';

-- ─── kb_copy_preferences ────────────────────────────────────────────────────────
-- Seeded from earlier migration, not verified against any authoritative source.

UPDATE kb_copy_preferences SET
  source       = 'AI_INFERRED',
  source_notes = 'Copy preferences seeded from earlier migration. Tone, words, and style rules are AI_INFERRED and require review with Joanna/Benedikt.',
  needs_review = true;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED kb_channels (6 entries — verbatim from Benedikt deck, page 13)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO kb_channels (channel_name, description, covers_what, primary_competitors, differentiation_note, source, source_notes, needs_review, sort_order) VALUES
('Video / Broadcast',
  'TV, streaming, simulcasts. Logo detection, share-of-screen, brand-recall scoring.',
  'Logo appearances, screen time, brand recall across TV and streaming feeds.',
  ARRAY['Nielsen','Hookit'],
  'vs Nielsen, Hookit',
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'Benedikt deck, page 13, Channel 1 of 6', false, 1),

('Social',
  'Posts, reels, stories, comments. Mentions, engagement, share-of-voice across paid + organic.',
  'Brand mentions, reach, engagement rate, share-of-voice across all major social platforms.',
  ARRAY['Blinkfire','Zoomph'],
  'vs Blinkfire, Zoomph',
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'Benedikt deck, page 13, Channel 2 of 6', false, 2),

('Audio',
  'Commentary, podcasts, live streams. 200+ languages. Sponsor mentions in spoken word.',
  'Spoken brand mentions across commentary, podcasts, and live audio streams in 200+ languages.',
  ARRAY[]::text[],
  'Almost no competitor covers audio measurement at this depth',
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'Benedikt deck, page 13, Channel 3 of 6', false, 3),

('On-site / LED',
  'In-stadium boards, perimeter LEDs, hospitality assets. Match-day visibility.',
  'Physical brand placements at events — LED boards, perimeter signage, hospitality branding.',
  ARRAY['Manual / in-house spreadsheets'],
  'vs manual / in-house spreadsheets',
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'Benedikt deck, page 13, Channel 4 of 6', false, 4),

('Print / Press',
  'Press, magazines, programmes. Article mentions, ad placements, screenshot proof.',
  'Brand appearances in printed and digital press, trade publications, and event programmes.',
  ARRAY['Iris','Manual clipping'],
  'vs Iris, manual clipping',
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'Benedikt deck, page 13, Channel 5 of 6', false, 5),

('Chat',
  'Twitch, Kick, YouTube live chat. Sponsor mentions in real-time chat streams.',
  'Real-time brand mentions in live chat streams across Twitch, Kick, and YouTube.',
  ARRAY[]::text[],
  'Almost no competitor covers live chat measurement',
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'Benedikt deck, page 13, Channel 6 of 6', false, 6);

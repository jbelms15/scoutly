-- Migration 014: KB Rebuild Part A
-- Source: SDR-0-README.md, SDR-1-ICP.md (Benedikt Becker, 27 Apr 2026)
-- Schema extensions + archive existing AI-inferred content + insert authoritative records

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART A1: ADD archived COLUMN TO ALL kb_* TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE kb_icp_segments          ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_geographic_priorities  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_modules               ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_channels              ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_proof_points          ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_competitors           ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_pain_points           ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_objections            ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_framing_rules         ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_conversation_patterns ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_copy_preferences      ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
ALTER TABLE kb_signal_keywords       ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART A2: SCHEMA EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- kb_icp_segments — rich content columns
ALTER TABLE kb_icp_segments
  ADD COLUMN IF NOT EXISTS one_line_summary              text,
  ADD COLUMN IF NOT EXISTS typical_deal_pattern         text,
  ADD COLUMN IF NOT EXISTS why_they_buy_us_long_form    text,
  ADD COLUMN IF NOT EXISTS switch_story_legs            text[],
  ADD COLUMN IF NOT EXISTS influencer_titles            text[],
  ADD COLUMN IF NOT EXISTS influencer_titles_notes      text,
  ADD COLUMN IF NOT EXISTS specialist_titles            text[],
  ADD COLUMN IF NOT EXISTS specialist_titles_notes      text,
  ADD COLUMN IF NOT EXISTS default_first_touch_titles   text[],
  ADD COLUMN IF NOT EXISTS do_not_target_notes          text,
  ADD COLUMN IF NOT EXISTS c_suite_note                 text,
  ADD COLUMN IF NOT EXISTS enrichment_caveat            text,
  ADD COLUMN IF NOT EXISTS two_buyer_profiles           text,
  ADD COLUMN IF NOT EXISTS second_call_discovery_question text,
  ADD COLUMN IF NOT EXISTS esports_outbound_rule        text,
  ADD COLUMN IF NOT EXISTS recommended_modules          text[];

-- kb_geographic_priorities — long-form rationale
ALTER TABLE kb_geographic_priorities
  ADD COLUMN IF NOT EXISTS priority_rationale text;

-- kb_framing_rules — authoritative content columns
ALTER TABLE kb_framing_rules
  ADD COLUMN IF NOT EXISTS rule_label      text,
  ADD COLUMN IF NOT EXISTS starting_state  text,
  ADD COLUMN IF NOT EXISTS selling_motion  text,
  ADD COLUMN IF NOT EXISTS copy_implication text;

-- kb_objections — verbatim phrases + escalation
ALTER TABLE kb_objections
  ADD COLUMN IF NOT EXISTS borrow_phrases      text[],
  ADD COLUMN IF NOT EXISTS escalation_path     text,
  ADD COLUMN IF NOT EXISTS additional_context  text;

-- kb_pain_points — prospect language + categorisation
ALTER TABLE kb_pain_points
  ADD COLUMN IF NOT EXISTS prospect_language text,
  ADD COLUMN IF NOT EXISTS borrow_phrases    text[],
  ADD COLUMN IF NOT EXISTS pain_category     text;

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART A3: CREATE NEW TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS kb_customer_references (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name        text    NOT NULL,
  module_or_pattern    text,
  deal_shape           text,
  when_to_reference    text,
  full_description     text,
  applicable_segments  text[]  DEFAULT '{}',
  source               text    NOT NULL DEFAULT 'AI_INFERRED',
  source_notes         text,
  needs_review         boolean NOT NULL DEFAULT false,
  archived             boolean NOT NULL DEFAULT false,
  active               boolean NOT NULL DEFAULT true,
  sort_order           int     NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kb_deal_patterns (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment                 text NOT NULL,
  entry_pattern           text NOT NULL,
  pattern_implications    text,
  reference_customer      text,
  timeline                text,
  unusual_signals         text,
  source                  text NOT NULL DEFAULT 'AI_INFERRED',
  source_notes            text,
  needs_review            boolean NOT NULL DEFAULT false,
  archived                boolean NOT NULL DEFAULT false,
  active                  boolean NOT NULL DEFAULT true,
  sort_order              int     NOT NULL DEFAULT 0,
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kb_customer_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_deal_patterns        ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_only" ON kb_customer_references FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_only" ON kb_deal_patterns        FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART A4: ARCHIVE EXISTING RECORDS
-- kb_copy_preferences NOT archived — they contain Joanna's voice / sign-off
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE kb_icp_segments          SET archived = true;
UPDATE kb_geographic_priorities  SET archived = true;
UPDATE kb_modules               SET archived = true;
UPDATE kb_channels              SET archived = true;
UPDATE kb_proof_points          SET archived = true;
UPDATE kb_competitors           SET archived = true;
UPDATE kb_pain_points           SET archived = true;
UPDATE kb_objections            SET archived = true;
UPDATE kb_framing_rules         SET archived = true;
UPDATE kb_conversation_patterns SET archived = true;
-- kb_copy_preferences: leave active (user-confirmed voice/sign-off)

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART A5: INSERT 3 GEOGRAPHIC PRIORITIES (SDR-1-ICP.md)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO kb_geographic_priorities
  (tier_name, tier_label, countries, regions, score_multiplier, rationale, priority_rationale,
   source, source_notes, needs_review, archived, sort_order)
VALUES
('P1', 'Core Markets — Lead here',
  ARRAY['Germany','Austria','Switzerland','Netherlands','Belgium'],
  ARRAY['DACH','Benelux'],
  1.2,
  'Where our reference logos are densest and where our German-language muscle wins. Strongest brand recognition.',
  'DACH first (Germany > Austria > Switzerland), then Benelux (Netherlands, Belgium). Reference customer concentration is highest here. German-language outbound capability is a competitive advantage.',
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md, Geographic Priority section', false, false, 1),

('P2', 'Open Territory',
  ARRAY['United States','Canada','United Kingdom','France','Italy','Spain','Portugal','Sweden','Norway','Denmark','Finland','United Arab Emirates','Saudi Arabia','Qatar'],
  ARRAY['North America','UK','Western Europe','Southern Europe','Nordics','MENA'],
  1.0,
  'Real opportunity, longer cycles. Expect ''who are you?'' friction. Lead with reference customers in-region.',
  'Open territory but expect longer sales cycles and more ''who are you?'' friction. Lead with reference customers in-region.',
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md, Geographic Priority section', false, false, 2),

('P3', 'Opportunistic Only',
  ARRAY['Poland','Czech Republic','Hungary','Brazil','Argentina','Mexico','Japan','South Korea','Singapore','Australia','China','India'],
  ARRAY['CEE','LATAM','APAC ex-MENA'],
  0.5,
  'Only if there''s an exceptional trigger or warm intro. Don''t burn outbound hours here.',
  'Only work P3 accounts if there is an exceptional trigger or warm intro. Otherwise focus outbound time on P1 and P2.',
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md, Geographic Priority section', false, false, 3);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART A6: INSERT 4 FRAMING RULES (SDR-0-README.md)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO kb_framing_rules
  (rule_name, rule_label, target_segment, core_frame, starting_state, selling_motion, copy_implication,
   source, source_notes, needs_review, archived, sort_order)
VALUES
('PRE_EDUCATED_SWITCH',
 'Pre-Educated · Sell the SWITCH',
 'Rights Holder',
 'Already have a measurement tool — sell the switch, not the category.',
 'Already have a measurement tool — sport has been measured for a hundred years.',
 'Sell the switch, not the category. Lead with what their incumbent isn''t doing.',
 'Never explain what sponsorship measurement is. Assume they have a vendor (likely Nielsen or Blinkfire) and reference the switch driver: speed, breadth, methodology parity.',
 'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-0-README.md, framing rule matrix', false, false, 1),

('PRE_EDUCATED_UPGRADE',
 'Pre-Educated · Sell the UPGRADE',
 'Team',
 'Often DIY in spreadsheets — sell the upgrade and the time saved.',
 'Often DIY in spreadsheets — and self-aware about it.',
 'Sell the upgrade and the time saved.',
 'Acknowledge their manual process; position as upgrade, not replacement. Reference: ''Manual sponsor reporting eats their week — we automate it.''',
 'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-0-README.md, framing rule matrix', false, false, 2),

('DISCOVERY_CATEGORY',
 'Discovery Mode · Sell the CATEGORY',
 'Brand',
 'Often don''t know what''s possible — sell the category, measurement is the wedge.',
 'Often don''t know what''s possible — many are still measuring nothing.',
 'Sell the category — measurement is the wedge.',
 'Educate on the gap. Lead with CFO defence and procurement framing. Reference: ''The CFO doesn''t care about renewing the relationship — they want to know if €5M against a kit deal returned more than €5M of digital ads would have.''',
 'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-0-README.md, framing rule matrix', false, false, 3),

('DISCOVERY_INFRASTRUCTURE',
 'Discovery Mode · Sell INFRASTRUCTURE',
 'Agency',
 'Always know the category, but often have a half-built in-house thing — sell infrastructure.',
 'Always know the category, but often have a half-built in-house thing.',
 'Sell infrastructure — the layer underneath what they already do.',
 'Position as resellable infrastructure. Big agencies want full white-label; smaller/boutique agencies want clean data exports + API integrations. Discovery question on call 2: ''Are you embedding measurement in client-facing deliverables, or do you need clean data feeds into your existing stack?''',
 'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-0-README.md, framing rule matrix', false, false, 4);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART A7: INSERT 4 ICP SEGMENTS (SDR-1-ICP.md)
-- ═══════════════════════════════════════════════════════════════════════════════

-- SEGMENT 1: RIGHTS HOLDER
INSERT INTO kb_icp_segments (
  segment_name, framing_rule, one_line_summary, buyer_psyche_one_liner,
  definition, example_companies,
  why_they_buy_us_long_form, typical_deal_pattern, typical_deal_size,
  switch_story_legs,
  default_first_touch_titles, influencer_titles, influencer_titles_notes,
  specialist_titles, specialist_titles_notes,
  do_not_target_titles, do_not_target_notes, c_suite_note,
  priority_sports, priority_regions, recommended_modules,
  source, source_notes, needs_review, archived, active, sort_order
) VALUES (
  'Rights Holder',
  'PRE_EDUCATED_SWITCH',
  'Rights Holders sell sponsorship; their pain is keeping sponsors. Lead with renewal pressure.',
  'Partnerships team owns sponsor renewals and needs measurement to keep them.',
  'Bodies that own the underlying sport and sell sponsorship inventory against it. Generally larger and more bureaucratic than teams; commercial decisions move through a Partnerships function.',
  'DFL (Bundesliga), KNVB (Dutch FA), Pro League (Belgian football), Volleyball World',
  'Their job is to keep their existing sponsors renewing. To do that, every quarter they have to demonstrate what the sponsor got for the spend. Without independent measurement, the conversation becomes ''trust us'' — and at renewal, the sponsor''s procurement team will not accept ''trust us.'' You are never selling them on the category. Every rights holder you call already has a measurement tool — most of them have several. The pitch is the switch, not the concept.',
  'License-first. Bigger ticket, longer cycle. Usually tied to an RFP or to the renewal cycle of an incumbent vendor (most often Nielsen). Plan for 3-6 months from first call to signature.',
  'Mid-to-large',
  ARRAY[
    $leg1$SPEED — The dominant incumbent is Nielsen, which delivers end-of-season reports six weeks after the season ends. We deliver weekly, monthly, or in-flight. Arwin's exact case study from a recent European Football League call: "I get my report when the season is over, I have to wait six weeks, then I have one report. Then I have two-three weeks to prepare for the new season and one week to pitch back to the brands. They don't have any time."$leg1$,
    $leg2$BREADTH — Most rights holders are paying four separate vendors: Nielsen for broadcast, Blinkfire for social, Iris (or similar) for press, in-house spreadsheets for on-site/LED. Four contracts, four methodologies, four data formats, four invoices. We do all six channels in one platform.$leg2$,
    $leg3$METHODOLOGY PARITY — Their #1 fear is "I've justified Nielsen for ten years to my partners — how do I justify switching?" The answer is methodology parity: same QI media value framework, same standard CPMs, same measurement methodology, quality, size, duration. Their historical reports stay comparable. They are not asking their sponsors to learn a new measurement religion.$leg3$
  ],
  ARRAY['Partnerships Manager','Senior Partnerships Manager','Head of Partnerships','Director of Partnerships'],
  ARRAY['Head of Marketing','Head of Communications','Senior Marketing Manager'],
  'Worth sequencing in parallel as influencers, not primary buyer.',
  ARRAY['Senior Partner Integration Manager','Partnership Activation Manager'],
  'Technical buyers who actually run the measurement workflow. They are gold once you find them.',
  ARRAY['Marketing Coordinator','Social Media Manager','Intern','Marketing Assistant'],
  'They consume our reports; they do not buy.',
  'C-suite (CEO / CCO / COO) is the escalation path, not the opener — only lead with C-suite at very small federations where the CEO runs commercial directly.',
  'Football, Volleyball, Basketball, Cycling',
  'DACH, Benelux, Europe broadly',
  ARRAY['Video / Broadcast','Social','Audio','On-Site / LED','Print / Press'],
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md', false, false, true, 1
);

-- SEGMENT 2: BRAND
INSERT INTO kb_icp_segments (
  segment_name, framing_rule, one_line_summary, buyer_psyche_one_liner,
  definition, example_companies,
  why_they_buy_us_long_form, typical_deal_pattern, typical_deal_size,
  default_first_touch_titles, specialist_titles, specialist_titles_notes,
  enrichment_caveat, do_not_target_titles, do_not_target_notes, c_suite_note,
  priority_sports, priority_regions, recommended_modules,
  source, source_notes, needs_review, archived, active, sort_order
) VALUES (
  'Brand',
  'DISCOVERY_CATEGORY',
  'Brands buy sponsorship; their pain is justifying it. Lead with ROI and procurement defence.',
  'Measurement is the entry point, not the partnership relationship.',
  'Anyone spending on sponsorship as a buyer rather than seller. Telco, retail, CPG, automotive, financial services, gaming and consumer electronics. The defining trait is that sponsorship is one line in a wider marketing budget that has to compete with digital, broadcast and performance.',
  'Vodafone, Euronics, Telco brands, FMCG brands, Automotive brands, Consumer electronics brands',
  'Brands have a fundamentally different problem from rights holders. The brand''s CFO does not care about renewing the sponsor relationship — the brand''s CFO wants to know whether the €5M they put against a kit deal returned more than €5M of digital advertising would have. Without measurement, the brand cannot defend the spend internally and procurement starts squeezing the line. Measurement is the wedge — it is the reason a brand even talks to us. Once we are inside, we expand into activation reporting, audience insights, and asset valuation.',
  'Framework + project. Smaller framework license, plus campaign-specific projects added throughout the year — one per major sponsorship event. Vodafone is the textbook example: framework license alongside campaign projects spanning UEFA Women''s EURO, U17/U19, UWCL, UWNL, OMR, Kings League Finals, F95 Eintracht.',
  'Variable, growing',
  ARRAY['Head of Measurement','Senior Measurement Partner','Sponsoring & Brand Activation Manager','Sponsor Manager','Manager Sportmarketing','VP Sponsorship','Head of Partnership Marketing','Global Sponsorship Director'],
  ARRAY['Head of Consumer Insights','Head of Marketing Analytics'],
  'Technical evaluators who will rip our methodology apart in due diligence and recommend us to the budget owner if we pass.',
  'We have only twenty existing brand customer contacts to draw title patterns from, so treat the title list as directional and use Apollo to enrich with current market-standard titles.',
  ARRAY['Marketing Coordinator','Junior Brand Manager','Marketing Assistant'],
  'Junior marketing roles don''t have budget authority.',
  'CMO and VP Brand are the budget signers but not the champion.',
  'Football, Motorsports, F1',
  'DACH, UK, Western Europe, MENA',
  ARRAY['Video / Broadcast','Social','On-Site / LED'],
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md', false, false, true, 2
);

-- SEGMENT 3: AGENCY
INSERT INTO kb_icp_segments (
  segment_name, framing_rule, one_line_summary, buyer_psyche_one_liner,
  definition, example_companies,
  why_they_buy_us_long_form, typical_deal_pattern, typical_deal_size,
  two_buyer_profiles, second_call_discovery_question,
  default_first_touch_titles, specialist_titles, specialist_titles_notes,
  do_not_target_titles, do_not_target_notes, c_suite_note,
  priority_sports, priority_regions, recommended_modules,
  source, source_notes, needs_review, archived, active, sort_order
) VALUES (
  'Agency',
  'DISCOVERY_INFRASTRUCTURE',
  'Agencies service sponsorship; their pain is delivering the report. Lead with white-label efficiency (or data-feeds, depending on agency size).',
  'They buy us to service their own clients — we sit inside their deliverable.',
  'Three subtypes, all valid: (1) Media agencies with a sports practice (Havas Play, Publicis sport units), (2) Sports-marketing specialists (Infront, Lagardère), (3) Boutique sponsorship-consulting agencies (Rothkopf & Huberty in Düsseldorf is the archetype — ten-to-thirty headcount, deep DACH relationships).',
  'Havas Play, Publicis Sport, Infront, Lagardère, Rothkopf & Huberty',
  'Agencies are on the hook to deliver client reports. If the client is a brand spending €20M on sponsorship, the agency is contractually required to demonstrate impact every quarter. Building that measurement in-house is expensive and slow. We are infrastructure they can resell.',
  'TWO patterns depending on agency size. BIG (network/holding-co scale): WHITE-LABEL LICENSE. Multi-client revenue stream for them. Bigger deal, longer commercial commitment, more legal scrutiny. Havas Play and Publicis Groupe are reference shapes. SMALL/BOUTIQUE: DATA FEEDS + API INTEGRATIONS. Smaller initial deal that plugs into their existing reporting workflow. Lower friction, faster to close, lower lifetime value than white-label. Rothkopf & Huberty is the boutique reference shape.',
  'Mid',
  'Big agencies (network and holding-company scale) typically want full white-label — they rebrand our measurement and put it directly into their client deliverables. Our logo never appears in front of the brand. The agency wants to look like the platform. Smaller, boutique, and specialist agencies more often want clean data exports plus API integrations that plug into the reporting stack they already have. They''re not trying to compete with us on platform UI; they want the measurement layer underneath their existing workflow.',
  'Are you looking to embed measurement directly into your client-facing deliverables, or do you need clean data feeds into your existing reporting stack? — The answer routes the rest of the conversation.',
  ARRAY['Account Director','Client Director','Director of Business Intelligence','Media Intelligence Director','Managing Director','Managing Partner','Chief Growth Officer'],
  ARRAY['Director of Sponsorship Strategy','Premium Partnerships Manager','Senior Manager Sales Strategy'],
  'These titles signal an agency is taking sponsorship seriously enough to staff specialists — they are higher-conversion targets.',
  ARRAY['Account Coordinator','Junior Strategist','Account Executive'],
  'Junior agency roles don''t make platform decisions.',
  'At small agencies (under ~100 staff) the C-suite often IS the buyer. Don''t be afraid to go straight to the top at a 25-person consultancy.',
  'Football, Multi-sport portfolio',
  'DACH, Benelux, Europe broadly',
  ARRAY['All 6 channels — typically white-labelled or via API'],
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md', false, false, true, 3
);

-- SEGMENT 4: TEAM
INSERT INTO kb_icp_segments (
  segment_name, framing_rule, one_line_summary, buyer_psyche_one_liner,
  definition, example_companies,
  why_they_buy_us_long_form, typical_deal_pattern, typical_deal_size,
  default_first_touch_titles, do_not_target_titles, do_not_target_notes,
  c_suite_note, esports_outbound_rule,
  priority_sports, priority_regions, recommended_modules,
  source, source_notes, needs_review, archived, active, sort_order
) VALUES (
  'Team',
  'PRE_EDUCATED_UPGRADE',
  'Teams are small versions of leagues; their pain is doing it manually. Lead with time-saved and CEO-time-saved.',
  'Commercially lean — CEO/CCO often signs personally.',
  'Any individual sporting club, franchise or esports org with its own commercial team. Football clubs are the largest sub-population: Sint-Truiden, Racing Genk, smaller European top-flight sides. Cycling teams (CGS / UAE Team Emirates), individual-sport franchises, esports orgs.',
  'Sint-Truiden, Racing Genk, CGS Cycling, UAE Team Emirates',
  'Same renewal-pressure logic as rights holders, but compressed. Teams typically have under thirty people in the entire commercial function. The Partnerships Manager is the day-to-day buyer; the Commercial Director or CCO is the signer; and at clubs under fifty staff, the CEO often opens the conversation personally. Manual sponsor reporting eats their week — we automate it.',
  'Pilot first, then license. A pilot is the typical entry — small ticket, one event or one season. If the pilot lands, it converts to an annual license. Most teams under 30 commercial staff need to see the numbers before committing.',
  'Small-to-mid',
  ARRAY['Commercial Director','CCO','CEO','Partnerships Manager'],
  ARRAY['Director of Fan Engagement','Head of Digital','Social Media Manager'],
  'Most teams have a media-rights or fan-engagement function — those titles are not buyers. They consume our reports.',
  'At very small clubs (under ~30 commercial staff), go to the CEO directly — they are the buyer.',
  'IMPORTANT: Esports orgs in this segment are DEPRIORITISED for outbound sourcing per Arwin''s April 2026 direction. Inbound esports leads are still in scope. Do not build outbound sequences against esports orgs.',
  'Football, Cycling, Individual sports',
  'Europe, Italy, Belgium, Germany, Spain, MENA',
  ARRAY['Video / Broadcast','Social','On-Site / LED'],
  'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md', false, false, true, 4
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PART A8: INSERT 5 DEAL PATTERNS (SDR-1-ICP.md)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO kb_deal_patterns
  (segment, entry_pattern, pattern_implications, reference_customer, timeline, unusual_signals,
   source, source_notes, needs_review, archived, active, sort_order)
VALUES
('Rights Holder',
 'License-first',
 'Bigger ticket, longer cycle. Usually tied to an RFP or to the renewal cycle of an incumbent vendor (most often Nielsen).',
 NULL,
 '3-6 months from first call to signature',
 'If a Rights Holder asks about a ''small pilot to start'' — that''s an unusual signal. Push to understand why (it usually means decision politics are blocking a license).',
 'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md, Deal pattern table', false, false, true, 1),

('Brand',
 'Framework + project',
 'Smaller framework license, plus campaign-specific projects added throughout the year — one per major sponsorship event.',
 'Vodafone — framework license alongside campaign projects spanning UEFA Women''s EURO, U17/U19, UWCL, UWNL, OMR, Kings League Finals, F95 Eintracht',
 NULL,
 'If a Brand wants a full license up-front with no campaign projects underneath — also unusual. Usually means a procurement-driven mandate to consolidate vendors.',
 'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md, Deal pattern table', false, false, true, 2),

('Agency',
 'White-label license (big agencies — network/holding-co)',
 'Multi-client revenue stream for them. Bigger deal, longer commercial commitment, more legal scrutiny.',
 'Havas Play, Publicis Groupe',
 NULL,
 'If an Agency goes both ways (wants white-label AND data feeds), that''s a sign of a holding-company-scale deal — flag to Benedikt.',
 'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md, Deal pattern table', false, false, true, 3),

('Agency',
 'Data feeds + API integrations (small/boutique agencies)',
 'Smaller initial deal that plugs into their existing reporting workflow. Lower friction, faster to close, lower lifetime value than white-label.',
 'Rothkopf & Huberty',
 NULL,
 NULL,
 'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md, Deal pattern table', false, false, true, 4),

('Team',
 'Pilot first, then license',
 'A pilot is the typical entry — small ticket, one event or one season. If the pilot lands, it converts to an annual license.',
 NULL,
 NULL,
 'Most teams under 30 commercial staff need to see the numbers before committing.',
 'BENEDIKT_TRAINING_DECK_2026_04_27', 'SDR-1-ICP.md, Deal pattern table', false, false, true, 5);

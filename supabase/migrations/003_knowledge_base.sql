-- ─── KNOWLEDGE BASE TABLES ───────────────────────────────────────────────────

-- ICP Segments
create table if not exists kb_icp_segments (
  id                  uuid primary key default uuid_generate_v4(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  segment_name        text not null,
  definition          text,
  example_companies   text,
  pain_points         text,
  priority_sports     text,
  priority_regions    text,
  target_titles       text,
  min_company_size    integer,
  recommended_product text,
  sort_order          integer not null default 0
);

-- Shikenso Products
create table if not exists kb_products (
  id                   uuid primary key default uuid_generate_v4(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  name                 text not null,
  description          text,
  target_segments      text,
  key_differentiators  text,
  sort_order           integer not null default 0
);

-- Proof Points
create table if not exists kb_proof_points (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  headline      text not null,
  context       text,
  best_segments text,
  active        boolean not null default true,
  sort_order    integer not null default 0
);

-- Competitors
create table if not exists kb_competitors (
  id                  uuid primary key default uuid_generate_v4(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  name                text not null,
  positioning_notes   text,
  differentiation     text,
  active              boolean not null default true
);

-- Signal Keywords
create table if not exists kb_signal_keywords (
  id            uuid primary key default uuid_generate_v4(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  name          text not null,
  signal_source text not null check (signal_source in ('linkedin_jobs','google_alerts','agent','all')),
  keywords      text not null,
  segment       text,
  target_tier   text default 'ANY' check (target_tier in ('TIER_1','TIER_2','TIER_3','ANY')),
  active        boolean not null default true
);

-- Copy Tone (single global row)
create table if not exists kb_copy_tone (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  words_to_use     text,
  words_to_avoid   text,
  tone_description text,
  signoff_format   text,
  additional_rules text
);

-- Edit History (versioning for all KB tables)
create table if not exists kb_edit_history (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  table_name  text not null,
  record_id   uuid not null,
  snapshot    jsonb not null,
  note        text
);

-- Updated_at triggers
create trigger kb_icp_segments_updated_at
  before update on kb_icp_segments
  for each row execute function update_updated_at_column();

create trigger kb_products_updated_at
  before update on kb_products
  for each row execute function update_updated_at_column();

create trigger kb_proof_points_updated_at
  before update on kb_proof_points
  for each row execute function update_updated_at_column();

create trigger kb_competitors_updated_at
  before update on kb_competitors
  for each row execute function update_updated_at_column();

create trigger kb_signal_keywords_updated_at
  before update on kb_signal_keywords
  for each row execute function update_updated_at_column();

create trigger kb_copy_tone_updated_at
  before update on kb_copy_tone
  for each row execute function update_updated_at_column();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table kb_icp_segments    enable row level security;
alter table kb_products        enable row level security;
alter table kb_proof_points    enable row level security;
alter table kb_competitors     enable row level security;
alter table kb_signal_keywords enable row level security;
alter table kb_copy_tone       enable row level security;
alter table kb_edit_history    enable row level security;

create policy "Authenticated full access — kb_icp_segments"
  on kb_icp_segments for all to authenticated using (true) with check (true);
create policy "Authenticated full access — kb_products"
  on kb_products for all to authenticated using (true) with check (true);
create policy "Authenticated full access — kb_proof_points"
  on kb_proof_points for all to authenticated using (true) with check (true);
create policy "Authenticated full access — kb_competitors"
  on kb_competitors for all to authenticated using (true) with check (true);
create policy "Authenticated full access — kb_signal_keywords"
  on kb_signal_keywords for all to authenticated using (true) with check (true);
create policy "Authenticated full access — kb_copy_tone"
  on kb_copy_tone for all to authenticated using (true) with check (true);
create policy "Authenticated full access — kb_edit_history"
  on kb_edit_history for all to authenticated using (true) with check (true);

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

-- ICP Segments
insert into kb_icp_segments (segment_name, definition, example_companies, pain_points, priority_sports, priority_regions, target_titles, min_company_size, recommended_product, sort_order) values
(
  'Rights Holder',
  'Leagues, tournaments, and event organizers that host sports or esports competitions and need to prove sponsor value to retain and upsell deals.',
  'DFL, Esports World Cup, BLAST, Volleyball World, Pro League',
  'Need to prove sponsor value to retain/upsell deals. Reporting is manual and slow. Cannot show sponsors real-time media value across all channels.',
  'Football, Esports, Volleyball, Cycling, Basketball',
  'Europe, Middle East, Global',
  'Head of Partnerships, Commercial Director, Sponsorship Manager, Head of Revenue, CEO',
  50,
  'Sports + Esports tracking platform',
  1
),
(
  'Brand',
  'Brands with active sponsorship relationships in sports or esports that need to measure true ROI across all media channels.',
  'Vodafone, betting brands, energy drinks, gaming peripherals brands activating in sports/esports',
  'Cannot measure true ROI across channels. Board questions sponsorship spend. Agency reports are slow and untrustworthy. Cannot compare performance across multiple sponsorship assets.',
  'Football, Esports, Formula 1, Tennis, Basketball',
  'Europe, DACH, UK, Nordics',
  'Head of Sponsorship, Marketing Director, Brand Manager, Head of Sports Marketing, VP Marketing',
  100,
  'Brand ROI dashboard',
  2
),
(
  'Agency',
  'Sports and esports marketing agencies that manage sponsorship portfolios for clients and need faster, more credible reporting.',
  'Sportfive, Havas, WPP Media, MKTG, Octagon',
  'Client reporting is slow and manual. Hard to prove value at scale. Clients demand data-driven ROI but agencies lack the tooling. Losing pitches to more data-savvy competitors.',
  'All sports and esports',
  'Europe, UK, Global',
  'Head of Analytics, Client Services Director, Strategy Director, Insights Manager, Managing Director',
  20,
  'White-label reporting layer',
  3
),
(
  'Club',
  'Professional sports clubs and esports teams that need data to attract new sponsors and retain existing ones.',
  'Club Brugge, KRÜ Esports, GIANTX, FC Turin, KAA Gent',
  'Need to attract and retain sponsors with data. Cannot quantify the value of what they offer sponsors. Lose sponsorship deals to clubs with better data stories.',
  'Football, Esports, Cycling, Basketball',
  'Europe, Latin America',
  'Commercial Director, Head of Partnerships, CEO, Marketing Director, Sponsorship Manager',
  10,
  'Clubs platform',
  4
);

-- Shikenso Products
insert into kb_products (name, description, target_segments, key_differentiators, sort_order) values
(
  'Sports + Esports tracking platform',
  'AI-powered media tracking platform that measures sponsorship visibility across broadcast, streaming, social, and digital channels for leagues and event organizers.',
  'Rights Holder',
  'Covers both traditional sports and esports in one platform. 99% logo detection accuracy. Real-time dashboards. White-label client reports. 300% faster than manual reporting.',
  1
),
(
  'Brand ROI dashboard',
  'A dedicated dashboard for brands to measure and prove the return on their sponsorship investments across all channels and compare performance across multiple assets.',
  'Brand',
  '€115M+ in media value tracked. 269% average increase in reported sponsor ROI. Cross-channel (TV, social, digital, streaming). Benchmark against competitors and industry.',
  2
),
(
  'White-label reporting layer',
  'A white-label analytics layer agencies can deploy for clients, enabling automated sponsor reports under their own brand.',
  'Agency',
  'Full white-labelling. 40+ hours saved per month. Automated report generation. Multi-client management. Client-ready dashboards out of the box.',
  3
),
(
  'Clubs platform',
  'A sponsorship analytics platform built specifically for clubs and teams to attract sponsors with data and prove value to existing partners.',
  'Club',
  'Purpose-built for clubs. Onboarding within 48 hours. Show prospective sponsors their projected media value before signing. Easy to share with external stakeholders.',
  4
);

-- Proof Points
insert into kb_proof_points (headline, context, best_segments, active, sort_order) values
  ('300% faster reporting than closest competitors',    'Internal benchmarking vs manual reporting workflows',               'All',           true, 1),
  ('99% accuracy in logo detection',                   'Measured across all tracked broadcast and social content',          'All',           true, 2),
  ('40+ hours saved per month on average',             'Average across agency and rights holder customers',                 'Agency, Rights Holder', true, 3),
  ('€115M tracked in media value',                     'MOONTON Games case study — tracked across global MLBB tournament',  'Rights Holder, Brand', true, 4),
  ('269% increase in sponsor ROI reported by clients', 'Average across platform customers measuring brand sponsorships',    'Brand',         true, 5),
  ('Onboarding within 48 hours of contract signature', 'Standard onboarding SLA across all product tiers',                 'All',           true, 6);

-- Competitors
insert into kb_competitors (name, positioning_notes, differentiation, active) values
(
  'Blinkfire Analytics',
  'US-focused. Strong in North American sports leagues and MLS. UI-heavy, less AI-native. Slower to expand into esports.',
  'Shikenso covers EU + esports natively. Higher logo detection accuracy. More flexible white-label layer for agencies.',
  true
),
(
  'GumGum Sports',
  'Computer vision-based sponsorship measurement. Strong brand recognition. More expensive, enterprise-focused.',
  'Shikenso is faster to onboard (48h vs weeks), more affordable for mid-market, and covers esports which GumGum does not.',
  true
),
(
  'SponsorPulse',
  'Fan sentiment and brand awareness surveys. Complementary rather than direct competitor — they measure awareness, not media value.',
  'Shikenso measures actual media exposure and ROI, not just survey-based sentiment. Hard proof vs soft metrics.',
  true
);

-- Signal Keywords
insert into kb_signal_keywords (name, signal_source, keywords, segment, target_tier, active) values
  ('Sponsorship hiring signals',    'linkedin_jobs',  'sponsorship manager, partnerships manager, head of partnerships, commercial director, sports marketing, sponsorship director', null, 'ANY', true),
  ('Esports hiring signals',        'linkedin_jobs',  'esports manager, esports partnerships, esports marketing, esports commercial, gaming partnerships', null, 'ANY', true),
  ('Deal announcements',            'google_alerts',  'announces sponsorship, new sponsor, official partner, naming rights, kit sponsor, jersey sponsor', null, 'ANY', true),
  ('Event & league signals',        'google_alerts',  'esports tournament, sports league, championship sponsor, event partnership', 'Rights Holder', 'ANY', true),
  ('Brand activation signals',      'google_alerts',  'brand activation, sports sponsorship, esports sponsorship, sponsorship portfolio', 'Brand', 'ANY', true);

-- Copy Tone (single global row)
insert into kb_copy_tone (words_to_use, words_to_avoid, tone_description, signoff_format, additional_rules) values
(
  'prove, track, measure, visibility, ROI, data-backed, real-time, automated, onboard, fast, accurate',
  'synergy, leverage, best-in-class, disruptive, revolutionary, game-changer, circle back, touch base',
  'Sharp and direct. No fluff. Sounds like someone who knows the sponsorship industry inside out — not a generic SaaS sales rep. Reference specific signals (a job posting, a deal announcement, a tournament). Be brief. One strong insight is worth more than three generic benefits.',
  'Best,\n[Name]\nGrowth BDR, Shikenso Analytics\nshikenso.com',
  'Always reference the specific signal that triggered this outreach in the opening line. Never use more than 3 sentences in the opening. The CTA should always be a 30-minute call, never a demo request or a generic "let me know if you are interested".'
);

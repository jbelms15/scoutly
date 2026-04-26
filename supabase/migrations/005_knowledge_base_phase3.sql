-- Phase 3: Knowledge Base deep build
-- Run AFTER migrations 001–004

-- ─── SCHEMA UPDATES ON EXISTING KB TABLES ────────────────────────────────────

-- kb_icp_segments
alter table kb_icp_segments
  add column if not exists version          integer not null default 1,
  add column if not exists active           boolean not null default true,
  add column if not exists criteria         text,
  add column if not exists max_company_size integer;

-- kb_products
alter table kb_products
  add column if not exists version              integer not null default 1,
  add column if not exists active               boolean not null default true,
  add column if not exists product_name         text,
  add column if not exists positioning_statement text;

-- kb_proof_points
alter table kb_proof_points
  add column if not exists version            integer not null default 1,
  add column if not exists full_context       text,
  add column if not exists source_url         text,
  add column if not exists stat_value         text,
  add column if not exists stat_unit          text,
  add column if not exists case_study_company text;

-- kb_competitors
alter table kb_competitors
  add column if not exists version                  integer not null default 1,
  add column if not exists competitor_name          text,
  add column if not exists website                  text,
  add column if not exists shikenso_differentiation text,
  add column if not exists when_likely_encountered  text;

-- kb_signal_keywords: replace signal_source constraint with new enum values
do $$
begin
  alter table kb_signal_keywords drop constraint if exists kb_signal_keywords_signal_source_check;
exception when others then null;
end $$;

alter table kb_signal_keywords
  add column if not exists version         integer not null default 1,
  add column if not exists keyword_set_name text;

alter table kb_signal_keywords
  add constraint kb_signal_keywords_signal_source_check
  check (signal_source in ('GOOGLE_ALERTS','LINKEDIN_JOBS','LEMLIST_WATCHER','OTHER'));

-- ─── NEW TABLES ───────────────────────────────────────────────────────────────

-- kb_copy_preferences: one row per preference type (replaces single-row kb_copy_tone)
create table if not exists kb_copy_preferences (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  version         integer not null default 1,
  preference_type text not null check (preference_type in (
                    'WORDS_TO_USE','WORDS_TO_AVOID','TONE_DESCRIPTION',
                    'SIGN_OFF_FORMAT','OPENING_STYLE','CTA_STYLE'
                  )),
  preference_value text not null,
  active          boolean not null default true
);

create trigger kb_copy_preferences_updated_at
  before update on kb_copy_preferences
  for each row execute function update_updated_at_column();

-- kb_version_history: auto-populated by trigger on every KB table update
create table if not exists kb_version_history (
  id           uuid primary key default uuid_generate_v4(),
  created_at   timestamptz not null default now(),
  table_name   text not null,
  record_id    uuid not null,
  previous_data jsonb,
  new_data      jsonb,
  changed_by   text default 'user',
  change_reason text
);

create index if not exists idx_kb_version_history_record on kb_version_history (table_name, record_id);
create index if not exists idx_kb_version_history_created on kb_version_history (created_at desc);

-- ─── VERSION TRACKING TRIGGER ────────────────────────────────────────────────

create or replace function kb_capture_version()
returns trigger language plpgsql as $$
begin
  insert into kb_version_history (table_name, record_id, previous_data, new_data, changed_by)
  values (tg_table_name, old.id, to_jsonb(old), to_jsonb(new), 'user');
  -- Bump version counter if column exists
  begin
    new.version = coalesce(old.version, 0) + 1;
  exception when undefined_column then null;
  end;
  return new;
end;
$$;

-- Apply to all KB tables
drop trigger if exists trg_version_kb_icp_segments    on kb_icp_segments;
drop trigger if exists trg_version_kb_products         on kb_products;
drop trigger if exists trg_version_kb_proof_points     on kb_proof_points;
drop trigger if exists trg_version_kb_competitors      on kb_competitors;
drop trigger if exists trg_version_kb_signal_keywords  on kb_signal_keywords;
drop trigger if exists trg_version_kb_copy_preferences on kb_copy_preferences;

create trigger trg_version_kb_icp_segments
  before update on kb_icp_segments for each row execute function kb_capture_version();
create trigger trg_version_kb_products
  before update on kb_products for each row execute function kb_capture_version();
create trigger trg_version_kb_proof_points
  before update on kb_proof_points for each row execute function kb_capture_version();
create trigger trg_version_kb_competitors
  before update on kb_competitors for each row execute function kb_capture_version();
create trigger trg_version_kb_signal_keywords
  before update on kb_signal_keywords for each row execute function kb_capture_version();
create trigger trg_version_kb_copy_preferences
  before update on kb_copy_preferences for each row execute function kb_capture_version();

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table kb_copy_preferences enable row level security;
alter table kb_version_history  enable row level security;

create policy "Authenticated full access — kb_copy_preferences"
  on kb_copy_preferences for all to authenticated using (true) with check (true);
create policy "Authenticated full access — kb_version_history"
  on kb_version_history for all to authenticated using (true) with check (true);

-- ─── CLEAR OLD SEED DATA ─────────────────────────────────────────────────────

delete from kb_icp_segments;
delete from kb_products;
delete from kb_proof_points;
delete from kb_competitors;
delete from kb_signal_keywords;
delete from kb_copy_preferences;

-- ─── SEED: ICP SEGMENTS ──────────────────────────────────────────────────────

insert into kb_icp_segments
  (segment_name, definition, criteria, example_companies, pain_points, priority_sports,
   priority_regions, target_titles, min_company_size, max_company_size,
   recommended_product, active, sort_order)
values
(
  'Rights Holder',
  'Leagues, tournaments, and event organizers that own commercial sponsorship rights to sports or esports properties.',
  'Entity must own or operate a sports/esports property with sponsorship inventory to sell. Revenue model includes title sponsors, kit deals, naming rights, or official partner tiers.',
  'DFL, BLAST, Esports World Cup, Volleyball World, Pro League, Niké League, The Icon League',
  'Need to prove sponsor ROI for renewals, Manual reporting takes weeks, Sponsors demand cross-channel measurement',
  'Football, Esports, Volleyball, Basketball, Cycling',
  'Europe, DACH, BENELUX, Italy, Spain',
  'Commercial Director, Head of Partnerships, Head of Sponsorship, VP Commercial, Head of Sponsorship Sales',
  50, 5000, 'Sports or Esports', true, 1
),
(
  'Brand',
  'Companies actively spending on sponsorship deals in sports or esports who need to measure ROI.',
  'Brand must have at least one active sponsorship relationship in sports or esports. B2B or B2C does not matter — what matters is that they are activating sponsorships and struggling to measure them.',
  'Vodafone, Visit Qatar, betting brands, energy drinks, gaming peripherals brands',
  'Can''t prove ROI to leadership, Activation spend is opaque, Multi-channel exposure is unmeasured',
  'Football, Esports, F1, Motorsports',
  'Europe, DACH, UK, Italy, Spain',
  'Head of Brand Partnerships, Sponsorship Manager, VP Marketing, Head of Sports Marketing, Head of Brand',
  200, 50000, 'Brand ROI dashboard', true, 2
),
(
  'Agency',
  'Marketing, sponsorship, or media agencies that manage sports/esports campaigns on behalf of brand or rights holder clients.',
  'Agency must have sports or esports clients for whom they manage sponsorships or brand activation. Could be specialist agency or a practice within a larger holding group.',
  'Sportfive, Havas, WPP Media, Freaks4U, OMG',
  'Slow client reporting, Manual data aggregation, Hard to prove agency value',
  'Football, Esports, broad portfolio',
  'Europe, DACH, BENELUX, UK',
  'Managing Partner, Head of Strategy, Director of Sponsorship, Head of Sports & Entertainment',
  30, 5000, 'White-label reporting', true, 3
),
(
  'Club & Team',
  'Sports clubs or esports organizations with their own commercial and sponsorship operations.',
  'Club must have at least one commercial/sponsorship employee or responsibility. Could be professional sports team, esports org, or amateur club with significant sponsorship revenue.',
  'Club Brugge, KAA Gent, GIANTX, KRÜ Esports, Team Liquid, Vitality',
  'Need data to attract new sponsors, Renewal conversations need proof, Limited internal analytics resources',
  'Football, Esports, Basketball',
  'Europe, Italy, Belgium, Germany, Spain, Netherlands, France',
  'Commercial Director, Head of Partnerships, CEO (small clubs), Sponsorship Manager',
  20, 1000, 'Clubs platform', true, 4
);

-- ─── SEED: PRODUCTS ──────────────────────────────────────────────────────────

insert into kb_products
  (name, product_name, description, target_segments, key_differentiators,
   positioning_statement, active, sort_order)
values
(
  'Sports', 'Sports',
  'Measure impact, engagement, and visibility to drive smarter sponsorships and maximize ROI for traditional sports rights holders, clubs, and brands.',
  'Rights Holder, Club, Brand, Agency',
  '99% accuracy in logo detections, Tracks visual audio and text exposure, GDPR-first made in Germany, Real-time vs days/weeks for competitors',
  'The sponsorship data that closes deals and wins renewals.',
  true, 1
),
(
  'Esports', 'Esports',
  'Track brand exposure, performance, and audience engagement across esports broadcasts, streams, and social channels.',
  'Rights Holder, Club, Brand, Agency',
  'Native esports broadcast integration, Live chat sentiment analysis, Streaming and traditional broadcast unified, Trusted by Team Liquid Vitality GIANTX MOONTON',
  'From €115M tracked media value to deal-winning data — built for esports.',
  true, 2
),
(
  'Campaign', 'Campaign',
  'Verify creator campaigns and deliverables from briefing to reporting.',
  'Brand, Agency',
  'End-to-end creator campaign verification, Deliverable tracking automated, Brief to report in one platform',
  'Influencer marketing data-based, precise, and to the point.',
  true, 3
);

-- ─── SEED: PROOF POINTS ──────────────────────────────────────────────────────

insert into kb_proof_points
  (headline, full_context, best_segments, active, sort_order)
values
  ('300% faster reporting time than closest competitors',              'Speed and efficiency benchmark vs manual workflows and nearest alternatives',               'All',                    true, 1),
  ('99% accuracy in logo detections across media',                    'AI computer vision benchmark across broadcast, streaming, and social content',              'All',                    true, 2),
  ('40+ hrs saved on average per month with automatic reporting',     'Average across agency and rights holder customers who replaced manual reporting',          'Agency, Rights Holder, Club', true, 3),
  ('2 employees saved on average per month in time and effort',       'FTE-equivalent productivity gain from automated reporting workflows',                       'Agency, Club, Rights Holder', true, 4),
  ('€115M tracked in branded media value for MOONTON Games',         'Flagship case study: MOONTON Games global MLBB tournament — full multi-channel tracking', 'Rights Holder, Brand',   true, 5),
  ('GIANTX integrated 17 new brand partners using Shikenso data',    'Esports team used Shikenso insights in sponsor acquisition pitch decks',                   'Club',                   true, 6),
  ('KRÜ Esports upped fan engagement by 280%',                       'Engagement growth tracked across broadcast and social using Shikenso platform',            'Club',                   true, 7),
  ('269% increase in sponsor ROI after switching to Shikenso',        'Average ROI improvement reported by brand customers vs previous measurement method',      'Brand',                  true, 8),
  ('45% additional media value proved for kit sponsoring on international competition', 'Hidden exposure identified by Shikenso that sponsors were not previously tracking', 'Rights Holder, Club', true, 9),
  ('Onboarding within 48 hours of contract signature',                'Standard onboarding SLA — fastest in the category',                                       'All',                    true, 10),
  ('Made in Germany with GDPR-first foundation',                      'Full European data standards compliance, relevant for all EU-based clients',               'All (EU focus)',         true, 11);

-- ─── SEED: COMPETITORS ───────────────────────────────────────────────────────

insert into kb_competitors
  (name, competitor_name, website, positioning_notes, differentiation, shikenso_differentiation,
   when_likely_encountered, active)
values
(
  'Blinkfire Analytics', 'Blinkfire Analytics', 'blinkfire.com',
  'Long-established sports sponsorship analytics, strongest in North American sports leagues and MLS. Large logo detection library.',
  'Shikenso covers EU + esports natively. Higher logo detection accuracy. Unified audio/visual/text. GDPR-first European standards.',
  'Faster reporting (hours vs days), GDPR-first European standards, Esports + Sports unified in one platform, 99% accuracy claim with audio + text + visual tracking',
  'Established rights holders evaluating providers, especially those with existing North American ties.',
  true
),
(
  'GumGum Sports', 'GumGum Sports', 'gumgum.com/sports',
  'AI computer vision for sponsorship valuation with ad-tech roots. Strong brand recognition, enterprise-focused, premium pricing.',
  'Shikenso is faster to onboard (48h vs weeks), more affordable for mid-market, covers esports which GumGum does not, real-time vs delayed.',
  'Specialized in sponsorship not ad-tech, Real-time reporting vs delayed, European data standards, More transparent methodology, Esports native',
  'Brands evaluating enterprise providers, large rights holders doing RFPs.',
  true
),
(
  'SponsorPulse', 'SponsorPulse', 'sponsorpulse.com',
  'Audience research-led sponsorship measurement using surveys and panels. Complementary rather than direct competitor.',
  'Shikenso measures actual media exposure and ROI, not just perception. Hard exposure proof vs soft survey metrics. Cross-channel measurement.',
  'Real exposure data vs survey-based perception, Cross-channel actual media measurement, Faster turnaround than research panels, Direct media tracking vs sentiment',
  'Brands wanting audience research alongside ROI — often comes up in discovery calls as a comparison.',
  true
);

-- ─── SEED: SIGNAL KEYWORDS ───────────────────────────────────────────────────

insert into kb_signal_keywords
  (name, keyword_set_name, keywords, signal_source, segment, target_tier, active)
values
  ('Sponsorship deal announcements', 'Sponsorship deal announcements',
   'sponsorship deal, new shirt sponsor, kit sponsor, naming rights, official partner, announces partnership',
   'GOOGLE_ALERTS', 'Club, Rights Holder', 'ANY', true),
  ('Esports sponsorships', 'Esports sponsorships',
   'esports sponsorship, esports partnership, esports brand deal, gaming sponsorship',
   'GOOGLE_ALERTS', 'Rights Holder, Brand, Club', 'ANY', true),
  ('Sponsor renewal signals', 'Sponsor renewal signals',
   'extends sponsorship, renews partnership, multi-year deal, extends partnership agreement',
   'GOOGLE_ALERTS', 'All', 'ANY', true),
  ('Partnerships hiring', 'Partnerships hiring',
   'Head of Partnerships, Sponsorship Manager, Partnerships Director, VP Partnerships',
   'LINKEDIN_JOBS', 'All', 'ANY', true),
  ('Commercial leadership hiring', 'Commercial leadership hiring',
   'Commercial Director, Chief Revenue Officer, Head of Commercial, VP Commercial',
   'LINKEDIN_JOBS', 'Club, Rights Holder', 'ANY', true),
  ('Esports commercial roles', 'Esports commercial roles',
   'Esports Partnerships, Gaming Sponsorship, Esports Commercial, Esports Business Development',
   'LINKEDIN_JOBS', 'Rights Holder, Club', 'ANY', true);

-- ─── SEED: COPY PREFERENCES ──────────────────────────────────────────────────

insert into kb_copy_preferences (preference_type, preference_value, active) values
(
  'WORDS_TO_USE',
  'partnership, partner, deal, measure, prove, show, clarity, transparency, data-backed, fact-based, renewal, retention, visibility, exposure, ROI, media value',
  true
),
(
  'WORDS_TO_AVOID',
  'leverage, synergy, holistic, circle back, touch base, revolutionary, game-changing, solution-oriented, paradigm, hope this finds you well, disruptive, best-in-class, world-class',
  true
),
(
  'TONE_DESCRIPTION',
  'Direct, peer-to-peer, sports-native. Sounds like someone who knows the industry talking to another professional who also knows it. No corporate buzzwords. Confident but never pushy. Use signal context to show I have done the homework. Maximum 3 sentences in the opener.',
  true
),
(
  'SIGN_OFF_FORMAT',
  'Joanna
Growth BDR · Shikenso Analytics',
  true
),
(
  'OPENING_STYLE',
  'Lead with the signal. Reference what just happened or is about to happen (a job post, a deal announcement, a new signing). Avoid generic openers like "I came across your profile" or "I wanted to reach out". The first line must prove I have a specific reason to be reaching out RIGHT NOW.',
  true
),
(
  'CTA_STYLE',
  'Soft, low-friction. Offer a 30-minute conversation, not a demo. Frame as "show you what your data could look like" instead of "present our product." Always include a specific time anchor (this week / next week). Never ask "do you have time?" — just suggest a slot.',
  true
);

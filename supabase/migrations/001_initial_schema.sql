-- Scoutly — Initial schema
-- Run this in Supabase SQL editor: Dashboard > SQL Editor > New query

create extension if not exists "uuid-ossp";

-- ─── LEADS ───────────────────────────────────────────────────────────────────

create table if not exists leads (
  id                  uuid primary key default uuid_generate_v4(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Contact
  first_name          text,
  last_name           text,
  title               text,
  company             text,
  linkedin_url        text,
  email               text,

  -- Company
  company_size        text,
  industry            text,
  region              text,
  country             text,
  website             text,

  -- ICP scoring
  segment             text check (segment in ('Rights Holder','Brand','Agency','Club')),
  icp_score           integer check (icp_score >= 0 and icp_score <= 100),
  score_reasoning     text,
  signal_strength     text check (signal_strength in ('HIGH','MEDIUM','LOW')),
  signal_explanation  text,

  -- Signal context
  signal_source       text,
  signal_type         text,
  signal_fired_at     timestamptz,

  -- Classification
  priority            text check (priority in ('HOT','WARM','COLD')),
  sponsorship_activity text check (sponsorship_activity in ('YES','LIKELY','UNCLEAR','NO')),
  recommended_campaign text,
  recommended_product text check (recommended_product in ('Sports','Esports','Campaign')),
  status              text not null default 'PENDING'
                        check (status in ('PENDING','APPROVED','REJECTED','PUSHED')),
  rejection_reason    text,
  source_tag          text check (source_tag in ('WARM','COLD','AGENT','IMPORT')),

  -- Copy Studio output
  copy_first_line     text,
  copy_email_subject  text,
  copy_email_body     text,
  copy_linkedin       text,

  -- External IDs
  lemlist_contact_id  text,
  hubspot_contact_id  text,

  notes               text
);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_updated_at
  before update on leads
  for each row execute function update_updated_at_column();

-- ─── SIGNALS ─────────────────────────────────────────────────────────────────

create table if not exists signals (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  name        text not null,
  type        text not null check (type in (
                'linkedin_jobs','google_alerts','lemlist_webhook',
                'csv_import','agent'
              )),
  config      jsonb not null default '{}',
  active      boolean not null default true,
  last_run    timestamptz,
  leads_found integer not null default 0
);

-- ─── REJECTIONS ──────────────────────────────────────────────────────────────

create table if not exists rejections (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  lead_id     uuid not null references leads(id) on delete cascade,
  reason_tag  text not null check (reason_tag in (
                'TOO_SMALL','WRONG_REGION','NO_SPONSORSHIP',
                'WRONG_SEGMENT','ALREADY_CUSTOMER','OTHER'
              )),
  notes       text
);

-- ─── AGENT SESSIONS ──────────────────────────────────────────────────────────

create table if not exists agent_sessions (
  id             uuid primary key default uuid_generate_v4(),
  created_at     timestamptz not null default now(),
  prompt         text not null,
  leads_returned jsonb not null default '[]'
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
-- Single-user app: authenticated users can access all their data

alter table leads enable row level security;
alter table signals enable row level security;
alter table rejections enable row level security;
alter table agent_sessions enable row level security;

create policy "Authenticated full access — leads"
  on leads for all to authenticated using (true) with check (true);

create policy "Authenticated full access — signals"
  on signals for all to authenticated using (true) with check (true);

create policy "Authenticated full access — rejections"
  on rejections for all to authenticated using (true) with check (true);

create policy "Authenticated full access — agent_sessions"
  on agent_sessions for all to authenticated using (true) with check (true);

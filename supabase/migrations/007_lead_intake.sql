-- Phase 4: Lead Intake schema extensions

-- ─── EXTEND LEADS TABLE ──────────────────────────────────────────────────────

alter table leads
  add column if not exists seniority           text,
  add column if not exists phone               text,
  add column if not exists internal_notes      text,
  add column if not exists source_type         text check (source_type in (
                             'CSV_IMPORT','MANUAL_ENTRY','LEMLIST_WATCHER',
                             'COWORK_EXPORT','SCOUTLY_AGENT',
                             'GOOGLE_ALERTS','LINKEDIN_JOBS'
                           )),
  add column if not exists source_detail       text,
  add column if not exists source_signal       text,
  add column if not exists source_imported_at  timestamptz,
  add column if not exists source_warmth       text check (source_warmth in ('WARM','COLD','UNKNOWN'));

-- Indexes for deduplication lookups
create index if not exists idx_leads_linkedin_url  on leads (linkedin_url) where linkedin_url is not null;
create index if not exists idx_leads_email_lower   on leads (lower(email))  where email is not null;
create index if not exists idx_leads_company_id    on leads (company_id)    where company_id is not null;
create index if not exists idx_leads_status        on leads (status);

-- ─── INTAKE_LOGS ─────────────────────────────────────────────────────────────

create table if not exists intake_logs (
  id                         uuid primary key default uuid_generate_v4(),
  created_at                 timestamptz not null default now(),
  source_type                text,
  source_detail              text,
  leads_attempted            integer not null default 0,
  leads_imported             integer not null default 0,
  leads_skipped_duplicate    integer not null default 0,
  leads_blocked_suppression  integer not null default 0,
  leads_failed_validation    integer not null default 0,
  error_messages             jsonb not null default '[]',
  imported_by                text
);

alter table intake_logs enable row level security;
create policy "Authenticated full access — intake_logs"
  on intake_logs for all to authenticated using (true) with check (true);

-- ─── CSV_COLUMN_MAPPINGS ─────────────────────────────────────────────────────

create table if not exists csv_column_mappings (
  id           uuid primary key default uuid_generate_v4(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  mapping_name text not null,
  column_map   jsonb not null default '{}',
  last_used_at timestamptz,
  times_used   integer not null default 0
);

create trigger csv_column_mappings_updated_at
  before update on csv_column_mappings
  for each row execute function update_updated_at_column();

alter table csv_column_mappings enable row level security;
create policy "Authenticated full access — csv_column_mappings"
  on csv_column_mappings for all to authenticated using (true) with check (true);

-- ─── WEBHOOK_CONFIGS ─────────────────────────────────────────────────────────

create table if not exists webhook_configs (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  name             text not null,
  secret           text not null unique,
  source_type      text not null default 'LEMLIST_WATCHER',
  default_warmth   text not null default 'WARM'
                     check (default_warmth in ('WARM','COLD','UNKNOWN')),
  default_segment  text,
  active           boolean not null default true,
  last_received_at timestamptz,
  total_received   integer not null default 0
);

create trigger webhook_configs_updated_at
  before update on webhook_configs
  for each row execute function update_updated_at_column();

alter table webhook_configs enable row level security;
create policy "Authenticated full access — webhook_configs"
  on webhook_configs for all to authenticated using (true) with check (true);

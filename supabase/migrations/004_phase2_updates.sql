-- Phase 2: companies enhancements, suppression_list, company_signal_history

-- ─── COMPANIES: add missing columns ──────────────────────────────────────────

alter table companies
  add column if not exists domain              text,
  add column if not exists priority_sports     text,
  add column if not exists priority_regions    text,
  add column if not exists last_activity_at    timestamptz;

create index if not exists idx_companies_domain      on companies (lower(domain));
create index if not exists idx_companies_name_lower  on companies (lower(name));

-- ─── SUPPRESSION_LIST ────────────────────────────────────────────────────────
-- Clean Phase 2 suppression table (replaces the older suppressions table)

create table if not exists suppression_list (
  id               uuid primary key default uuid_generate_v4(),
  created_at       timestamptz not null default now(),
  suppression_type text not null check (suppression_type in (
                     'SHIKENSO_CUSTOMER','PARTNER_CONFLICT',
                     'INTERNAL_OWNED','DO_NOT_CONTACT'
                   )),
  match_type       text not null check (match_type in (
                     'DOMAIN','COMPANY_NAME','EMAIL','LINKEDIN_URL'
                   )),
  match_value      text not null,
  reason           text,
  added_by         text default 'system'
);

create index if not exists idx_suppression_match on suppression_list (lower(match_value));

alter table suppression_list enable row level security;
create policy "Authenticated full access — suppression_list"
  on suppression_list for all to authenticated using (true) with check (true);

-- ─── SEED: Shikenso customers ─────────────────────────────────────────────────

insert into suppression_list (suppression_type, match_type, match_value, reason) values
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'DFL',                'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Deutsche Fußball Liga', 'Existing Shikenso customer — DFL'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Pro League',         'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Club Brugge',        'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'EFG',                'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'ESL FACEIT Group',   'Existing Shikenso customer — EFG'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Volleyball World',   'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'BLAST',              'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Sportfive',          'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Esports World Cup',  'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Vodafone',           'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'OMG',                'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'KAA Gent',           'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Niké League',        'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'HAVAS',              'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Belgian Cycling',    'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'The Icon League',    'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Team Liquid',        'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Visit Qatar',        'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Vitality',           'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'MOONTON Games',      'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'GIANTX',             'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'KRÜ Esports',        'Existing Shikenso customer'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'WPP Media',          'Existing Shikenso customer');

-- ─── COMPANY_SIGNAL_HISTORY ───────────────────────────────────────────────────

create table if not exists company_signal_history (
  id                uuid primary key default uuid_generate_v4(),
  created_at        timestamptz not null default now(),
  company_id        uuid not null references companies(id) on delete cascade,
  signal_type       text,
  signal_value      text,
  fired_at          timestamptz not null default now(),
  resulted_in_lead  boolean not null default false
);

create index if not exists idx_signal_history_company on company_signal_history (company_id);

alter table company_signal_history enable row level security;
create policy "Authenticated full access — company_signal_history"
  on company_signal_history for all to authenticated using (true) with check (true);

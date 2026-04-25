-- ─── COMPANIES ───────────────────────────────────────────────────────────────

create table if not exists companies (
  id                   uuid primary key default uuid_generate_v4(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  name                 text not null,
  website              text,
  linkedin_company_url text,
  industry             text,
  size_range           text,
  country              text,
  region               text,

  segment              text check (segment in ('Rights Holder','Brand','Agency','Club')),
  sponsorship_activity text check (sponsorship_activity in ('YES','LIKELY','UNCLEAR','NO')),

  target_tier          text not null default 'NONE'
                         check (target_tier in ('TIER_1','TIER_2','TIER_3','NONE')),
  account_state        text not null default 'NEW'
                         check (account_state in (
                           'NEW','ACTIVE','CONTACTED','RESPONDED',
                           'IN_OPPORTUNITY','CUSTOMER','SUPPRESSED'
                         )),
  notes                text
);

create trigger companies_updated_at
  before update on companies
  for each row execute function update_updated_at_column();

-- Add company FK to leads (nullable — existing leads have no company yet)
alter table leads add column if not exists company_id uuid references companies(id);

-- ─── SUPPRESSIONS ─────────────────────────────────────────────────────────────

create table if not exists suppressions (
  id          uuid primary key default uuid_generate_v4(),
  created_at  timestamptz not null default now(),
  type        text not null check (type in (
                'SHIKENSO_CUSTOMER','PARTNER_CONFLICT',
                'INTERNAL_OWNED','DO_NOT_CONTACT'
              )),
  match_type  text not null check (match_type in (
                'DOMAIN','COMPANY_NAME','EMAIL','LINKEDIN_URL'
              )),
  value       text not null,
  notes       text,
  is_active   boolean not null default true
);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

alter table companies   enable row level security;
alter table suppressions enable row level security;

create policy "Authenticated full access — companies"
  on companies for all to authenticated using (true) with check (true);

create policy "Authenticated full access — suppressions"
  on suppressions for all to authenticated using (true) with check (true);

-- ─── SEED: Shikenso customers → suppression list ─────────────────────────────

insert into suppressions (type, match_type, value, notes) values
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'DFL',                'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Pro League',         'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Club Brugge',        'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'EFG',                'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Volleyball World',   'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'BLAST',              'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Sportfive',          'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Esports World Cup',  'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Vodafone',           'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'OMG',                'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'KAA Gent',           'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Niké League',        'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'HAVAS',              'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Belgian Cycling',    'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'The Icon League',    'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Team Liquid',        'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Visit Qatar',        'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'Vitality',           'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'MOONTON Games',      'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'GIANTX',             'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'KRÜ Esports',        'Shikenso customer — do not prospect'),
  ('SHIKENSO_CUSTOMER', 'COMPANY_NAME', 'WPP Media',          'Shikenso customer — do not prospect');

-- Migration 006: Architectural adjustments
-- Run AFTER migrations 001–005b

-- ─── PART A1: TIER 3 REMOVAL ─────────────────────────────────────────────────

-- Migrate TIER_2 and TIER_3 → ACTIVE
update companies set target_tier = 'ACTIVE' where target_tier in ('TIER_2', 'TIER_3');

-- Update check constraint to new tier enum
do $$
begin
  alter table companies drop constraint if exists companies_target_tier_check;
exception when others then null;
end $$;

alter table companies
  add constraint companies_target_tier_check
  check (target_tier in ('TIER_1', 'ACTIVE', 'NONE'));

-- ─── PART A2: REMOVE VERSIONING ──────────────────────────────────────────────

-- Drop all version triggers
drop trigger if exists trg_version_kb_icp_segments    on kb_icp_segments;
drop trigger if exists trg_version_kb_products         on kb_products;
drop trigger if exists trg_version_kb_proof_points     on kb_proof_points;
drop trigger if exists trg_version_kb_competitors      on kb_competitors;
drop trigger if exists trg_version_kb_signal_keywords  on kb_signal_keywords;
drop trigger if exists trg_version_kb_copy_preferences on kb_copy_preferences;

-- Drop the version capture function
drop function if exists kb_capture_version();

-- Drop kb_version_history table entirely
drop table if exists kb_version_history;

-- Remove version columns from all KB tables
alter table kb_icp_segments     drop column if exists version;
alter table kb_products         drop column if exists version;
alter table kb_proof_points     drop column if exists version;
alter table kb_competitors      drop column if exists version;
alter table kb_signal_keywords  drop column if exists version;
alter table kb_copy_preferences drop column if exists version;

-- Also drop kb_edit_history (older versioning table from Phase 1)
drop table if exists kb_edit_history;

-- ─── PART C: COMPUTED ACCOUNT STATE ──────────────────────────────────────────

-- Remove the stored account_state column
alter table companies drop column if exists account_state;

-- Create a view that computes account_state dynamically from leads + suppression_list
create or replace view companies_with_state as
select
  c.*,
  case
    when exists (
      select 1 from suppression_list sl
      where sl.match_type = 'COMPANY_NAME'
      and lower(sl.match_value) = lower(c.name)
    ) or exists (
      select 1 from suppression_list sl
      where sl.match_type = 'DOMAIN'
      and lower(sl.match_value) = lower(coalesce(c.domain, ''))
      and c.domain is not null and c.domain != ''
    ) then 'SUPPRESSED'
    when exists (
      select 1 from leads l
      where l.company_id = c.id and l.status = 'IN_OPPORTUNITY'
    ) then 'IN_OPPORTUNITY'
    when exists (
      select 1 from leads l
      where l.company_id = c.id and l.status = 'RESPONDED'
    ) then 'RESPONDED'
    when exists (
      select 1 from leads l
      where l.company_id = c.id and l.status = 'SEQUENCED'
    ) then 'CONTACTED'
    when exists (
      select 1 from leads l where l.company_id = c.id
    ) then 'ACTIVE'
    else 'NEW'
  end as account_state
from companies c;

-- ─── PART D1: CONVERSATIONS TABLE ────────────────────────────────────────────

create table if not exists conversations (
  id                  uuid primary key default uuid_generate_v4(),
  created_at          timestamptz not null default now(),
  lead_id             uuid not null references leads(id) on delete cascade,
  channel             text not null check (channel in ('EMAIL','LINKEDIN','NOTE')),
  direction           text not null check (direction in ('SENT','RECEIVED','INTERNAL')),
  subject             text,
  body                text not null default '',
  sent_at             timestamptz not null default now(),
  sentiment           text check (sentiment in (
                        'INTERESTED','NOT_NOW','NOT_FIT',
                        'OOO','UNSUBSCRIBE','NEUTRAL'
                      )),
  classified_at       timestamptz,
  external_message_id text,
  notes               text
);

create index if not exists idx_conversations_lead on conversations (lead_id);
create index if not exists idx_conversations_sent on conversations (sent_at desc);

alter table conversations enable row level security;
create policy "Authenticated full access — conversations"
  on conversations for all to authenticated using (true) with check (true);

-- ─── PART D2: EXTEND LEADS TABLE ─────────────────────────────────────────────

-- Add sequence tracking fields
alter table leads
  add column if not exists sequence_step         integer,
  add column if not exists sequence_status       text check (sequence_status in (
                             'NOT_STARTED','ACTIVE','PAUSED',
                             'COMPLETED','REPLIED','BOUNCED'
                           )),
  add column if not exists last_touch_at         timestamptz,
  add column if not exists next_touch_at         timestamptz,
  add column if not exists lemlist_campaign_id   text,
  add column if not exists lemlist_lead_id       text,
  add column if not exists reply_received_at     timestamptz,
  add column if not exists hubspot_pushed_at     timestamptz,
  add column if not exists hubspot_deal_id       text,
  add column if not exists signal_freshness_score numeric check (
                             signal_freshness_score >= 0
                             and signal_freshness_score <= 1
                           );

-- Update leads.status enum — drop old constraint, add new one
do $$
begin
  alter table leads drop constraint if exists leads_status_check;
exception when others then null;
end $$;

-- Migrate old PUSHED → PUSHED_TO_HUBSPOT
update leads set status = 'PUSHED_TO_HUBSPOT' where status = 'PUSHED';

alter table leads
  add constraint leads_status_check
  check (status in (
    'PENDING',
    'NEEDS_RESEARCH',
    'APPROVED',
    'REJECTED',
    'SEQUENCED',
    'RESPONDED',
    'QUALIFIED',
    'PUSHED_TO_HUBSPOT'
  ));

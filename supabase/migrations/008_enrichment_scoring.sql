-- Phase 5: Enrichment + Scoring schema extensions

-- ─── EXTEND LEADS TABLE ──────────────────────────────────────────────────────

alter table leads
  add column if not exists enrichment_status       text check (enrichment_status in ('PENDING','IN_PROGRESS','COMPLETE','FAILED')),
  add column if not exists enrichment_completed_at timestamptz,
  add column if not exists enrichment_source       text,
  add column if not exists enrichment_error        text,
  add column if not exists fit_score               integer check (fit_score >= 0 and fit_score <= 100),
  add column if not exists intent_score            integer check (intent_score >= 0 and intent_score <= 100),
  add column if not exists reachability_score      integer check (reachability_score >= 0 and reachability_score <= 100),
  add column if not exists segment_confidence      text check (segment_confidence in ('HIGH','MEDIUM','LOW')),
  add column if not exists disqualified            boolean not null default false,
  add column if not exists disqualification_reason text,
  add column if not exists scoring_completed_at    timestamptz,
  add column if not exists scoring_model_version   text;

-- Add index on priority for queue sorting
create index if not exists idx_leads_priority   on leads (priority) where priority is not null;
create index if not exists idx_leads_icp_score  on leads (icp_score desc) where icp_score is not null;

-- ─── SCORING_RUNS TABLE ──────────────────────────────────────────────────────

create table if not exists scoring_runs (
  id              uuid primary key default uuid_generate_v4(),
  created_at      timestamptz not null default now(),
  lead_id         uuid not null references leads(id) on delete cascade,
  run_type        text not null check (run_type in ('INITIAL_SCORE','RE_SCORE','MANUAL_TRIGGER')),
  prompt_version  text,
  input_tokens    integer,
  output_tokens   integer,
  api_cost_usd    numeric(10,6),
  duration_ms     integer,
  success         boolean not null default false,
  error_message   text,
  raw_response    jsonb
);

create index if not exists idx_scoring_runs_lead    on scoring_runs (lead_id);
create index if not exists idx_scoring_runs_created on scoring_runs (created_at desc);

alter table scoring_runs enable row level security;
create policy "Authenticated full access — scoring_runs"
  on scoring_runs for all to authenticated using (true) with check (true);

-- ─── EXTEND COMPANIES TABLE ──────────────────────────────────────────────────

alter table companies
  add column if not exists enrichment_status       text check (enrichment_status in ('PENDING','IN_PROGRESS','COMPLETE','FAILED')),
  add column if not exists enrichment_completed_at timestamptz,
  add column if not exists last_enriched_at        timestamptz,
  add column if not exists description             text,
  add column if not exists sponsorship_evidence    text;

-- Phase 6: Review Queue + Replies + Qualification

-- ─── scoring_runs: add REPLY_CLASSIFICATION ──────────────────────────────────

do $$ begin
  alter table scoring_runs drop constraint if exists scoring_runs_run_type_check;
exception when others then null;
end $$;

alter table scoring_runs add constraint scoring_runs_run_type_check
  check (run_type in (
    'INITIAL_SCORE','RE_SCORE','MANUAL_TRIGGER','REPLY_CLASSIFICATION'
  ));

-- ─── EXTEND LEADS TABLE ──────────────────────────────────────────────────────

alter table leads
  add column if not exists last_reply_at         timestamptz,
  add column if not exists reply_sentiment        text check (reply_sentiment in (
                             'INTERESTED','NOT_NOW','NOT_FIT',
                             'OOO','UNSUBSCRIBE','NEUTRAL'
                           )),
  add column if not exists reply_count            integer not null default 0,
  add column if not exists qualification_status   text check (qualification_status in (
                             'PENDING','QUALIFIED','NOT_QUALIFIED','NURTURE'
                           )),
  add column if not exists manually_promoted      boolean not null default false,
  add column if not exists manually_promoted_at   timestamptz,
  add column if not exists manually_promoted_by   text;

-- Update leads status to include BACKLOG
do $$ begin
  alter table leads drop constraint if exists leads_status_check;
exception when others then null;
end $$;

alter table leads add constraint leads_status_check
  check (status in (
    'PENDING','NEEDS_RESEARCH','APPROVED','REJECTED',
    'SEQUENCED','RESPONDED','QUALIFIED','PUSHED_TO_HUBSPOT','BACKLOG'
  ));

-- ─── EXTEND REJECTIONS TABLE ─────────────────────────────────────────────────

alter table rejections add column if not exists rejected_by text;

do $$ begin
  alter table rejections drop constraint if exists rejections_reason_tag_check;
exception when others then null;
end $$;

alter table rejections add constraint rejections_reason_tag_check
  check (reason_tag in (
    'TOO_SMALL','WRONG_REGION','NO_SPONSORSHIP','WRONG_SEGMENT',
    'ALREADY_CUSTOMER','BAD_FIT_TITLE','BAD_TIMING','OTHER'
  ));

-- ─── QUALIFICATIONS TABLE ────────────────────────────────────────────────────

create table if not exists qualifications (
  id                    uuid primary key default uuid_generate_v4(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  lead_id               uuid not null references leads(id) on delete cascade,

  budget_signal         boolean,
  budget_notes          text,

  decision_maker        boolean,
  decision_maker_notes  text,

  pain_identified       boolean,
  pain_notes            text,

  timeline_indicated    boolean,
  timeline_notes        text,

  competitor_in_play    text,
  competitor_notes      text,

  suggested_ae          text,
  handoff_notes         text,

  qualified             boolean,
  qualification_status  text check (qualification_status in (
                          'PENDING','QUALIFIED','NOT_QUALIFIED','NURTURE'
                        )),

  pushed_to_hubspot     boolean not null default false,
  pushed_at             timestamptz
);

create trigger qualifications_updated_at
  before update on qualifications
  for each row execute function update_updated_at_column();

alter table qualifications enable row level security;
create policy "Authenticated full access — qualifications"
  on qualifications for all to authenticated using (true) with check (true);

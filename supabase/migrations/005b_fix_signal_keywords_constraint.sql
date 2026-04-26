-- Fix: clear old signal keywords BEFORE applying the new constraint
-- Run this if migration 005 failed on the kb_signal_keywords constraint

-- Step 1: drop the old constraint (catch error if it doesn't exist)
do $$
begin
  alter table kb_signal_keywords drop constraint if exists kb_signal_keywords_signal_source_check;
exception when others then null;
end $$;

-- Step 2: clear old rows (old values used lowercase, new ones use UPPERCASE)
delete from kb_signal_keywords;

-- Step 3: add the new constraint now that the table is empty
alter table kb_signal_keywords
  add constraint kb_signal_keywords_signal_source_check
  check (signal_source in ('GOOGLE_ALERTS','LINKEDIN_JOBS','LEMLIST_WATCHER','OTHER'));

-- Step 4: re-seed with correct values
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

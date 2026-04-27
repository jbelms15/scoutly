-- Fix: leads.segment constraint doesn't match KB segment names.
-- Claude returns "Club & Team" and "Unknown" which are rejected by the old constraint,
-- causing the scoring update to fail silently.

do $$
declare c text;
begin
  select constraint_name into c
  from information_schema.table_constraints
  where table_name = 'leads'
    and constraint_type = 'CHECK'
    and constraint_name ilike '%segment%';
  if c is not null then
    execute 'alter table leads drop constraint ' || c;
  end if;
end $$;

-- Also fix companies.segment constraint for the same reason
do $$
declare c text;
begin
  select constraint_name into c
  from information_schema.table_constraints
  where table_name = 'companies'
    and constraint_type = 'CHECK'
    and constraint_name ilike '%segment%';
  if c is not null then
    execute 'alter table companies drop constraint ' || c;
  end if;
end $$;

-- Segment is now free text — validated at the application/KB layer, not DB layer
-- Valid values: 'Rights Holder', 'Brand', 'Agency', 'Club & Team', 'Unknown'

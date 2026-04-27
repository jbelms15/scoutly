-- Fix: leads.priority constraint rejects DISQUALIFIED value returned by Claude scoring.

do $$
declare c text;
begin
  select constraint_name into c
  from information_schema.table_constraints
  where table_name = 'leads'
    and constraint_type = 'CHECK'
    and constraint_name ilike '%priority%';
  if c is not null then
    execute 'alter table leads drop constraint ' || c;
  end if;
end $$;

alter table leads
  add constraint leads_priority_check
  check (priority in ('HOT','WARM','COLD','DISQUALIFIED'));

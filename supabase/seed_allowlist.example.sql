-- Template for the member allowlist. Copy to seed_allowlist.sql (gitignored), fill in, then run it in the
-- Supabase SQL Editor. Emails must be lowercase. Squad is null for the Campus Manager.
-- Roles: student | squad_lead | campus_manager | admin

insert into public.allowed_emails (email, full_name, squad, role) values
  ('first.last.s91@kalvium.community', 'First Last', 91, 'student'),
  ('campus.manager@kalvium.community', 'Campus Manager', null, 'campus_manager')
on conflict (email) do update
  set full_name = excluded.full_name, squad = excluded.squad, role = excluded.role;

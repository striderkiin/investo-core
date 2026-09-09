-- ==================================================================
-- INVESTO CORE SUITE — incremental schema bootstrap for public-facing
-- page access (migration 0020): anonymous read of active investment
-- plans (landing page) and the contact_messages table backing the
-- public Contact page. Run this AFTER 001, 003, 004, 005, and 006.
-- ==================================================================

begin;

-- Front-facing public pages: the landing page needs to show real investment
-- plan data to logged-out visitors, and the Contact page needs a place to
-- land inquiries from people who don't have an account yet.

-- 1. Investment plans were only readable by `authenticated` (0007_row_level_
--    security.sql). Plan names/rates/limits are marketing information, not
--    sensitive — allow anonymous visitors to read active plans too, same
--    condition the authenticated policy already uses.
create policy investment_plans_select_public on investment_plans for select to anon
  using (status = 'active');

-- 2. Contact page submissions. Deliberately NOT part of support_tickets:
--    that table's user_id is NOT NULL and its RLS is scoped to auth.uid(),
--    by design, for the authenticated in-dashboard Support Center. A public
--    "Contact Us" form serves prospects who may have no account at all, so
--    it gets its own minimal table rather than weakening support_tickets'
--    constraints. Admins still triage it from the same Support area of the
--    admin panel.
create type contact_message_status as enum ('new', 'read', 'responded', 'closed');

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status contact_message_status not null default 'new',
  submitted_by uuid references profiles(id) on delete set null,
  responded_by uuid references profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_contact_messages_status on contact_messages(status);
create index idx_contact_messages_created_at on contact_messages(created_at desc);

alter table contact_messages enable row level security;

-- Anyone — logged in or not — can submit a contact message.
create policy contact_messages_insert on contact_messages for insert
  to anon, authenticated with check (true);

-- Never trust a client-supplied submitted_by — stamp it server-side from the
-- session (null for an anonymous visitor) so an authenticated caller can't
-- attribute their message to a different user.
create or replace function stamp_contact_message_submitter()
returns trigger as $$
begin
  NEW.submitted_by := auth.uid();
  return NEW;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_stamp_contact_message_submitter
  before insert on contact_messages
  for each row execute function stamp_contact_message_submitter();

-- Only staff who can already see support tickets can read/triage these.
create policy contact_messages_select on contact_messages for select
  to authenticated using (has_permission('support.read'));

create policy contact_messages_update on contact_messages for update
  to authenticated using (has_permission('support.manage')) with check (has_permission('support.manage'));

do $$
declare
  t text;
begin
  foreach t in array array['contact_messages'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;

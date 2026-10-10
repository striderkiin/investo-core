-- HQ: the owner's private control panel for every buyer's site.
-- Only people listed in hq_owners, signed in with 2FA, can read or change
-- anything here. Nothing in this database is reachable by buyers.

create extension if not exists pgcrypto with schema extensions;

-- People allowed into HQ. Rows are added by hand (SQL), never from the app.
create table public.hq_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.hq_owners enable row level security;

create or replace function public.is_hq_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.hq_owners where user_id = auth.uid())
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;
revoke all on function public.is_hq_owner() from public, anon;
grant execute on function public.is_hq_owner() to authenticated;

-- Signed in, listed as an owner, but 2FA not done yet. The app uses this to
-- send the owner to the 2FA step instead of showing "no access".
create or replace function public.hq_owner_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not exists (select 1 from public.hq_owners where user_id = auth.uid()) then 'not_owner'
    when coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' then 'needs_2fa'
    else 'ok'
  end;
$$;
revoke all on function public.hq_owner_status() from public, anon;
grant execute on function public.hq_owner_status() to authenticated;

create policy "Owners can see owners" on public.hq_owners for select to authenticated using (public.is_hq_owner());

-- Prices and defaults. Always exactly one row.
create table public.hq_settings (
  id smallint primary key default 1 check (id = 1),
  launch_fee numeric(10, 2) not null default 400,
  monthly_fee numeric(10, 2) not null default 49,
  yearly_fee numeric(10, 2) not null default 490,
  parking_fee numeric(10, 2) not null default 15,
  grace_days integer not null default 5 check (grace_days between 0 and 60),
  default_region text not null default 'eu-central-1',
  updated_at timestamptz not null default now()
);
insert into public.hq_settings (id) values (1);
alter table public.hq_settings enable row level security;
create policy "Owners can read settings" on public.hq_settings for select to authenticated using (public.is_hq_owner());
create policy "Owners can change settings" on public.hq_settings for update to authenticated using (public.is_hq_owner()) with check (public.is_hq_owner());

create table public.buyers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact text check (contact is null or length(contact) <= 200),
  notes text check (notes is null or length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.buyers enable row level security;
create policy "Owners manage buyers" on public.buyers for all to authenticated using (public.is_hq_owner()) with check (public.is_hq_owner());

create type public.site_status as enum ('setting_up', 'live', 'parked', 'cancelled');
create type public.billing_cycle as enum ('monthly', 'yearly');

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.buyers (id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 120),
  domain text check (domain is null or domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  temp_url text check (temp_url is null or temp_url ~ '^https://'),
  status public.site_status not null default 'setting_up',
  billing_cycle public.billing_cycle not null default 'monthly',
  monthly_fee numeric(10, 2) not null,
  region text not null,
  supabase_ref text check (supabase_ref is null or supabase_ref ~ '^[a-z0-9]{20}$'),
  paid_until date,
  notes text check (notes is null or length(notes) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sites_buyer_id_idx on public.sites (buyer_id);
create unique index sites_domain_key on public.sites (domain) where domain is not null;
alter table public.sites enable row level security;
create policy "Owners manage sites" on public.sites for all to authenticated using (public.is_hq_owner()) with check (public.is_hq_owner());

create type public.payment_kind as enum ('launch', 'monthly', 'yearly', 'parking', 'custom');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites (id) on delete restrict,
  kind public.payment_kind not null,
  amount numeric(10, 2) not null check (amount >= 0),
  method text check (method is null or length(method) <= 60),
  reference text check (reference is null or length(reference) <= 200),
  note text check (note is null or length(note) <= 1000),
  paid_at date not null default current_date,
  paid_until_after date,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index payments_site_id_idx on public.payments (site_id, paid_at desc);
alter table public.payments enable row level security;
-- Payments are added only through record_payment, so the paid-until date
-- always moves with them. Owners can read and remove them.
create policy "Owners read payments" on public.payments for select to authenticated using (public.is_hq_owner());

-- What happened to each site, newest first.
create table public.site_events (
  id bigint generated always as identity primary key,
  site_id uuid not null references public.sites (id) on delete cascade,
  kind text not null,
  detail text,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index site_events_site_id_idx on public.site_events (site_id, created_at desc);
alter table public.site_events enable row level security;
create policy "Owners read site events" on public.site_events for select to authenticated using (public.is_hq_owner());

create or replace function public.hq_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger buyers_touch before update on public.buyers for each row execute function public.hq_touch_updated_at();
create trigger sites_touch before update on public.sites for each row execute function public.hq_touch_updated_at();
create trigger hq_settings_touch before update on public.hq_settings for each row execute function public.hq_touch_updated_at();

create or replace function public.log_site_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.site_events (site_id, kind, detail) values (new.id, 'created', 'Site added');
  elsif new.status is distinct from old.status then
    insert into public.site_events (site_id, kind, detail)
    values (new.id, 'status', format('Status changed from %s to %s', old.status, new.status));
  end if;
  if tg_op = 'UPDATE' and new.domain is distinct from old.domain then
    insert into public.site_events (site_id, kind, detail)
    values (new.id, 'domain', format('Domain set to %s', coalesce(new.domain, 'none')));
  end if;
  return new;
end;
$$;
create trigger sites_log after insert or update on public.sites for each row execute function public.log_site_change();

-- Records a payment and moves the site's paid-until date.
--   launch: covers the first month
--   monthly: one month, yearly: twelve months, parking: one month parked
--   custom: no change to the date
-- Time is added from the later of today and the current paid-until date, so
-- paying early never loses days and paying late does not back-date.
create or replace function public.record_payment(
  p_site_id uuid,
  p_kind public.payment_kind,
  p_amount numeric,
  p_method text default null,
  p_reference text default null,
  p_note text default null,
  p_paid_at date default current_date
)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site public.sites%rowtype;
  v_from date;
  v_until date;
begin
  if not public.is_hq_owner() then
    raise exception 'Not allowed';
  end if;
  if p_amount is null or p_amount < 0 then
    raise exception 'Amount must be zero or more';
  end if;

  select * into v_site from public.sites where id = p_site_id for update;
  if not found then
    raise exception 'Site not found';
  end if;

  v_from := greatest(coalesce(v_site.paid_until, p_paid_at), p_paid_at);
  v_until := case p_kind
    when 'launch' then (v_from + interval '1 month')::date
    when 'monthly' then (v_from + interval '1 month')::date
    when 'yearly' then (v_from + interval '12 months')::date
    when 'parking' then (v_from + interval '1 month')::date
    else v_site.paid_until
  end;

  insert into public.payments (site_id, kind, amount, method, reference, note, paid_at, paid_until_after)
  values (p_site_id, p_kind, p_amount, nullif(trim(p_method), ''), nullif(trim(p_reference), ''), nullif(trim(p_note), ''), p_paid_at, v_until);

  update public.sites
     set paid_until = v_until,
         billing_cycle = case when p_kind = 'yearly' then 'yearly'::public.billing_cycle when p_kind = 'monthly' then 'monthly'::public.billing_cycle else billing_cycle end,
         status = case when p_kind = 'parking' then 'parked'::public.site_status else status end
   where id = p_site_id;

  insert into public.site_events (site_id, kind, detail)
  values (p_site_id, 'payment', format('%s payment of $%s recorded%s', initcap(p_kind::text), p_amount,
    case when v_until is distinct from v_site.paid_until then format(', paid until %s', v_until) else '' end));

  return v_until;
end;
$$;
revoke all on function public.record_payment(uuid, public.payment_kind, numeric, text, text, text, date) from public, anon;
grant execute on function public.record_payment(uuid, public.payment_kind, numeric, text, text, text, date) to authenticated;

-- Each site with its billing state worked out:
--   paid: paid until today or later
--   grace: up to grace_days past the paid-until date
--   overdue: past the grace period (step 5 will lock these sites)
--   unpaid: no payment yet
create view public.site_overview
with (security_invoker = true)
as
select
  s.*,
  b.name as buyer_name,
  case
    when s.status in ('cancelled') then 'cancelled'
    when s.paid_until is null then 'unpaid'
    when s.paid_until >= current_date then 'paid'
    when s.paid_until + st.grace_days >= current_date then 'grace'
    else 'overdue'
  end as billing_state,
  case when s.paid_until is null then null else s.paid_until - current_date end as days_left
from public.sites s
join public.buyers b on b.id = s.buyer_id
cross join public.hq_settings st;

revoke select, insert, update, delete, truncate, references, trigger on public.hq_owners, public.hq_settings, public.buyers, public.sites, public.payments, public.site_events, public.site_overview from anon;
grant select, insert, update, delete on public.buyers, public.sites to authenticated;
grant select, update on public.hq_settings to authenticated;
grant select on public.payments, public.site_events, public.hq_owners, public.site_overview to authenticated;

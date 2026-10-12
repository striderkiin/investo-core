-- Subscription state for hosted sites, written by HQ (the owner's control
-- panel) through the database itself. Nobody on the site can change it:
-- there is no insert, update or delete policy, so only the database owner
-- (HQ) can write it.
--
--   active: normal
--   grace:  payment is late; the admin panel shows a reminder
--   locked: payment is overdue; new deposits and new investments are refused.
--           Withdrawals keep working so customers can always get their money.
--
-- A site that is not run from HQ simply stays active.

create table if not exists public.license_state (
  id smallint primary key default 1 check (id = 1),
  status text not null default 'active' check (status in ('active', 'grace', 'locked')),
  paid_until date,
  locks_on date,
  message text check (message is null or length(message) <= 500),
  checked_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.license_state (id) values (1) on conflict (id) do nothing;

alter table public.license_state enable row level security;

drop policy if exists license_state_read on public.license_state;
create policy license_state_read on public.license_state for select using (true);

revoke all on public.license_state from anon, authenticated;
grant select on public.license_state to anon, authenticated;

create or replace function public.site_is_locked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select status = 'locked' from public.license_state where id = 1), false);
$$;
revoke all on function public.site_is_locked() from public;
grant execute on function public.site_is_locked() to anon, authenticated;

create or replace function public.refuse_when_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.site_is_locked() then
    raise exception 'This site is paused. New deposits and investments are not available right now. Withdrawals work as normal.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deposits_license on public.deposits;
create trigger trg_deposits_license
  before insert on public.deposits
  for each row execute function public.refuse_when_locked();

drop trigger if exists trg_investments_license on public.investments;
create trigger trg_investments_license
  before insert on public.investments
  for each row execute function public.refuse_when_locked();

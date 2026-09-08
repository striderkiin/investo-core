-- Phase 1: Roles, permissions, and profiles (linked to auth.users)

create extension if not exists "pgcrypto";

create type role_name as enum ('super_admin', 'finance_admin', 'support_admin', 'operations_admin', 'client');
create type account_status as enum ('active', 'restricted', 'withdrawal_freeze', 'suspended', 'frozen');

create table roles (
  name role_name primary key,
  description text not null default ''
);

insert into roles (name, description) values
  ('super_admin', 'Full platform access'),
  ('finance_admin', 'Manages deposits, withdrawals, treasury, financial data'),
  ('support_admin', 'Manages support tickets and user-facing communication'),
  ('operations_admin', 'Manages announcements, investment plans, branding'),
  ('client', 'Standard platform user');

create table permissions (
  key text primary key,
  description text not null default ''
);

insert into permissions (key, description) values
  ('users.read', 'View users'),
  ('users.write', 'Edit users'),
  ('users.adjust_balance', 'Adjust user balances'),
  ('users.manage_status', 'Change account status (suspend/restrict/freeze)'),
  ('deposits.read', 'View deposits'),
  ('deposits.manage', 'Manage deposits'),
  ('withdrawals.read', 'View withdrawals'),
  ('withdrawals.approve', 'Approve/reject withdrawals'),
  ('transactions.read', 'View transactions'),
  ('treasury.read', 'View treasury'),
  ('treasury.manage', 'Manage treasury'),
  ('investments.read', 'View investment plans/investments'),
  ('investments.manage', 'Manage investment plans'),
  ('market.read', 'View market controls'),
  ('market.manage', 'Manage market controls'),
  ('referrals.read', 'View referral analytics'),
  ('support.read', 'View support tickets'),
  ('support.manage', 'Manage support tickets'),
  ('notifications.send', 'Send notifications'),
  ('announcements.manage', 'Manage announcements'),
  ('branding.manage', 'Manage branding'),
  ('white_label.manage', 'Manage white-label settings'),
  ('integrations.manage', 'Manage integrations'),
  ('integrations.read_secrets', 'Read masked integration credentials'),
  ('compliance.manage', 'Manage compliance settings'),
  ('security.manage', 'Manage security settings'),
  ('admins.manage', 'Manage admin accounts'),
  ('roles.manage', 'Manage roles/permissions'),
  ('audit.read', 'View audit logs'),
  ('settings.manage', 'Manage system settings'),
  ('environment.manage', 'Manage environment configuration');

create table role_permissions (
  role role_name not null references roles(name) on delete cascade,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (role, permission_key)
);

insert into role_permissions (role, permission_key)
select 'super_admin', key from permissions;

insert into role_permissions (role, permission_key) values
  ('finance_admin', 'users.read'),
  ('finance_admin', 'deposits.read'),
  ('finance_admin', 'deposits.manage'),
  ('finance_admin', 'withdrawals.read'),
  ('finance_admin', 'withdrawals.approve'),
  ('finance_admin', 'transactions.read'),
  ('finance_admin', 'treasury.read'),
  ('finance_admin', 'investments.read'),
  ('support_admin', 'users.read'),
  ('support_admin', 'transactions.read'),
  ('support_admin', 'support.read'),
  ('support_admin', 'support.manage'),
  ('support_admin', 'notifications.send'),
  ('operations_admin', 'announcements.manage'),
  ('operations_admin', 'investments.read'),
  ('operations_admin', 'investments.manage'),
  ('operations_admin', 'branding.manage'),
  ('operations_admin', 'market.read');

-- profiles: one row per auth.users, drives everything else
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  role role_name not null default 'client',
  account_status account_status not null default 'active',
  total_balance numeric(18,2) not null default 0,
  available_balance numeric(18,2) not null default 0,
  bonus_balance numeric(18,2) not null default 0,
  invested_balance numeric(18,2) not null default 0,
  referral_code text not null unique,
  referred_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on profiles(role);
create index idx_profiles_referred_by on profiles(referred_by);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create or replace function generate_referral_code()
returns text as $$
declare
  code text;
  exists_already boolean;
begin
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    select exists(select 1 from profiles where referral_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$ language plpgsql;

-- Auto-create a profile whenever a new auth user signs up.
create or replace function handle_new_user()
returns trigger as $$
declare
  referrer profiles%rowtype;
  submitted_code text;
begin
  submitted_code := new.raw_user_meta_data ->> 'referral_code';

  if submitted_code is not null then
    select * into referrer from profiles where referral_code = submitted_code;
  end if;

  insert into profiles (id, email, full_name, role, referral_code, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'client',
    generate_referral_code(),
    referrer.id
  );

  if referrer.id is not null then
    insert into referrals (referrer_id, referred_id) values (referrer.id, new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Helper used throughout RLS policies: does the current user hold `p_permission_key`?
-- NOTE: the parameter is deliberately NOT named `permission_key` — in a plain SQL
-- function body, a parameter name that collides with a column name is silently
-- resolved to the column (not the parameter), which previously turned this
-- check into the always-true `rp.permission_key = rp.permission_key`.
create or replace function has_permission(p_permission_key text)
returns boolean as $$
  select exists (
    select 1
    from profiles p
    join role_permissions rp on rp.role = p.role
    where p.id = auth.uid() and rp.permission_key = p_permission_key
  );
$$ language sql security definer stable set search_path = public;

create or replace function current_role_name()
returns role_name as $$
  select role from profiles where id = auth.uid();
$$ language sql security definer stable set search_path = public;

create or replace function is_admin()
returns boolean as $$
  select coalesce((select role != 'client' from profiles where id = auth.uid()), false);
$$ language sql security definer stable set search_path = public;

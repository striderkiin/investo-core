-- ==================================================================
-- INVESTO CORE SUITE — consolidated schema bootstrap for a hosted
-- Supabase project. Generated from supabase/migrations/0001-0009.
-- Paste this ENTIRE file into the Supabase SQL Editor and click Run.
-- Safe to run once against a fresh project. Wrapped in a transaction:
-- if anything fails, nothing is left half-applied.
-- ==================================================================

begin;

-- ---- 0001_roles_and_profiles.sql ----
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

-- ---- 0002_financial_core.sql ----
-- Phase 1/5: Financial core tables — plans, investments, transactions, deposits, withdrawals, treasury, wallets

create type investment_plan_rate_type as enum ('daily', 'weekly', 'monthly');
create type investment_plan_status as enum ('active', 'paused', 'inactive');
create type investment_status as enum ('active', 'completed', 'paused', 'cancelled');
create type transaction_type as enum ('deposit', 'withdrawal', 'investment', 'yield', 'bonus', 'referral', 'adjustment');
create type transaction_status as enum ('pending', 'processing', 'completed', 'failed', 'rejected');
create type deposit_status as enum ('pending', 'processing', 'completed', 'failed', 'rejected');
create type withdrawal_status as enum ('pending', 'review', 'processing', 'completed', 'rejected', 'failed');

create table investment_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  min_amount numeric(18,2) not null,
  max_amount numeric(18,2) not null,
  rate numeric(8,4) not null,
  rate_type investment_plan_rate_type not null default 'daily',
  duration_days integer not null,
  status investment_plan_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_plan_amounts check (max_amount >= min_amount)
);

create trigger trg_investment_plans_updated_at
  before update on investment_plans
  for each row execute function set_updated_at();

create table investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid not null references investment_plans(id) on delete restrict,
  amount numeric(18,2) not null check (amount > 0),
  rate numeric(8,4) not null,
  rate_type investment_plan_rate_type not null,
  duration_days integer not null,
  status investment_status not null default 'active',
  started_at timestamptz not null default now(),
  ends_at timestamptz not null,
  current_earnings numeric(18,2) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_investments_user on investments(user_id);
create index idx_investments_status on investments(status);

create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  currency text not null,
  network text not null,
  address text,
  created_at timestamptz not null default now(),
  unique (user_id, currency, network)
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type transaction_type not null,
  amount numeric(18,2) not null,
  balance_before numeric(18,2) not null,
  balance_after numeric(18,2) not null,
  status transaction_status not null default 'completed',
  reference text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create index idx_transactions_user on transactions(user_id);
create index idx_transactions_type on transactions(type);
create index idx_transactions_status on transactions(status);

create table deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  currency text not null,
  network text not null,
  provider text not null,
  provider_reference text,
  status deposit_status not null default 'pending',
  transaction_id uuid references transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_deposits_user on deposits(user_id);
create index idx_deposits_status on deposits(status);

create trigger trg_deposits_updated_at
  before update on deposits
  for each row execute function set_updated_at();

create table withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount numeric(18,2) not null check (amount > 0),
  fee numeric(18,2) not null default 0,
  currency text not null,
  network text not null,
  destination text not null,
  status withdrawal_status not null default 'pending',
  reviewed_by uuid references profiles(id) on delete set null,
  transaction_id uuid references transactions(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_withdrawals_user on withdrawals(user_id);
create index idx_withdrawals_status on withdrawals(status);

create trigger trg_withdrawals_updated_at
  before update on withdrawals
  for each row execute function set_updated_at();

create table treasury_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  balance numeric(18,2) not null default 0,
  reserve_balance numeric(18,2) not null default 0,
  environment text not null default 'development',
  updated_at timestamptz not null default now()
);

create trigger trg_treasury_accounts_updated_at
  before update on treasury_accounts
  for each row execute function set_updated_at();

insert into treasury_accounts (name, balance, reserve_balance, environment)
values ('primary', 0, 0, 'development');

-- ---- 0003_referrals_support_notifications.sql ----
-- Phase 1/2/5/8 foundation: referrals, support, notifications, announcements

create table referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referred_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (referrer_id, referred_id)
);

create index idx_referrals_referrer on referrals(referrer_id);

create table referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references referrals(id) on delete cascade,
  amount numeric(18,2) not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create type notification_type as enum (
  'deposit_confirmed', 'withdrawal_pending', 'withdrawal_processing', 'withdrawal_completed',
  'investment_started', 'investment_completed', 'referral_bonus', 'system_announcement',
  'new_user', 'large_withdrawal', 'failed_payment', 'security_alert', 'support_ticket'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user on notifications(user_id);
create index idx_notifications_unread on notifications(user_id) where read_at is null;

create type support_ticket_category as enum ('deposit', 'withdrawal', 'account', 'investment', 'technical', 'other');
create type support_ticket_status as enum ('open', 'in_progress', 'waiting', 'resolved', 'closed');

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  category support_ticket_category not null default 'other',
  status support_ticket_status not null default 'open',
  assigned_to uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_support_tickets_user on support_tickets(user_id);
create index idx_support_tickets_status on support_tickets(status);

create trigger trg_support_tickets_updated_at
  before update on support_tickets
  for each row execute function set_updated_at();

create table support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  is_admin boolean not null default false,
  message text not null,
  created_at timestamptz not null default now()
);

create index idx_support_messages_ticket on support_messages(ticket_id);

create type announcement_audience as enum ('everyone', 'clients', 'admins', 'specific_role');
create type announcement_delivery as enum ('banner', 'popup', 'notification', 'email');
create type announcement_type as enum ('maintenance_notice', 'promotion', 'system_update', 'important_notice');

create table announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type announcement_type not null default 'important_notice',
  audience announcement_audience not null default 'everyone',
  target_role role_name,
  delivery announcement_delivery[] not null default array['banner']::announcement_delivery[],
  is_active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---- 0004_platform_config.sql ----
-- Phase 1 DB foundation for later phases (6-9): branding, white-label, settings,
-- integrations, credentials, compliance, maintenance. Tables only — UI/business
-- logic for these lands in Phase 6+.

create table branding (
  id uuid primary key default gen_random_uuid(),
  site_name text not null default 'Investo',
  logo_url text,
  logo_light_url text,
  logo_dark_url text,
  favicon_url text,
  logo_text text,
  primary_color text not null default '#0d6efd',
  secondary_color text not null default '#6c757d',
  success_color text not null default '#198754',
  warning_color text not null default '#ffc107',
  danger_color text not null default '#dc3545',
  background_color text not null default '#f8f9fa',
  surface_color text not null default '#ffffff',
  text_color text not null default '#212529',
  theme text not null default 'light',
  primary_font text not null default 'Inter',
  heading_font text not null default 'Inter',
  updated_at timestamptz not null default now()
);

create trigger trg_branding_updated_at
  before update on branding
  for each row execute function set_updated_at();

insert into branding (site_name) values ('Investo');

create table white_label_settings (
  id uuid primary key default gen_random_uuid(),
  platform_name text not null default 'Investo',
  legal_business_name text not null default '',
  display_name text not null default 'Investo',
  short_description text not null default '',
  support_name text not null default '',
  support_email text not null default '',
  support_phone text not null default '',
  website text not null default '',
  primary_domain text,
  application_url text,
  api_url text,
  support_url text,
  domain_status text not null default 'not_configured',
  business_name text not null default '',
  business_registration_number text not null default '',
  business_address text not null default '',
  support_address text not null default '',
  country text not null default '',
  timezone text not null default 'UTC',
  default_currency text not null default 'USD',
  operating_regions text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);

create trigger trg_white_label_updated_at
  before update on white_label_settings
  for each row execute function set_updated_at();

insert into white_label_settings (platform_name, display_name) values ('Investo', 'Investo');

create table system_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null default 'Investo',
  support_email text not null default '',
  support_phone text not null default '',
  default_currency text not null default 'USD',
  timezone text not null default 'UTC',
  date_format text not null default 'YYYY-MM-DD',
  deposit_min numeric(18,2) not null default 10,
  deposit_max numeric(18,2) not null default 1000000,
  deposit_fee_percent numeric(6,3) not null default 0,
  deposit_enabled boolean not null default true,
  withdrawal_min numeric(18,2) not null default 10,
  withdrawal_max numeric(18,2) not null default 1000000,
  withdrawal_fee_percent numeric(6,3) not null default 0,
  withdrawal_daily_limit numeric(18,2) not null default 50000,
  withdrawal_processing_threshold numeric(18,2) not null default 5000,
  withdrawal_auto_process_limit numeric(18,2) not null default 500,
  withdrawal_enabled boolean not null default true,
  yield_enabled boolean not null default true,
  default_daily_rate numeric(8,4) not null default 1.0,
  default_weekly_rate numeric(8,4) not null default 7.0,
  default_monthly_rate numeric(8,4) not null default 30.0,
  email_verification_required boolean not null default true,
  two_factor_required boolean not null default false,
  session_timeout_minutes integer not null default 60,
  login_attempt_limit integer not null default 5,
  updated_at timestamptz not null default now()
);

create trigger trg_system_settings_updated_at
  before update on system_settings
  for each row execute function set_updated_at();

insert into system_settings (site_name) values ('Investo');

create table maintenance_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  pause_yield boolean not null default false,
  disable_withdrawals boolean not null default false,
  disable_deposits boolean not null default false,
  show_banner boolean not null default true,
  restrict_client_access boolean not null default false,
  allow_admin_access boolean not null default true,
  banner_title text not null default 'High Traffic Maintenance',
  banner_message text not null default 'Due to high volume, some services are temporarily unavailable.',
  updated_at timestamptz not null default now()
);

create trigger trg_maintenance_settings_updated_at
  before update on maintenance_settings
  for each row execute function set_updated_at();

insert into maintenance_settings default values;

create table integration_configs (
  id uuid primary key default gen_random_uuid(),
  provider_type text not null,
  provider_name text not null,
  environment text not null default 'sandbox',
  status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  last_tested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_type, environment)
);

create trigger trg_integration_configs_updated_at
  before update on integration_configs
  for each row execute function set_updated_at();

-- Credential *metadata* only. Actual secret values must never live here —
-- they belong in a server-side secret store; the frontend only ever sees
-- masked references like `credential_metadata.masked_key`.
create table credential_metadata (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references integration_configs(id) on delete cascade,
  masked_key text not null default '',
  masked_secret text not null default '',
  webhook_configured boolean not null default false,
  rotated_at timestamptz,
  rotated_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  reference text,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  received_at timestamptz not null default now()
);

create table compliance_settings (
  id uuid primary key default gen_random_uuid(),
  client_eligibility jsonb not null default '{}'::jsonb,
  identity_verification jsonb not null default '{}'::jsonb,
  risk_disclosures jsonb not null default '{}'::jsonb,
  jurisdiction_controls jsonb not null default '{}'::jsonb,
  transaction_monitoring jsonb not null default '{}'::jsonb,
  reporting jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger trg_compliance_settings_updated_at
  before update on compliance_settings
  for each row execute function set_updated_at();

insert into compliance_settings default values;

-- ---- 0005_market_and_activity.sql ----
-- Phase 4: Market engine + manual chart controls, plus Phase 8 activity/online-user simulation.

create type market_mode as enum ('automatic', 'manual');
create type automatic_market_behavior as enum ('stable', 'upward', 'downward', 'volatile', 'random');
create type market_trend as enum ('bullish', 'stable', 'bearish');
create type market_volatility as enum ('low', 'medium', 'high', 'extreme');

create table market_settings (
  id uuid primary key default gen_random_uuid(),
  mode market_mode not null default 'automatic',
  automatic_behavior automatic_market_behavior not null default 'stable',
  update_interval_ms integer not null default 3000,
  min_movement numeric(10,4) not null default 0.05,
  max_movement numeric(10,4) not null default 0.5,
  starting_value numeric(18,2) not null default 42580.25,
  manual_control_enabled boolean not null default false,
  market_value_control_enabled boolean not null default false,
  percentage_control_enabled boolean not null default false,
  trend_control_enabled boolean not null default false,
  volatility_control_enabled boolean not null default false,
  movement_control_enabled boolean not null default false,
  market_value_step numeric(18,2) not null default 100,
  percentage_step numeric(8,4) not null default 0.5,
  current_market_value numeric(18,2) not null default 42580.25,
  current_percentage_change numeric(8,4) not null default 2.8,
  current_trend market_trend not null default 'bullish',
  current_volatility market_volatility not null default 'medium',
  movement_strength integer not null default 3 check (movement_strength between 1 and 5),
  preview_mode boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger trg_market_settings_updated_at
  before update on market_settings
  for each row execute function set_updated_at();

insert into market_settings default values;

create table market_data (
  id uuid primary key default gen_random_uuid(),
  value numeric(18,2) not null,
  percentage_change numeric(8,4) not null default 0,
  trend market_trend not null default 'stable',
  is_manual boolean not null default false,
  recorded_at timestamptz not null default now()
);

create index idx_market_data_recorded_at on market_data(recorded_at desc);

create table market_control_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table activity_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  frequency text not null default 'medium',
  events_per_hour integer not null default 20,
  variation_level text not null default 'medium',
  event_types text[] not null default array['deposit','withdrawal','investment','referral_bonus','plan_upgrade'],
  updated_at timestamptz not null default now()
);

create trigger trg_activity_settings_updated_at
  before update on activity_settings
  for each row execute function set_updated_at();

insert into activity_settings default values;

create table online_user_settings (
  id uuid primary key default gen_random_uuid(),
  enabled boolean not null default false,
  base_users integer not null default 1000,
  min_users integer not null default 800,
  max_users integer not null default 1500,
  fluctuation_speed_ms integer not null default 4000,
  updated_at timestamptz not null default now()
);

create trigger trg_online_user_settings_updated_at
  before update on online_user_settings
  for each row execute function set_updated_at();

insert into online_user_settings default values;

-- ---- 0006_security_and_audit.sql ----
-- Phase 1/9: audit logging, security events, session tracking

create table admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id) on delete set null,
  action text not null,
  module text not null,
  target text,
  previous_value text,
  new_value text,
  environment text not null default 'development',
  session_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_admin_audit_logs_admin on admin_audit_logs(admin_id);
create index idx_admin_audit_logs_module on admin_audit_logs(module);
create index idx_admin_audit_logs_created_at on admin_audit_logs(created_at desc);

create type security_event_type as enum ('failed_login', 'suspicious_activity', 'account_blocked', 'password_changed', 'session_terminated', '2fa_enabled', '2fa_disabled');

create table security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  event_type security_event_type not null,
  ip_address text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_security_events_user on security_events(user_id);

create table user_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ip_address text,
  user_agent text,
  is_admin_session boolean not null default false,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  terminated_at timestamptz
);

create index idx_user_sessions_user on user_sessions(user_id);

-- ---- 0007_row_level_security.sql ----
-- Phase 1/9: Row Level Security for every table. Defense in depth: even where a
-- security-definer RPC performs the actual mutation, RLS still blocks any direct
-- table access that bypasses the service layer.

alter table profiles enable row level security;
alter table investment_plans enable row level security;
alter table investments enable row level security;
alter table wallets enable row level security;
alter table transactions enable row level security;
alter table deposits enable row level security;
alter table withdrawals enable row level security;
alter table treasury_accounts enable row level security;
alter table referrals enable row level security;
alter table referral_rewards enable row level security;
alter table notifications enable row level security;
alter table support_tickets enable row level security;
alter table support_messages enable row level security;
alter table announcements enable row level security;
alter table branding enable row level security;
alter table white_label_settings enable row level security;
alter table system_settings enable row level security;
alter table maintenance_settings enable row level security;
alter table integration_configs enable row level security;
alter table credential_metadata enable row level security;
alter table payment_events enable row level security;
alter table compliance_settings enable row level security;
alter table market_settings enable row level security;
alter table market_data enable row level security;
alter table market_control_presets enable row level security;
alter table activity_settings enable row level security;
alter table online_user_settings enable row level security;
alter table admin_audit_logs enable row level security;
alter table security_events enable row level security;
alter table user_sessions enable row level security;
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;

-- roles/permissions/role_permissions: readable by any authenticated user (needed
-- to resolve UI capabilities), writable only by roles.manage.
create policy roles_select on roles for select to authenticated using (true);
create policy permissions_select on permissions for select to authenticated using (true);
create policy role_permissions_select on role_permissions for select to authenticated using (true);
create policy role_permissions_write on role_permissions for all to authenticated
  using (has_permission('roles.manage')) with check (has_permission('roles.manage'));

-- profiles
create policy profiles_select_self_or_admin on profiles for select to authenticated
  using (id = auth.uid() or has_permission('users.read'));

create policy profiles_update_self_or_admin on profiles for update to authenticated
  using (id = auth.uid() or has_permission('users.write'))
  with check (id = auth.uid() or has_permission('users.write'));

-- Defense in depth: block financial/role/status fields from being changed
-- through anything except a security-definer function (which runs as the
-- function owner and is therefore exempt from this trigger's caller check
-- only when it explicitly sets `app.bypass_profile_guard`).
create or replace function guard_profile_financial_fields()
returns trigger as $$
begin
  if current_setting('app.bypass_profile_guard', true) = 'on' then
    return new;
  end if;

  if new.total_balance is distinct from old.total_balance
    or new.available_balance is distinct from old.available_balance
    or new.bonus_balance is distinct from old.bonus_balance
    or new.invested_balance is distinct from old.invested_balance
  then
    if not has_permission('users.adjust_balance') then
      raise exception 'Balance fields can only be changed via an authorized balance adjustment';
    end if;
  end if;

  if new.account_status is distinct from old.account_status then
    if not has_permission('users.manage_status') then
      raise exception 'Account status can only be changed by an authorized admin';
    end if;
  end if;

  if new.role is distinct from old.role then
    if not has_permission('roles.manage') then
      raise exception 'Role can only be changed by an authorized admin';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_guard_profile_financial_fields
  before update on profiles
  for each row execute function guard_profile_financial_fields();

-- investment_plans: everyone can see active plans; full detail + writes need investments.manage
create policy investment_plans_select on investment_plans for select to authenticated
  using (status = 'active' or has_permission('investments.manage'));
create policy investment_plans_write on investment_plans for all to authenticated
  using (has_permission('investments.manage')) with check (has_permission('investments.manage'));

-- investments: users see their own; mutations happen through security-definer RPCs only
create policy investments_select on investments for select to authenticated
  using (user_id = auth.uid() or has_permission('investments.read'));

-- wallets: user manages their own deposit addresses
create policy wallets_select on wallets for select to authenticated using (user_id = auth.uid());
create policy wallets_insert on wallets for insert to authenticated with check (user_id = auth.uid());
create policy wallets_delete on wallets for delete to authenticated using (user_id = auth.uid());

-- transactions: read-only from the client; every row is created by a service-layer RPC
create policy transactions_select on transactions for select to authenticated
  using (user_id = auth.uid() or has_permission('transactions.read'));

-- deposits: a user may open their own pending deposit request; status transitions
-- happen only through the PaymentProvider's security-definer completion RPC.
create policy deposits_select on deposits for select to authenticated
  using (user_id = auth.uid() or has_permission('deposits.read'));
create policy deposits_insert on deposits for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
create policy deposits_admin_update on deposits for update to authenticated
  using (has_permission('deposits.manage')) with check (has_permission('deposits.manage'));

-- withdrawals: requests are created via request_withdrawal() RPC (validates balance
-- atomically); admins may update via review_withdrawal() RPC or directly if authorized.
create policy withdrawals_select on withdrawals for select to authenticated
  using (user_id = auth.uid() or has_permission('withdrawals.read'));
create policy withdrawals_admin_update on withdrawals for update to authenticated
  using (has_permission('withdrawals.approve')) with check (has_permission('withdrawals.approve'));

-- treasury: admin-only
create policy treasury_select on treasury_accounts for select to authenticated
  using (has_permission('treasury.read'));
create policy treasury_write on treasury_accounts for all to authenticated
  using (has_permission('treasury.manage')) with check (has_permission('treasury.manage'));

-- referrals
create policy referrals_select on referrals for select to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid() or has_permission('referrals.read'));

create policy referral_rewards_select on referral_rewards for select to authenticated
  using (
    has_permission('referrals.read')
    or exists (select 1 from referrals r where r.id = referral_rewards.referral_id and r.referrer_id = auth.uid())
  );

-- notifications: strictly own inbox; admins may broadcast (insert for any user)
create policy notifications_select on notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_admin_insert on notifications for insert to authenticated
  with check (has_permission('notifications.send'));

-- support tickets & messages
create policy support_tickets_select on support_tickets for select to authenticated
  using (user_id = auth.uid() or has_permission('support.read'));
create policy support_tickets_insert on support_tickets for insert to authenticated
  with check (user_id = auth.uid());
create policy support_tickets_admin_update on support_tickets for update to authenticated
  using (has_permission('support.manage')) with check (has_permission('support.manage'));

create policy support_messages_select on support_messages for select to authenticated
  using (
    has_permission('support.read')
    or exists (select 1 from support_tickets t where t.id = support_messages.ticket_id and t.user_id = auth.uid())
  );
create policy support_messages_insert on support_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and (
      (is_admin = false and exists (select 1 from support_tickets t where t.id = ticket_id and t.user_id = auth.uid()))
      or (is_admin = true and has_permission('support.manage'))
    )
  );

-- announcements: readable by anyone once active; managed by announcements.manage
create policy announcements_select on announcements for select to authenticated using (is_active = true or has_permission('announcements.manage'));
create policy announcements_write on announcements for all to authenticated
  using (has_permission('announcements.manage')) with check (has_permission('announcements.manage'));

-- branding / white-label / system settings: public read (drives the UI before login), gated writes
create policy branding_select on branding for select using (true);
create policy branding_write on branding for update to authenticated
  using (has_permission('branding.manage')) with check (has_permission('branding.manage'));

create policy white_label_select on white_label_settings for select using (true);
create policy white_label_write on white_label_settings for update to authenticated
  using (has_permission('white_label.manage')) with check (has_permission('white_label.manage'));

create policy system_settings_select on system_settings for select to authenticated using (true);
create policy system_settings_write on system_settings for update to authenticated
  using (has_permission('settings.manage')) with check (has_permission('settings.manage'));

create policy maintenance_settings_select on maintenance_settings for select using (true);
create policy maintenance_settings_write on maintenance_settings for update to authenticated
  using (has_permission('settings.manage')) with check (has_permission('settings.manage'));

-- integrations & credentials: super-admin-only territory, secrets never touch these tables directly
create policy integration_configs_select on integration_configs for select to authenticated
  using (has_permission('integrations.manage'));
create policy integration_configs_write on integration_configs for all to authenticated
  using (has_permission('integrations.manage')) with check (has_permission('integrations.manage'));

create policy credential_metadata_select on credential_metadata for select to authenticated
  using (has_permission('integrations.read_secrets'));
create policy credential_metadata_write on credential_metadata for all to authenticated
  using (has_permission('integrations.read_secrets')) with check (has_permission('integrations.read_secrets'));

-- payment_events: server/webhook only, never exposed to any client role
create policy payment_events_none on payment_events for all to authenticated using (false) with check (false);

create policy compliance_settings_select on compliance_settings for select to authenticated using (true);
create policy compliance_settings_write on compliance_settings for update to authenticated
  using (has_permission('compliance.manage')) with check (has_permission('compliance.manage'));

-- market: public read (chart is visible to clients), writes gated to market.manage;
-- market_data inserts are also allowed by the automatic-tick RPC (security definer, bypasses RLS)
create policy market_settings_select on market_settings for select using (true);
create policy market_settings_write on market_settings for update to authenticated
  using (has_permission('market.manage')) with check (has_permission('market.manage'));

create policy market_data_select on market_data for select using (true);
create policy market_data_insert on market_data for insert to authenticated
  with check (has_permission('market.manage'));

create policy market_presets_select on market_control_presets for select to authenticated
  using (has_permission('market.manage'));
create policy market_presets_write on market_control_presets for all to authenticated
  using (has_permission('market.manage')) with check (has_permission('market.manage'));

create policy activity_settings_select on activity_settings for select to authenticated using (true);
create policy activity_settings_write on activity_settings for update to authenticated
  using (current_role_name() = 'super_admin') with check (current_role_name() = 'super_admin');

create policy online_user_settings_select on online_user_settings for select to authenticated using (true);
create policy online_user_settings_write on online_user_settings for update to authenticated
  using (current_role_name() = 'super_admin') with check (current_role_name() = 'super_admin');

-- audit & security
create policy admin_audit_logs_select on admin_audit_logs for select to authenticated
  using (has_permission('audit.read'));
create policy admin_audit_logs_insert on admin_audit_logs for insert to authenticated
  with check (is_admin() and admin_id = auth.uid());

create policy security_events_select on security_events for select to authenticated
  using (user_id = auth.uid() or has_permission('security.manage'));

create policy user_sessions_select on user_sessions for select to authenticated
  using (user_id = auth.uid() or has_permission('security.manage'));

-- ---- 0008_financial_functions.sql ----
-- Phase 4/5: security-definer functions that perform every balance-affecting
-- operation atomically and server-side. The TypeScript service layer calls
-- these via supabase.rpc(...) instead of ever writing balances directly.

create or replace function adjust_user_balance(
  p_user_id uuid,
  p_field text,
  p_amount numeric,
  p_type text,
  p_reason text,
  p_notes text default null
)
returns transactions as $$
declare
  v_profile profiles%rowtype;
  v_delta numeric;
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
begin
  if not has_permission('users.adjust_balance') then
    raise exception 'not authorized to adjust balances';
  end if;

  if p_field not in ('total_balance', 'available_balance', 'bonus_balance', 'invested_balance') then
    raise exception 'invalid balance field: %', p_field;
  end if;

  if p_type not in ('credit', 'debit') then
    raise exception 'invalid adjustment type: %', p_type;
  end if;

  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  select * into v_profile from profiles where id = p_user_id for update;
  if not found then
    raise exception 'user not found';
  end if;

  v_delta := case when p_type = 'credit' then p_amount else -p_amount end;

  perform set_config('app.bypass_profile_guard', 'on', true);

  if p_field = 'total_balance' then
    v_before := v_profile.total_balance;
    v_after := v_before + v_delta;
    update profiles set total_balance = v_after where id = p_user_id;
  elsif p_field = 'available_balance' then
    v_before := v_profile.available_balance;
    v_after := v_before + v_delta;
    update profiles set available_balance = v_after, total_balance = v_after + bonus_balance + invested_balance where id = p_user_id;
  elsif p_field = 'bonus_balance' then
    v_before := v_profile.bonus_balance;
    v_after := v_before + v_delta;
    update profiles set bonus_balance = v_after, total_balance = available_balance + v_after + invested_balance where id = p_user_id;
  else
    v_before := v_profile.invested_balance;
    v_after := v_before + v_delta;
    update profiles set invested_balance = v_after, total_balance = available_balance + bonus_balance + v_after where id = p_user_id;
  end if;

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (p_user_id, 'adjustment', v_delta, v_before, v_after, 'completed', 'ADJ-' || gen_random_uuid(), p_reason)
  returning * into v_txn;

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (
    auth.uid(),
    p_type || '_' || p_field,
    'users',
    p_user_id::text,
    v_before::text,
    v_after::text,
    coalesce(current_setting('app.environment', true), 'development')
  );

  return v_txn;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function request_withdrawal(
  p_amount numeric,
  p_currency text,
  p_network text,
  p_destination text
)
returns withdrawals as $$
declare
  v_profile profiles%rowtype;
  v_settings system_settings%rowtype;
  v_maintenance maintenance_settings%rowtype;
  v_fee numeric;
  v_total_today numeric;
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
  v_withdrawal withdrawals%rowtype;
begin
  select * into v_profile from profiles where id = auth.uid() for update;
  if not found then
    raise exception 'profile not found';
  end if;

  if v_profile.account_status in ('suspended', 'frozen', 'withdrawal_freeze') then
    raise exception 'withdrawals are not permitted for this account (%)' , v_profile.account_status;
  end if;

  select * into v_settings from system_settings limit 1;
  select * into v_maintenance from maintenance_settings limit 1;

  if v_maintenance.enabled and v_maintenance.disable_withdrawals then
    raise exception 'withdrawals are temporarily disabled for maintenance';
  end if;

  if not v_settings.withdrawal_enabled then
    raise exception 'withdrawals are currently disabled';
  end if;

  if p_amount < v_settings.withdrawal_min or p_amount > v_settings.withdrawal_max then
    raise exception 'amount must be between % and %', v_settings.withdrawal_min, v_settings.withdrawal_max;
  end if;

  select coalesce(sum(amount), 0) into v_total_today
  from withdrawals
  where user_id = auth.uid()
    and status not in ('rejected', 'failed')
    and created_at >= date_trunc('day', now());

  if v_total_today + p_amount > v_settings.withdrawal_daily_limit then
    raise exception 'daily withdrawal limit of % exceeded', v_settings.withdrawal_daily_limit;
  end if;

  v_fee := round(p_amount * v_settings.withdrawal_fee_percent / 100, 2);

  if v_profile.available_balance < p_amount then
    raise exception 'insufficient available balance';
  end if;

  if length(trim(p_destination)) < 4 then
    raise exception 'destination address is invalid';
  end if;

  v_before := v_profile.available_balance;
  v_after := v_before - p_amount;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles set available_balance = v_after where id = auth.uid();

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (auth.uid(), 'withdrawal', -p_amount, v_before, v_after, 'pending', 'WD-' || gen_random_uuid(), 'Withdrawal request')
  returning * into v_txn;

  insert into withdrawals (user_id, amount, fee, currency, network, destination, status, transaction_id)
  values (auth.uid(), p_amount, v_fee, p_currency, p_network, p_destination, 'pending', v_txn.id)
  returning * into v_withdrawal;

  insert into notifications (user_id, type, title, message)
  values (auth.uid(), 'withdrawal_pending', 'Withdrawal requested', 'Your withdrawal request for ' || p_amount || ' ' || p_currency || ' is pending review.');

  return v_withdrawal;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function review_withdrawal(
  p_withdrawal_id uuid,
  p_action text,
  p_notes text default null
)
returns withdrawals as $$
declare
  v_withdrawal withdrawals%rowtype;
  v_profile profiles%rowtype;
  v_before numeric;
  v_after numeric;
  v_new_status withdrawal_status;
  v_txn_status transaction_status;
  v_notif_type notification_type;
begin
  if not has_permission('withdrawals.approve') then
    raise exception 'not authorized to review withdrawals';
  end if;

  if p_action not in ('approve', 'reject', 'hold', 'complete') then
    raise exception 'invalid action: %', p_action;
  end if;

  select * into v_withdrawal from withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'withdrawal not found';
  end if;

  if v_withdrawal.status in ('completed', 'rejected') then
    raise exception 'withdrawal already finalized as %', v_withdrawal.status;
  end if;

  select * into v_profile from profiles where id = v_withdrawal.user_id for update;

  if p_action = 'hold' then
    v_new_status := 'review';
    v_txn_status := 'pending';
  elsif p_action = 'approve' then
    v_new_status := 'processing';
    v_txn_status := 'processing';
  elsif p_action = 'reject' then
    v_new_status := 'rejected';
    v_txn_status := 'rejected';
    v_before := v_profile.available_balance;
    v_after := v_before + v_withdrawal.amount;
    perform set_config('app.bypass_profile_guard', 'on', true);
    update profiles set available_balance = v_after where id = v_withdrawal.user_id;
  else
    v_new_status := 'completed';
    v_txn_status := 'completed';
    v_before := v_profile.total_balance;
    v_after := v_before - v_withdrawal.amount;
    perform set_config('app.bypass_profile_guard', 'on', true);
    update profiles set total_balance = v_after where id = v_withdrawal.user_id;
  end if;

  update transactions set status = v_txn_status where id = v_withdrawal.transaction_id;

  update withdrawals
  set status = v_new_status, reviewed_by = auth.uid(), notes = coalesce(p_notes, notes)
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'withdrawal_' || p_action, 'withdrawals', p_withdrawal_id::text, null, v_new_status::text, coalesce(current_setting('app.environment', true), 'development'));

  v_notif_type := case v_new_status
    when 'processing' then 'withdrawal_processing'
    when 'completed' then 'withdrawal_completed'
    else 'withdrawal_pending'
  end;

  insert into notifications (user_id, type, title, message)
  values (v_withdrawal.user_id, v_notif_type, 'Withdrawal update', 'Your withdrawal is now ' || v_new_status);

  return v_withdrawal;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function create_investment(p_plan_id uuid, p_amount numeric)
returns investments as $$
declare
  v_plan investment_plans%rowtype;
  v_profile profiles%rowtype;
  v_investment investments%rowtype;
  v_before numeric;
  v_after numeric;
begin
  select * into v_plan from investment_plans where id = p_plan_id;
  if not found or v_plan.status != 'active' then
    raise exception 'plan not available';
  end if;

  if p_amount < v_plan.min_amount or p_amount > v_plan.max_amount then
    raise exception 'amount must be between % and %', v_plan.min_amount, v_plan.max_amount;
  end if;

  select * into v_profile from profiles where id = auth.uid() for update;

  if v_profile.account_status in ('suspended', 'frozen') then
    raise exception 'investing is not permitted for this account';
  end if;

  if v_profile.available_balance < p_amount then
    raise exception 'insufficient available balance';
  end if;

  v_before := v_profile.available_balance;
  v_after := v_before - p_amount;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles
  set available_balance = v_after, invested_balance = invested_balance + p_amount
  where id = auth.uid();

  insert into investments (user_id, plan_id, amount, rate, rate_type, duration_days, status, started_at, ends_at)
  values (auth.uid(), p_plan_id, p_amount, v_plan.rate, v_plan.rate_type, v_plan.duration_days, 'active', now(), now() + make_interval(days => v_plan.duration_days))
  returning * into v_investment;

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (auth.uid(), 'investment', -p_amount, v_before, v_after, 'completed', 'INV-' || gen_random_uuid(), 'Investment in ' || v_plan.name);

  insert into notifications (user_id, type, title, message)
  values (auth.uid(), 'investment_started', 'Investment started', 'Your investment of ' || p_amount || ' in ' || v_plan.name || ' has started.');

  return v_investment;
end;
$$ language plpgsql security definer set search_path = public;

-- Demo payment provider: simulates a webhook confirming a deposit. Only ever
-- wired up behind the DemoProvider (never Sandbox/Production, see PaymentProvider
-- abstraction) — real providers verify signatures server-side and never let the
-- depositing user trigger their own confirmation.
create or replace function demo_complete_deposit(p_deposit_id uuid)
returns deposits as $$
declare
  v_deposit deposits%rowtype;
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
begin
  select * into v_deposit from deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'deposit not found';
  end if;

  if v_deposit.provider != 'demo' then
    raise exception 'this function only simulates the demo payment provider';
  end if;

  if v_deposit.user_id != auth.uid() and not has_permission('deposits.manage') then
    raise exception 'not authorized';
  end if;

  if v_deposit.status != 'pending' then
    raise exception 'deposit already %', v_deposit.status;
  end if;

  select available_balance into v_before from profiles where id = v_deposit.user_id;
  v_after := v_before + v_deposit.amount;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles
  set available_balance = v_after, total_balance = total_balance + v_deposit.amount
  where id = v_deposit.user_id;

  insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
  values (v_deposit.user_id, 'deposit', v_deposit.amount, v_before, v_after, 'completed', 'DEP-' || gen_random_uuid(), 'Demo deposit confirmed')
  returning * into v_txn;

  update deposits set status = 'completed', transaction_id = v_txn.id where id = p_deposit_id
  returning * into v_deposit;

  insert into notifications (user_id, type, title, message)
  values (v_deposit.user_id, 'deposit_confirmed', 'Deposit confirmed', 'Your deposit of ' || v_deposit.amount || ' ' || v_deposit.currency || ' has been confirmed.');

  return v_deposit;
end;
$$ language plpgsql security definer set search_path = public;

-- Automatic market tick: safe to expose broadly since it only ever advances a
-- random walk when the market is in `automatic` mode — it accepts no
-- caller-supplied value and is a no-op while manual control is engaged.
create or replace function advance_market_automatic()
returns market_settings as $$
declare
  v_settings market_settings%rowtype;
  v_change numeric;
  v_direction numeric;
  v_pct numeric;
begin
  select * into v_settings from market_settings limit 1 for update;

  if v_settings.mode != 'automatic' then
    return v_settings;
  end if;

  v_direction := case v_settings.automatic_behavior
    when 'upward' then 1
    when 'downward' then -1
    when 'volatile' then (case when random() < 0.5 then -1 else 1 end)
    when 'random' then (case when random() < 0.5 then -1 else 1 end)
    else (case when random() < 0.5 then -1 else 1 end) * 0.2
  end;

  v_change := v_direction * (v_settings.min_movement + random() * (v_settings.max_movement - v_settings.min_movement));

  if v_settings.automatic_behavior = 'stable' then
    v_change := v_change * 0.2;
  elsif v_settings.automatic_behavior = 'volatile' then
    v_change := v_change * 3;
  end if;

  v_pct := round(((v_settings.current_market_value + v_change) / nullif(v_settings.starting_value, 0) - 1) * 100, 4);

  update market_settings
  set current_market_value = round(current_market_value + v_change, 2),
      current_percentage_change = v_pct,
      current_trend = (case when v_change > 0 then 'bullish' when v_change < 0 then 'bearish' else 'stable' end)::market_trend
  where id = v_settings.id
  returning * into v_settings;

  insert into market_data (value, percentage_change, trend, is_manual)
  values (v_settings.current_market_value, v_settings.current_percentage_change, v_settings.current_trend, false);

  return v_settings;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function adjust_user_balance to authenticated;
grant execute on function request_withdrawal to authenticated;
grant execute on function review_withdrawal to authenticated;
grant execute on function create_investment to authenticated;
grant execute on function demo_complete_deposit to authenticated;
grant execute on function advance_market_automatic to authenticated;

-- ---- 0009_realtime.sql ----
-- Phase 1/4/5 (spec section 74): enable Realtime for the tables the client
-- actually subscribes to — deposit/withdrawal status, notifications, support
-- messages, and live market data/settings. Idempotent: safe to run even if
-- some of these are already published.

do $$
declare
  t text;
begin
  foreach t in array array['notifications', 'support_messages', 'deposits', 'withdrawals', 'market_settings', 'market_data'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

commit;

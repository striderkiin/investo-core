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

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

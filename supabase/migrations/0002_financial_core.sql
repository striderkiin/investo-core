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

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

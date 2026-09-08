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

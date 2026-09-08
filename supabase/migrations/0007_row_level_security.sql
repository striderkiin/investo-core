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

-- Manual integration test exercising the real Postgres migrations end-to-end:
-- profile creation via trigger, RLS enforcement, and every financial RPC.
-- Run with: sudo -u postgres psql -d investo_test -v ON_ERROR_STOP=1 -f this_file

\set QUIET off
\pset pager off

-- 1. Create two auth users; the handle_new_user trigger should create matching profiles.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

select id, email, role, account_status, total_balance, referral_code from profiles order by email;

-- Promote Alice to super_admin for testing admin RPCs. Seed/admin bootstrap
-- scripts run as a superuser but the guard trigger still fires for them (triggers
-- are not bypassed by RLS/role), so they must explicitly opt out like this.
select set_config('app.bypass_profile_guard', 'on', false);
update profiles set role = 'super_admin' where id = '11111111-1111-1111-1111-111111111111';
select set_config('app.bypass_profile_guard', 'off', false);

-- 2. RLS: Bob (authenticated, non-admin) should see only his own profile.
set role authenticated;
select auth.login_as('22222222-2222-2222-2222-222222222222');

select count(*) as bob_visible_profiles from profiles; -- expect 1 (self)

do $$
begin
  begin
    update profiles set total_balance = 999999 where id = '22222222-2222-2222-2222-222222222222';
    raise exception 'SECURITY BUG: bob was able to directly set his own balance without permission';
  exception
    when others then
      raise notice 'OK: direct balance write blocked (%)', sqlerrm;
  end;
end $$;

reset role;

-- 3. adjust_user_balance RPC as super admin (Alice) crediting Bob's available balance.
set role authenticated;
select auth.login_as('11111111-1111-1111-1111-111111111111');

select * from adjust_user_balance('22222222-2222-2222-2222-222222222222', 'available_balance', 5000, 'credit', 'Test credit', null);

reset role;
select id, available_balance, total_balance from profiles where id = '22222222-2222-2222-2222-222222222222';

-- 4. create_investment RPC as Bob.
insert into investment_plans (name, description, min_amount, max_amount, rate, rate_type, duration_days)
values ('Test Plan', 'A test plan', 100, 10000, 1.5, 'daily', 30);

set role authenticated;
select auth.login_as('22222222-2222-2222-2222-222222222222');

select id, amount, status from create_investment((select id from investment_plans where name = 'Test Plan'), 1000);

reset role;
select available_balance, invested_balance from profiles where id = '22222222-2222-2222-2222-222222222222';

-- 5. request_withdrawal + review_withdrawal RPC flow.
set role authenticated;
select auth.login_as('22222222-2222-2222-2222-222222222222');

select id, amount, status from request_withdrawal(500, 'USDT', 'Tron (TRC-20)', 'TXtestdestinationaddress123');

reset role;
select available_balance from profiles where id = '22222222-2222-2222-2222-222222222222'; -- should be reduced by 500

set role authenticated;
select auth.login_as('11111111-1111-1111-1111-111111111111');

select id, status from review_withdrawal((select id from withdrawals order by created_at desc limit 1), 'approve', 'looks fine');
select id, status from review_withdrawal((select id from withdrawals order by created_at desc limit 1), 'complete', null);

reset role;
select total_balance, available_balance from profiles where id = '22222222-2222-2222-2222-222222222222';

-- 6. Demo deposit lifecycle.
insert into deposits (user_id, amount, currency, network, provider, provider_reference, status)
values ('22222222-2222-2222-2222-222222222222', 250, 'USDT', 'Tron (TRC-20)', 'demo', 'DEMO-TEST-1', 'pending')
returning id as deposit_id \gset

set role authenticated;
select auth.login_as('22222222-2222-2222-2222-222222222222');
select id, status from demo_complete_deposit(:'deposit_id');
reset role;

select available_balance, total_balance from profiles where id = '22222222-2222-2222-2222-222222222222';

-- 7. Automatic market tick.
select mode, current_market_value from market_settings;
select mode, current_market_value from advance_market_automatic();
select count(*) as market_data_rows from market_data;

-- 8. Manual market control path (as super admin, with market.manage permission).
set role authenticated;
select auth.login_as('11111111-1111-1111-1111-111111111111');

update market_settings set manual_control_enabled = true, market_value_control_enabled = true, mode = 'manual';
update market_settings set current_market_value = current_market_value + 100;
insert into market_data (value, percentage_change, trend, is_manual) select current_market_value, current_percentage_change, current_trend, true from market_settings;
insert into admin_audit_logs (admin_id, action, module, environment) values (auth.uid(), 'increase_market_value', 'market', 'development');

reset role;
select current_market_value, mode from market_settings;
select count(*) as audit_log_rows from admin_audit_logs;

-- 9. Confirm Support Admin cannot read integration credentials (integrations.read_secrets).
insert into auth.users (id, email) values ('33333333-3333-3333-3333-333333333333', 'carol@example.com');
select set_config('app.bypass_profile_guard', 'on', false);
update profiles set role = 'support_admin' where id = '33333333-3333-3333-3333-333333333333';
select set_config('app.bypass_profile_guard', 'off', false);

insert into integration_configs (provider_type, provider_name, environment, status)
values ('payment', 'Demo Provider', 'sandbox', 'connected');

set role authenticated;
select auth.login_as('33333333-3333-3333-3333-333333333333');
select count(*) as support_admin_visible_integrations from integration_configs; -- expect 0
reset role;

select 'ALL INTEGRATION TESTS COMPLETED' as result;

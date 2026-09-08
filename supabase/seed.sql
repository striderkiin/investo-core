-- Development seed data (spec section 90).
--
-- This file is designed to run the way `supabase db reset` runs it: through a
-- direct Postgres superuser connection, AFTER all migrations in supabase/migrations
-- have been applied. It is NOT meant to be executed through the anon/authenticated
-- REST/RPC surface.
--
-- It inserts rows into `auth.users` directly (the standard local-seeding pattern
-- recommended by Supabase for GoTrue) so these accounts can log in with the
-- passwords below. IMPORTANT: this repo could not run the real Supabase local
-- stack in the environment this was authored in (container image pulls were
-- network-blocked), so this exact `auth.users` insert has been validated only
-- against a hand-written stub of that table (see supabase/testing/), not the
-- real GoTrue schema. If your Supabase version's `auth.users` table has
-- different required columns, adjust the INSERT below accordingly — everything
-- else in this file (profiles, plans, transactions, etc.) only depends on our
-- own migrations and needs no changes.
--
-- All seeded users share simple, clearly-fake passwords — never use these in
-- Sandbox or Production.

do $$
declare
  v_password text := crypt('Password123!', gen_salt('bf'));
  v_super_admin_id uuid := gen_random_uuid();
  v_finance_admin_id uuid := gen_random_uuid();
  v_support_admin_id uuid := gen_random_uuid();
  v_ops_admin_id uuid := gen_random_uuid();
  v_client_ids uuid[] := array[]::uuid[];
  v_client_id uuid;
  v_plan_starter uuid;
  v_plan_growth uuid;
  v_plan_professional uuid;
  v_plan_elite uuid;
  v_plan_ids uuid[];
  v_i int;
  v_j int;
  v_amount numeric;
  v_txn_types text[] := array['deposit', 'withdrawal', 'investment', 'yield', 'bonus', 'referral'];
  v_txn_type text;
  v_ticket_id uuid;
begin
  perform set_config('app.bypass_profile_guard', 'on', false);

  -- 1. Admin accounts -------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values
    ('00000000-0000-0000-0000-000000000000', v_super_admin_id, 'authenticated', 'authenticated', 'admin@investo.test', v_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ava Sterling"}', false, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_finance_admin_id, 'authenticated', 'authenticated', 'finance@investo.test', v_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Marcus Chen"}', false, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_support_admin_id, 'authenticated', 'authenticated', 'support@investo.test', v_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Nair"}', false, now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_ops_admin_id, 'authenticated', 'authenticated', 'ops@investo.test', v_password, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Diego Ramirez"}', false, now(), now(), '', '', '', '');

  update profiles set role = 'super_admin' where id = v_super_admin_id;
  update profiles set role = 'finance_admin' where id = v_finance_admin_id;
  update profiles set role = 'support_admin' where id = v_support_admin_id;
  update profiles set role = 'operations_admin' where id = v_ops_admin_id;

  -- 2. Client accounts (20) ---------------------------------------------------
  for v_i in 1..20 loop
    v_client_id := gen_random_uuid();
    v_client_ids := array_append(v_client_ids, v_client_id);

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_client_id, 'authenticated', 'authenticated',
      'client' || lpad(v_i::text, 2, '0') || '@investo.test', v_password, now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', 'Client ' || lpad(v_i::text, 2, '0')),
      false, now() - (v_i || ' days')::interval, now(), '', '', '', ''
    );

    update profiles
    set
      total_balance = (1000 + v_i * 437.50)::numeric(18,2),
      available_balance = (600 + v_i * 210.25)::numeric(18,2),
      bonus_balance = (v_i % 4 = 0)::int * 50,
      invested_balance = (400 + v_i * 227.25)::numeric(18,2),
      account_status = (case
        when v_i = 18 then 'restricted'
        when v_i = 19 then 'withdrawal_freeze'
        when v_i = 20 then 'suspended'
        else 'active'
      end)::account_status
    where id = v_client_id;
  end loop;

  -- Referral chain: client01 refers client02-04; client02 refers client05-06
  update profiles set referred_by = v_client_ids[1] where id in (v_client_ids[2], v_client_ids[3], v_client_ids[4]);
  update profiles set referred_by = v_client_ids[2] where id in (v_client_ids[5], v_client_ids[6]);

  insert into referrals (referrer_id, referred_id)
  select v_client_ids[1], v_client_ids[k] from unnest(array[2,3,4]) as k
  union all
  select v_client_ids[2], v_client_ids[k] from unnest(array[5,6]) as k;

  insert into referral_rewards (referral_id, amount, reason)
  select r.id, 25.00, 'Signup bonus' from referrals r;

  -- 3. Investment plans (spec section 30) ------------------------------------
  insert into investment_plans (name, description, min_amount, max_amount, rate, rate_type, duration_days, status)
  values
    ('Starter', 'Entry-level plan for new investors.', 50, 999, 0.8, 'daily', 30, 'active')
    returning id into v_plan_starter;
  insert into investment_plans (name, description, min_amount, max_amount, rate, rate_type, duration_days, status)
  values
    ('Growth', 'Balanced growth for steady returns.', 1000, 4999, 1.2, 'daily', 60, 'active')
    returning id into v_plan_growth;
  insert into investment_plans (name, description, min_amount, max_amount, rate, rate_type, duration_days, status)
  values
    ('Professional', 'Higher yield for experienced investors.', 5000, 19999, 1.6, 'daily', 90, 'active')
    returning id into v_plan_professional;
  insert into investment_plans (name, description, min_amount, max_amount, rate, rate_type, duration_days, status)
  values
    ('Elite', 'Premium plan with maximum returns.', 20000, 100000, 2.0, 'daily', 120, 'active')
    returning id into v_plan_elite;

  v_plan_ids := array[v_plan_starter, v_plan_growth, v_plan_professional, v_plan_elite];

  -- 4. Investments for the first 12 clients -----------------------------------
  for v_i in 1..12 loop
    insert into investments (user_id, plan_id, amount, rate, rate_type, duration_days, status, started_at, ends_at, current_earnings)
    select
      v_client_ids[v_i],
      p.id,
      p.min_amount + (v_i * 37),
      p.rate,
      p.rate_type,
      p.duration_days,
      (case when v_i % 5 = 0 then 'completed' when v_i % 7 = 0 then 'paused' else 'active' end)::investment_status,
      now() - (v_i || ' days')::interval,
      now() + ((p.duration_days - v_i) || ' days')::interval,
      round((p.min_amount + v_i * 37) * p.rate / 100 * v_i, 2)
    from investment_plans p
    where p.id = v_plan_ids[1 + (v_i % 4)];
  end loop;

  -- 5. Transactions (>= 50) -----------------------------------------------------
  for v_i in 1..20 loop
    for v_j in 1..3 loop
      v_txn_type := v_txn_types[1 + ((v_i + v_j) % array_length(v_txn_types, 1))];
      v_amount := round((50 + (v_i * v_j * 13) % 900)::numeric, 2);

      insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description, created_at)
      values (
        v_client_ids[v_i],
        v_txn_type::transaction_type,
        case when v_txn_type = 'withdrawal' then -v_amount else v_amount end,
        1000,
        case when v_txn_type = 'withdrawal' then 1000 - v_amount else 1000 + v_amount end,
        (case when v_j = 3 and v_i % 6 = 0 then 'pending' else 'completed' end)::transaction_status,
        upper(v_txn_type) || '-SEED-' || v_i || '-' || v_j,
        initcap(v_txn_type) || ' (seed data)',
        now() - ((v_i + v_j) || ' hours')::interval
      );
    end loop;
  end loop;

  -- 6. Deposits & withdrawals (some pending) -------------------------------
  for v_i in 1..6 loop
    insert into deposits (user_id, amount, currency, network, provider, provider_reference, status, created_at)
    values (v_client_ids[v_i], 250 + v_i * 40, 'USDT', 'Tron (TRC-20)', 'demo', 'DEMO-SEED-' || v_i, (case when v_i <= 3 then 'pending' else 'completed' end)::deposit_status, now() - (v_i || ' hours')::interval);
  end loop;

  for v_i in 7..12 loop
    insert into withdrawals (user_id, amount, fee, currency, network, destination, status, created_at)
    values (v_client_ids[v_i], 100 + v_i * 15, 2.5, 'USDT', 'Tron (TRC-20)', 'TDemoDestinationAddress' || v_i, (case when v_i % 2 = 0 then 'pending' else 'review' end)::withdrawal_status, now() - (v_i || ' hours')::interval);
  end loop;

  -- 7. Support tickets + messages ------------------------------------------
  insert into support_tickets (user_id, subject, category, status)
  values (v_client_ids[1], 'Deposit not showing up', 'deposit', 'open')
  returning id into v_ticket_id;
  insert into support_messages (ticket_id, sender_id, is_admin, message)
  values (v_ticket_id, v_client_ids[1], false, 'I sent USDT an hour ago and it still shows pending.');

  insert into support_tickets (user_id, subject, category, status, assigned_to)
  values (v_client_ids[2], 'How do referral bonuses work?', 'account', 'resolved', v_support_admin_id)
  returning id into v_ticket_id;
  insert into support_messages (ticket_id, sender_id, is_admin, message) values
    (v_ticket_id, v_client_ids[2], false, 'Can you explain how referral bonuses are calculated?'),
    (v_ticket_id, v_support_admin_id, true, 'You earn a bonus whenever someone you refer completes their first investment.');

  -- 8. Notifications ---------------------------------------------------------
  for v_i in 1..20 loop
    insert into notifications (user_id, type, title, message, read_at)
    values (
      v_client_ids[v_i],
      'system_announcement',
      'Welcome to Investo',
      'Thanks for joining — explore your dashboard to get started.',
      case when v_i % 3 = 0 then now() else null end
    );
  end loop;

  -- 9. Announcement ------------------------------------------------------------
  insert into announcements (title, body, type, audience, is_active, created_by)
  values ('Welcome to Investo Core Suite', 'This is a demo environment. All data is simulated.', 'important_notice', 'everyone', true, v_super_admin_id);

  -- 10. Market history (last 60 points, 3-minute cadence) ---------------------
  insert into market_data (value, percentage_change, trend, is_manual, recorded_at)
  select
    round((42580 + (sin(n / 5.0) * 400) + (random() * 100 - 50))::numeric, 2) as value,
    round((sin(n / 5.0) * 4)::numeric, 2) as percentage_change,
    case when sin(n / 5.0) > 0.1 then 'bullish' when sin(n / 5.0) < -0.1 then 'bearish' else 'stable' end::market_trend,
    false,
    now() - ((60 - n) * 3 || ' minutes')::interval
  from generate_series(1, 60) as n;

  update market_settings
  set current_market_value = (select value from market_data order by recorded_at desc limit 1),
      current_percentage_change = (select percentage_change from market_data order by recorded_at desc limit 1),
      current_trend = (select trend from market_data order by recorded_at desc limit 1);

  perform set_config('app.bypass_profile_guard', 'off', false);

  raise notice 'Seed complete: super admin=admin@investo.test, finance=finance@investo.test, support=support@investo.test, ops=ops@investo.test, clients=client01..client20@investo.test (password: Password123!)';
end $$;

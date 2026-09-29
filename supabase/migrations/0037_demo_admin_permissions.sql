-- Permissions for the demo_admin role added in 0036, plus the rule that only
-- a super admin may change another admin's account.

insert into roles (name, description) values
  ('demo_admin', 'Demo access: every admin feature except keys, admins, security, settings and branding')
on conflict (name) do nothing;

insert into role_permissions (role, permission_key)
select 'demo_admin', key from permissions
where key not in (
  'integrations.manage',
  'integrations.read_secrets',
  'admins.manage',
  'roles.manage',
  'security.manage',
  'settings.manage',
  'environment.manage',
  'branding.manage',
  'white_label.manage',
  'treasury.manage'
)
on conflict do nothing;

create or replace function public.guard_profile_financial_fields()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if current_setting('app.bypass_profile_guard', true) = 'on' then
    return new;
  end if;

  -- Admins' own accounts are editable only by themselves or a super admin.
  if old.id is distinct from auth.uid() and old.role <> 'client' and current_role_name() is distinct from 'super_admin' then
    raise exception 'Only a super admin can change another admin''s account';
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
$function$;

create or replace function public.adjust_user_balance(p_user_id uuid, p_field text, p_amount numeric, p_type text, p_reason text, p_notes text default null::text)
 returns transactions
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  if v_profile.role <> 'client' and current_role_name() is distinct from 'super_admin' then
    raise exception 'Only a super admin can adjust an admin''s balance';
  end if;

  v_delta := case when p_type = 'credit' then p_amount else -p_amount end;

  if p_type = 'debit' and p_field != 'total_balance' then
    if (case p_field
          when 'available_balance' then v_profile.available_balance
          when 'bonus_balance' then v_profile.bonus_balance
          else v_profile.invested_balance
        end) + v_delta < 0 then
      raise exception 'debit would take % below zero', p_field;
    end if;
  end if;

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
$function$;

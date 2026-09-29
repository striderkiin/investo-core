-- Deposit tracking and manual review.
--
-- Deposits paid to an admin-set wallet address sit at 'pending' until an admin
-- checks the blockchain and confirms them here. Payment providers (NOWPayments,
-- CoinPayments) will fill tx_hash/confirmations automatically from their IPN
-- callbacks; the same review function is the manual fallback.

alter table deposits
  add column if not exists tx_hash text,
  add column if not exists confirmations integer not null default 0,
  add column if not exists required_confirmations integer,
  add column if not exists admin_notes text,
  add column if not exists reviewed_by uuid references profiles (id),
  add column if not exists reviewed_at timestamptz;

alter table withdrawals
  add column if not exists tx_hash text;

create or replace function public.admin_review_deposit(p_deposit_id uuid, p_action text, p_notes text default null, p_tx_hash text default null)
 returns deposits
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_deposit deposits%rowtype;
  v_before numeric;
  v_after numeric;
  v_txn transactions%rowtype;
begin
  if not has_permission('deposits.manage') then
    raise exception 'not authorized to review deposits';
  end if;

  if p_action not in ('confirm', 'reject') then
    raise exception 'invalid action: %', p_action;
  end if;

  select * into v_deposit from deposits where id = p_deposit_id for update;
  if not found then
    raise exception 'deposit not found';
  end if;

  if v_deposit.status not in ('pending', 'processing') then
    raise exception 'deposit already %', v_deposit.status;
  end if;

  if p_action = 'confirm' then
    select available_balance into v_before from profiles where id = v_deposit.user_id for update;
    v_after := v_before + v_deposit.amount;

    perform set_config('app.bypass_profile_guard', 'on', true);
    update profiles
    set available_balance = v_after, total_balance = total_balance + v_deposit.amount
    where id = v_deposit.user_id;

    insert into transactions (user_id, type, amount, balance_before, balance_after, status, reference, description)
    values (v_deposit.user_id, 'deposit', v_deposit.amount, v_before, v_after, 'completed', 'DEP-' || gen_random_uuid(),
            v_deposit.currency || ' deposit confirmed')
    returning * into v_txn;

    update deposits
    set status = 'completed',
        transaction_id = v_txn.id,
        tx_hash = coalesce(nullif(trim(p_tx_hash), ''), tx_hash),
        confirmations = greatest(confirmations, coalesce(required_confirmations, confirmations)),
        admin_notes = coalesce(p_notes, admin_notes),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = p_deposit_id
    returning * into v_deposit;

    insert into notifications (user_id, type, title, message)
    values (v_deposit.user_id, 'deposit_confirmed', 'Deposit confirmed',
            'Your deposit of ' || v_deposit.amount || ' ' || v_deposit.currency || ' has been confirmed.');
  else
    update deposits
    set status = 'rejected',
        tx_hash = coalesce(nullif(trim(p_tx_hash), ''), tx_hash),
        admin_notes = coalesce(p_notes, admin_notes),
        reviewed_by = auth.uid(),
        reviewed_at = now()
    where id = p_deposit_id
    returning * into v_deposit;

    insert into notifications (user_id, type, title, message)
    values (v_deposit.user_id, 'failed_payment', 'Deposit not confirmed',
            'Your deposit of ' || v_deposit.amount || ' ' || v_deposit.currency || ' could not be confirmed.'
            || coalesce(' ' || p_notes, ''));
  end if;

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'deposit_' || p_action, 'deposits', p_deposit_id::text, 'pending', v_deposit.status::text,
          coalesce(current_setting('app.environment', true), 'development'));

  return v_deposit;
end;
$function$;

revoke all on function public.admin_review_deposit(uuid, text, text, text) from public, anon;
grant execute on function public.admin_review_deposit(uuid, text, text, text) to authenticated;

-- Record the payout transaction hash when a withdrawal is marked completed.
create or replace function public.set_withdrawal_tx_hash(p_withdrawal_id uuid, p_tx_hash text)
 returns withdrawals
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_withdrawal withdrawals%rowtype;
begin
  if not has_permission('withdrawals.approve') then
    raise exception 'not authorized';
  end if;
  update withdrawals set tx_hash = nullif(trim(p_tx_hash), '') where id = p_withdrawal_id returning * into v_withdrawal;
  if not found then
    raise exception 'withdrawal not found';
  end if;
  insert into admin_audit_logs (admin_id, action, module, target, new_value, environment)
  values (auth.uid(), 'withdrawal_tx_hash', 'withdrawals', p_withdrawal_id::text, v_withdrawal.tx_hash,
          coalesce(current_setting('app.environment', true), 'development'));
  return v_withdrawal;
end;
$function$;

revoke all on function public.set_withdrawal_tx_hash(uuid, text) from public, anon;
grant execute on function public.set_withdrawal_tx_hash(uuid, text) to authenticated;

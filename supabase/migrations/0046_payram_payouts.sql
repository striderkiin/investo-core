-- PayRam payouts: an admin approves a withdrawal and PayRam sends the USDT
-- from its hot wallet (the payram-payout edge function).
--
--   1. payram-payout approves the withdrawal as the signed-in admin
--      (review_withdrawal 'approve': status processing, audit-logged).
--   2. It asks PayRam to send amount minus fee and records the payout here
--      (record_withdrawal_payout).
--   3. When PayRam reports the payout as sent, settle_withdrawal_payout
--      completes the withdrawal with the transaction hash, exactly like the
--      admin's "Mark as paid". A failed payout leaves the withdrawal in
--      processing so the admin can retry, pay by hand, or reject and refund.

alter table withdrawals
  add column if not exists payout_provider text,
  add column if not exists payout_reference text,
  add column if not exists payout_status text,
  add column if not exists payout_error text;

create or replace function public.record_withdrawal_payout(p_withdrawal_id uuid, p_provider text, p_reference text, p_status text, p_error text default null)
 returns withdrawals
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_withdrawal withdrawals%rowtype;
begin
  update withdrawals
  set payout_provider = p_provider,
      payout_reference = coalesce(p_reference, payout_reference),
      payout_status = upper(coalesce(p_status, payout_status)),
      payout_error = p_error
  where id = p_withdrawal_id
  returning * into v_withdrawal;
  if not found then
    raise exception 'withdrawal not found';
  end if;
  return v_withdrawal;
end;
$function$;

-- Completes a processing withdrawal once the provider has sent it. Safe to
-- call again: a completed withdrawal is left as it is.
create or replace function public.settle_withdrawal_payout(p_withdrawal_id uuid, p_tx_hash text)
 returns withdrawals
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_withdrawal withdrawals%rowtype;
begin
  select * into v_withdrawal from withdrawals where id = p_withdrawal_id for update;
  if not found then
    raise exception 'withdrawal not found';
  end if;
  if v_withdrawal.status <> 'processing' then
    return v_withdrawal;
  end if;

  perform set_config('app.bypass_profile_guard', 'on', true);
  update profiles set total_balance = total_balance - v_withdrawal.amount where id = v_withdrawal.user_id;
  update transactions set status = 'completed' where id = v_withdrawal.transaction_id;

  update withdrawals
  set status = 'completed',
      tx_hash = coalesce(nullif(trim(p_tx_hash), ''), tx_hash),
      payout_status = 'SENT',
      payout_error = null
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  insert into notifications (user_id, type, title, message)
  values (v_withdrawal.user_id, 'withdrawal_completed', 'Withdrawal sent',
          'Your withdrawal of $' || (v_withdrawal.amount - v_withdrawal.fee) || ' in ' || v_withdrawal.currency
          || ' (' || v_withdrawal.network || ') has been sent to your wallet.');

  return v_withdrawal;
end;
$function$;

revoke all on function public.record_withdrawal_payout(uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.settle_withdrawal_payout(uuid, text) from public, anon, authenticated;
grant execute on function public.record_withdrawal_payout(uuid, text, text, text, text) to service_role;
grant execute on function public.settle_withdrawal_payout(uuid, text) to service_role;

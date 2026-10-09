-- Account status rules, in one place, so each status does what its name says:
--   active              everything allowed
--   restricted          no new deposits or new investments; withdrawals allowed
--   withdrawal_freeze   no withdrawals; everything else allowed
--   suspended, frozen   no deposits, investments, withdrawals, "Move to balance"
--                       or early exit
-- Before this, "restricted" blocked nothing and manual / demo deposits did
-- not check the status at all.

create or replace function public.assert_account_allows(p_user_id uuid, p_action text)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to 'public'
as $function$
declare
  v_status account_status;
begin
  select account_status into v_status from profiles where id = p_user_id;
  if v_status in ('suspended', 'frozen') then
    raise exception 'Your account is on hold. Please contact support.';
  end if;
  if v_status = 'restricted' and p_action in ('deposit', 'invest') then
    raise exception 'New deposits and investments are paused on your account. Please contact support.';
  end if;
  if v_status = 'withdrawal_freeze' and p_action = 'withdraw' then
    raise exception 'Withdrawals are paused on your account. Please contact support.';
  end if;
end;
$function$;

revoke all on function public.assert_account_allows(uuid, text) from public, anon;
grant execute on function public.assert_account_allows(uuid, text) to authenticated, service_role;

-- Add the check to each money function by editing its current definition.
do $$
declare
  r record;
  v_def text;
  v_new text;
begin
  for r in
    select p.oid, p.proname from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('create_manual_deposit', 'create_demo_deposit', 'open_provider_deposit', 'create_investment', 'claim_investment_earnings', 'exit_investment_early')
  loop
    v_def := pg_get_functiondef(r.oid);
    v_new := case
      when r.proname in ('create_manual_deposit', 'create_demo_deposit') then
        regexp_replace(v_def, '(  select \* into v_settings from system_settings limit 1;)', E'  perform assert_account_allows(auth.uid(), ''deposit'');\n\\1')
      when r.proname in ('open_provider_deposit', 'create_investment') then
        replace(v_def, 'account_status in (''suspended'', ''frozen'')', 'account_status in (''suspended'', ''frozen'', ''restricted'')')
      else
        regexp_replace(v_def, '(  if v_inv.status <> ''active'' then)', E'  perform assert_account_allows(v_inv.user_id, ''money'');\n\\1')
    end;
    if v_new = v_def then
      raise exception 'could not add the account check to %', r.proname;
    end if;
    execute v_new;
  end loop;
end $$;

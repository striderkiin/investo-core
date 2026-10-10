-- A payment entered by mistake is voided, not deleted, so the record of
-- what happened stays. The paid-until date goes back to what the latest
-- remaining payment set (or empty when none are left).

alter table public.payments
  add column voided_at timestamptz,
  add column voided_by uuid references auth.users (id) on delete set null;

create or replace function public.void_payment(p_payment_id uuid)
returns date
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_until date;
begin
  if not public.is_hq_owner() then
    raise exception 'Not allowed';
  end if;
  update public.payments
     set voided_at = now(), voided_by = auth.uid()
   where id = p_payment_id and voided_at is null
  returning * into v_payment;
  if not found then
    raise exception 'Payment not found or already voided';
  end if;
  select paid_until_after into v_until
    from public.payments
   where site_id = v_payment.site_id and voided_at is null and paid_until_after is not null
   order by paid_at desc, created_at desc
   limit 1;
  update public.sites set paid_until = v_until where id = v_payment.site_id;
  insert into public.site_events (site_id, kind, detail)
  values (v_payment.site_id, 'payment', format('%s payment of $%s voided', initcap(v_payment.kind::text), v_payment.amount));
  return v_until;
end;
$$;
revoke all on function public.void_payment(uuid) from public, anon;
grant execute on function public.void_payment(uuid) to authenticated;

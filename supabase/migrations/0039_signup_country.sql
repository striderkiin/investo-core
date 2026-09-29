-- Copy the country picked at sign-up (auth user metadata) onto the new
-- profile. Anything that isn't a two-letter code is ignored rather than
-- failing the sign-up.
create or replace function public.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  referrer profiles%rowtype;
  submitted_code text;
  submitted_country text;
begin
  submitted_code := new.raw_user_meta_data ->> 'referral_code';
  submitted_country := upper(new.raw_user_meta_data ->> 'country');
  if submitted_country !~ '^[A-Z]{2}$' then
    submitted_country := null;
  end if;

  if submitted_code is not null then
    select * into referrer from profiles where referral_code = submitted_code;
  end if;

  insert into profiles (id, email, full_name, role, referral_code, referred_by, country)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'client',
    generate_referral_code(),
    referrer.id,
    submitted_country
  );

  if referrer.id is not null then
    insert into referrals (referrer_id, referred_id) values (referrer.id, new.id);
  end if;

  return new;
end;
$function$;

-- Where the site's owner pays their subscription. Set by HQ at each
-- check-in and shown as a "Pay now" button in the admin panel's payment
-- reminder.

alter table public.license_state
  add column if not exists pay_url text check (pay_url is null or pay_url ~ '^https://');

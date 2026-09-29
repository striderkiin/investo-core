-- Customer country (ISO 3166-1 alpha-2), collected at sign-up and shown on
-- the admin dashboard's customers-by-country map.
alter table profiles add column if not exists country text check (country is null or country ~ '^[A-Z]{2}$');
comment on column profiles.country is 'ISO 3166-1 alpha-2 code chosen at sign-up';

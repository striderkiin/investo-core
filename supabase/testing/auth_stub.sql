-- Minimal stand-in for Supabase's `auth` schema, used ONLY for local
-- integration-testing our migrations against a plain Postgres 16 server
-- (the real Supabase local stack requires Docker image pulls that are not
-- reachable from this sandbox). This is never part of the real migrations.

create schema if not exists auth;

-- Expanded to mirror the columns real seed scripts (supabase/seed.sql) insert
-- into Supabase's actual auth.users table, so seed.sql can be integration
-- tested here too. The real table has more columns than this; this stub only
-- needs the ones our seed script and migrations actually touch.
create table auth.users (
  instance_id uuid,
  id uuid primary key default gen_random_uuid(),
  aud text,
  role text,
  email text unique not null,
  encrypted_password text,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  is_super_admin boolean not null default false,
  confirmation_token text,
  email_change text,
  email_change_token_new text,
  recovery_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Supabase's auth.uid() reads the JWT claim; here it reads a session-local
-- setting so tests can act "as" different users via `set_config`.
create or replace function auth.uid() returns uuid as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$ language sql stable;

-- Test helper: impersonate a given user for the rest of the session/transaction.
create or replace function auth.login_as(p_user_id uuid) returns void as $$
begin
  perform set_config('request.jwt.claim.sub', p_user_id::text, false);
end;
$$ language plpgsql;

create or replace function auth.logout() returns void as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
end;
$$ language plpgsql;

-- A role standing in for Supabase's `authenticated` role that RLS policies target.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon;
  end if;
end
$$;

grant usage on schema public to authenticated, anon;
grant usage on schema auth to authenticated, anon;

-- Minimal stand-in for Supabase Storage's schema (real one has more columns/
-- triggers; this only needs what our RLS policies and bucket seed touch).
create schema if not exists storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant usage on schema storage to authenticated, anon;


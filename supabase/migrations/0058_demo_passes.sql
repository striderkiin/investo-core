-- One row per demo pass the demo-session function has accepted. MojoX signs
-- each pass with a fresh nonce; recording it here makes every pass work once.
-- Only the service role touches this table.

create table if not exists public.demo_passes (
  nonce uuid primary key,
  role text not null check (role in ('client', 'admin')),
  used_at timestamptz not null default now()
);

alter table public.demo_passes enable row level security;
revoke all on public.demo_passes from anon, authenticated;

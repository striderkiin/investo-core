-- Social Links: admin-configurable social media icons for the public
-- landing page (Contact section + footer). Seeded with the common
-- platforms, all disabled with a placeholder URL — an operator turns on
-- whichever ones they actually have and fills in the real link. Reuses
-- the existing branding.manage permission since this is footer/branding
-- content, not a new concern needing its own permission.

create table social_links (
  id uuid primary key default gen_random_uuid(),
  platform text not null unique check (platform in ('twitter', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok')),
  url text not null default '#',
  enabled boolean not null default false,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create trigger trg_social_links_updated_at
  before update on social_links
  for each row execute function set_updated_at();

alter table social_links enable row level security;

-- Same public/authenticated split as investment_plans (0001): anonymous
-- landing-page visitors only ever see enabled links; authenticated
-- sessions (including admins managing the list) see all of them.
create policy "social links select public" on social_links for select
  to anon using (enabled = true);
create policy "social links select authenticated" on social_links for select
  to authenticated using (true);
create policy "social links managed by permission" on social_links for all
  using (has_permission('branding.manage')) with check (has_permission('branding.manage'));

insert into social_links (platform, url, enabled, sort_order) values
  ('twitter', '#', false, 1),
  ('facebook', '#', false, 2),
  ('instagram', '#', false, 3),
  ('linkedin', '#', false, 4),
  ('youtube', '#', false, 5),
  ('tiktok', '#', false, 6);

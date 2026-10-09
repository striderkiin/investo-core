-- Editable website text and images (admin: Website > Landing page).
--
-- One row per field the admin has changed. A field with no row shows the
-- default written in the code (src/features/siteContent/landingContent.ts),
-- so deleting a row puts the original text back. Images are uploaded to the
-- public `branding` bucket and stored here as their public URL.
--
-- Anyone can read (the landing page loads before sign-in). Only admins with
-- branding.manage can change it, the same permission as logos and colors.

create table if not exists site_content (
  key text primary key check (key ~ '^[a-z0-9_.]{1,80}$'),
  value text not null check (length(value) <= 5000),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

alter table site_content enable row level security;

create policy site_content_select on site_content for select using (true);
create policy site_content_write on site_content for all to authenticated
  using (has_permission('branding.manage')) with check (has_permission('branding.manage'));

grant select on site_content to anon, authenticated;
grant insert, update, delete on site_content to authenticated;

create or replace function public.site_content_touch()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$function$;

create or replace trigger trg_site_content_touch before insert or update on site_content
  for each row execute function public.site_content_touch();

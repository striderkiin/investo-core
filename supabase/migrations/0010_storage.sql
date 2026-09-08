-- Phase 6: Supabase Storage bucket for branding assets (logo, light/dark
-- logo, favicon). Public read (assets must render on the public site before
-- login); writes gated to branding.manage.

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy branding_assets_public_read on storage.objects for select
  using (bucket_id = 'branding');

create policy branding_assets_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'branding' and has_permission('branding.manage'));

create policy branding_assets_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'branding' and has_permission('branding.manage'));

create policy branding_assets_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'branding' and has_permission('branding.manage'));

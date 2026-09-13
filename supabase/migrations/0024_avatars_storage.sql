-- Storage bucket for client-uploaded profile avatars. Public read (avatars
-- render in headers/dropdowns without an auth check); writes limited to a
-- user's own folder (avatars/{user_id}/...), same ownership pattern as
-- other user-scoped tables, just expressed against the storage path instead
-- of a row's user_id column.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects for select
  using (bucket_id = 'avatars');

create policy avatars_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

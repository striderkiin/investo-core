-- Client-facing identity verification (KYC): one submission per user,
-- reviewed by an admin with 'compliance.manage' (the same permission that
-- already gates compliance_settings, since KYC review is a compliance action).

create type kyc_status as enum ('pending', 'approved', 'rejected');

create table kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references profiles(id) on delete cascade,
  legal_full_name text not null,
  date_of_birth date not null,
  country text not null,
  id_document_path text not null,
  proof_of_address_path text not null,
  status kyc_status not null default 'pending',
  review_notes text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_kyc_submissions_status on kyc_submissions(status);

alter table kyc_submissions enable row level security;

create policy kyc_submissions_select on kyc_submissions for select to authenticated
  using (user_id = auth.uid() or has_permission('compliance.manage'));

-- Inserts/updates only via the security-definer RPCs below, so submission
-- ownership and the pending-on-resubmit / reviewed-by-admin invariants can't
-- be bypassed by a direct table write.
create policy kyc_submissions_none on kyc_submissions for all to authenticated using (false) with check (false);

create or replace function submit_kyc(
  p_legal_full_name text,
  p_date_of_birth date,
  p_country text,
  p_id_document_path text,
  p_proof_of_address_path text
)
returns kyc_submissions as $$
declare
  v_row kyc_submissions%rowtype;
begin
  insert into kyc_submissions (user_id, legal_full_name, date_of_birth, country, id_document_path, proof_of_address_path)
  values (auth.uid(), p_legal_full_name, p_date_of_birth, p_country, p_id_document_path, p_proof_of_address_path)
  on conflict (user_id) do update set
    legal_full_name = excluded.legal_full_name,
    date_of_birth = excluded.date_of_birth,
    country = excluded.country,
    id_document_path = excluded.id_document_path,
    proof_of_address_path = excluded.proof_of_address_path,
    status = 'pending',
    review_notes = null,
    reviewed_by = null,
    reviewed_at = null,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function submit_kyc(text, date, text, text, text) to authenticated;

create or replace function review_kyc(
  p_submission_id uuid,
  p_action text,
  p_notes text default null
)
returns kyc_submissions as $$
declare
  v_row kyc_submissions%rowtype;
  v_new_status kyc_status;
begin
  if not has_permission('compliance.manage') then
    raise exception 'not authorized to review identity verification submissions';
  end if;

  if p_action not in ('approve', 'reject') then
    raise exception 'invalid action: %', p_action;
  end if;

  v_new_status := case p_action when 'approve' then 'approved' else 'rejected' end;

  update kyc_submissions
  set status = v_new_status, review_notes = p_notes, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_submission_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'KYC submission not found';
  end if;

  insert into admin_audit_logs (admin_id, action, module, target, previous_value, new_value, environment)
  values (auth.uid(), 'kyc_' || p_action, 'compliance', p_submission_id::text, null, v_new_status::text, coalesce(current_setting('app.environment', true), 'development'));

  insert into notifications (user_id, type, title, message)
  values (
    v_row.user_id,
    'system_announcement',
    'Identity verification update',
    case v_new_status
      when 'approved' then 'Your identity verification has been approved.'
      else 'Your identity verification was rejected. ' || coalesce(p_notes, 'Please review and resubmit your documents.')
    end
  );

  return v_row;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function review_kyc(uuid, text, text) to authenticated;

-- Private storage bucket for ID/proof-of-address uploads (never public,
-- unlike avatars — signed URLs only, generated on demand for the owner or
-- an admin with compliance.manage).
insert into storage.buckets (id, name, public)
values ('kyc-documents', 'kyc-documents', false)
on conflict (id) do nothing;

create policy kyc_documents_read on storage.objects for select to authenticated
  using (bucket_id = 'kyc-documents' and ((storage.foldername(name))[1] = auth.uid()::text or has_permission('compliance.manage')));

create policy kyc_documents_owner_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy kyc_documents_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy kyc_documents_owner_delete on storage.objects for delete to authenticated
  using (bucket_id = 'kyc-documents' and (storage.foldername(name))[1] = auth.uid()::text);

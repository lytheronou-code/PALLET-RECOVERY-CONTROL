-- Premium V3 M1: private, tenant-isolated Storage bucket for document
-- evidence. Never public. allowed_mime_types/file_size_limit are enforced
-- by the Storage API itself on upload (belt-and-suspenders with the CHECK
-- constraints on public.documents, which the app layer validates against
-- independently before ever calling Storage -- see the upload Server
-- Action).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  15728640,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- Path convention (enforced by the app layer when building the path, and
-- redundantly checked here via storage.foldername for the INSERT policy):
-- {organization_id}/{counterparty_id}/{entity}/{entity_id}/{uuid}-{safe_filename}
--
-- INSERT: path-prefix + role check. At upload time there is no
-- public.documents row yet (the metadata row is written by the same Server
-- Action right after a successful upload), so this can't check the
-- documents table the way SELECT does below -- it trusts the path's own
-- org segment, same as any other tenant-scoped write in this schema, and
-- additionally requires admin/operator like every other write here.
create policy operators_insert_documents_storage
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and exists (
    select 1 from public.organization_members m
    where m.user_id = (select auth.uid())
      and m.role in ('admin', 'operator')
      and (storage.foldername(name))[1] = m.organization_id::text
  )
);

-- SELECT: the canonical authorization source is the public.documents row
-- itself (organization_id, via is_org_member), not the path -- this is
-- what a signed-URL request checks, and it's what M2's client-portal SELECT
-- policy will extend rather than duplicate path-parsing logic.
create policy org_members_read_documents_storage
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and exists (
    select 1 from public.documents d
    where d.storage_path = storage.objects.name
      and public.is_org_member(d.organization_id)
  )
);

-- No UPDATE, no DELETE policy on storage.objects for any authenticated
-- role: a document's file content and path never change after upload
-- (matches guard_document_update's identity-immutability on the metadata
-- row), and physical deletion is never permitted in V1 -- superseding is
-- done at the metadata level via update_document_state(), the file itself
-- stays in Storage as the underlying evidence of what was actually
-- uploaded and when.

-- Independent review fix (fase 4): the upload flow's own error-recovery
-- path (uploadDocumentAction) removes the just-uploaded Storage object
-- when the documents metadata insert fails, but there was intentionally
-- no DELETE policy on storage.objects, so that cleanup call silently
-- no-opped (RLS blocks it) and left an orphaned file behind on every
-- failed upload. Tracked evidence must stay undeletable, so this adds a
-- DELETE policy scoped as narrowly as possible: admin/operator of the
-- object's own organization, AND only when no public.documents row
-- references that storage_path at all. A tracked document's Storage
-- object can never match this policy, whatever its status/visibility.
create policy operators_delete_orphan_documents_storage on storage.objects
  for delete
  using (
    bucket_id = 'documents'
    and not exists (
      select 1 from public.documents d where d.storage_path = storage.objects.name
    )
    and exists (
      select 1 from public.organization_members m
      where m.user_id = (select auth.uid())
        and m.role = any(array['admin', 'operator'])
        and (storage.foldername(storage.objects.name))[1] = m.organization_id::text
    )
  );

-- Independent review fix: the INSERT policy validated only that the
-- first path segment (organization_id) matched the caller's own org --
-- it never checked that the second segment (counterparty_id) was a real
-- counterparty belonging to that org, so an operator could upload to an
-- arbitrary path like orgA/random-uuid/counterparty/random-uuid/x.pdf.
-- The eventual documents INSERT would still fail
-- (documents_org_counterparty_fk requires a real counterparty row), so
-- this was never a data-integrity hole, but it let an operator create
-- storage-only orphans outside any real counterparty's evidence tree
-- before the metadata insert had a chance to reject it. Tightened to
-- require the second path segment to resolve to a real counterparty in
-- the caller's own organization.
drop policy if exists operators_insert_documents_storage on storage.objects;
create policy operators_insert_documents_storage on storage.objects
  for insert
  with check (
    bucket_id = 'documents'
    and exists (
      select 1
      from public.organization_members m
      join public.counterparties c
        on c.organization_id = m.organization_id
        and c.id::text = (storage.foldername(storage.objects.name))[2]
      where m.user_id = (select auth.uid())
        and m.role = any(array['admin', 'operator'])
        and (storage.foldername(storage.objects.name))[1] = m.organization_id::text
    )
  );

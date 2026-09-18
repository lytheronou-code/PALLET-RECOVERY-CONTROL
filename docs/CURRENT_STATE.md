# Current state — Premium Core

Date: 2026-09-18

The premium P0 core is merged into `main` and has a successful Vercel **Production Deployment**.

## Product

Pallet Recovery Control is positioned as a recovery decision and execution control layer:

`movements + vouchers → reconciliation → exposure → priority → recovery → recovered value`

## Premium P0 implemented

- Auth, confirmation callback, protected routes and organization onboarding.
- Recovery Command Center with exposure, recovery rate, recovered value, overdue exposure, ageing, action center and top counterparties.
- Premium flat enterprise design: graphite navigation, teal accent, dense B2B tables, responsive layouts, no decorative gradients.
- Counterparty CRUD + 360° detail.
- Pallet type master data.
- Movement ledger + validated CSV import.
- Voucher workflow: create, list/filter, detail, controlled edit, safe cancellation, direct recovery-case creation.
- Deterministic reconciliation.
- Recovery cases with transactional events and immutable audit semantics.
- Exposure reporting + CSV export.
- Global search.
- Workspace/settings.

## Database integrity

Supabase project: `rizeeehngwbregoxqksy` (`eu-west-3`).

Authoritative rules include:

- tenant-scoped foreign keys;
- recovery case ↔ voucher must match organization, counterparty and pallet type;
- linked case cannot over-claim voucher residual;
- one active recovery case per voucher;
- server-enforced pallet-value snapshot;
- recovery quantity/status changes only through `record_recovery_event`;
- voucher recovered quantity changes only through recovery workflow;
- voucher + case recovery update atomically;
- recovery events append-only;
- pallet movements immutable after insertion;
- no authenticated hard-delete of domain history;
- assignee constrained to organization membership.

## QA completed

Independent transactional attacks against real Supabase passed with rollback and no persisted QA business data.

Automated verification on the premium core:

- TypeScript: pass
- ESLint: pass
- Unit tests: pass
- Production build: pass
- npm audit: 0 vulnerabilities
- Vercel Production Deployment: pass

Public production smoke test:

- `/login`: renders correctly
- `/signup`: renders correctly
- unauthenticated `/`: redirects to login as expected

## Auth email gate before external launch

The live signup test identified the remaining external-infrastructure blocker:

- Supabase built-in email provider returned `email rate limit exceeded`.
- Supabase built-in SMTP is not suitable for production signup.
- Resend domain `lytheron.cloud` is already verified in EU and sending is enabled.
- Custom SMTP still needs to be enabled in **Supabase Authentication settings**.
- The available automation browser is not authenticated to the Supabase dashboard, so this control-plane setting could not be changed autonomously.

The application no longer exposes QA diagnostics. Signup errors are mapped to safe, user-facing messages.

### Required configuration

Configure Supabase Auth custom SMTP with the verified transactional email provider, then run the real browser E2E:

`signup → email confirmation → onboarding → dashboard → master data → movement import → voucher → reconciliation → recovery → report`

This is now the only blocking gate before allowing external users to register.

## P1 delivered on `claude/premium-v2` (2026-09-18, second pass)

The previous freeze ("do not start P1 until browser E2E is cleared") was
explicitly overridden by the product owner's instruction to continue real
development now; live E2E from this sandbox remains blocked by egress
policy (see below), so this pass relied on typecheck/lint/unit tests/build
plus direct, adversarial SQL verification against the real Supabase
project instead.

- **Pagination + search**: counterparties, movements, vouchers and
  recovery cases previously fetched every row with no `limit` — a real
  scalability bug, not a cosmetic gap. All four now paginate (25/page)
  and support a sanitized search bar.
- **Sites / operational locations** (P1 #1): full CRUD at `/sites`,
  wired into voucher and recovery-case creation and shown on the
  counterparty detail page. Route/trip grouping intentionally excluded
  per the explicit non-goal.
- **Movement correction/reversal workflow** (P1 #6): the ledger stays
  immutable; corrections insert a linked reversal (+ optional corrected
  replacement) with reason/actor/timestamp, never an edit to history.
- **Bulk voucher CSV import** (P1 #5): `/import/vouchers` reuses the
  movement-import upload → mapping → preview → confirm architecture,
  with duplicate voucher-number detection (in-file and against the org's
  existing vouchers) since `voucher_number` is unique per organization.
- **Recovery-case assignment / "my queue"** (part of P1 #3): an
  assignee picker on the case list and detail page, plus a "La mia
  coda" filter. Full team-invite-by-email is still not built — it
  requires SMTP configuration, explicitly out of scope for this pass.
- **Org-mate visibility fix**: `organization_members` RLS previously
  scoped `SELECT` to the caller's own row only, so Settings always
  showed a member count of 1 for every organization. Fixed with an
  `is_org_member()` helper; `organization_members.user_id` and
  `recovery_cases.assignee_user_id` were repointed from `auth.users` to
  `public.profiles` (same `ON DELETE CASCADE`) so PostgREST can embed a
  member's name/email — this is what makes the assignee picker and "my
  queue" possible.
- **Route-level loading/error boundaries**: every route previously had
  no `loading.tsx`/`error.tsx`; slow queries rendered a blank page and
  unhandled errors fell through to Next's default screen.
- **FASE 4 security review**: 18 adversarial attacks run as raw SQL
  against the real project inside a transaction with a guaranteed
  `ROLLBACK` (cross-tenant SELECT/UPDATE/DELETE, role-privilege
  escalation, cross-tenant composite-FK bypass attempts, RPC overclaim,
  ledger-immutability bypass, non-member assignment). All 18 were
  blocked; the transaction left zero residual rows. `get_advisors`
  (security + performance) shows no new findings beyond the two
  pre-existing, intentional `SECURITY DEFINER` warnings
  (`bootstrap_organization`, `is_org_member`, both invoked from RLS
  policies and documented in their migrations).

### Not implemented this pass (Truthmode decisions)

- **Documents / photographic evidence** (P1 #2) — real Supabase Storage
  + tenant-scoped policies is a meaningful chunk of work on its own;
  deferred rather than rushed.
- **Team invites by email** — blocked by the explicit instruction not to
  configure Supabase SMTP/Resend in this phase.
- **Recovery planning / trips** (P1 #4) — deferred; sites now give it a
  real foundation (group by site/CAP) without committing to a UI yet.
- **Deadline notification digests** (P1 #7) — needs the same SMTP
  configuration as team invites; the in-app action center already
  surfaces overdue/due-soon signals deterministically.
- **Additional FASE 3 KPIs** (dispute rate, voucher expiry rate,
  recovery cycle time, exposure by site/pallet-type) — the dashboard
  already had ageing, recovery rate and overdue exposure from a prior
  pass; no budget left this pass to add the rest without shipping them
  under-tested.

Out of scope until validated: AI, live GPS, full route optimization, marketplace, QR serialization, carbon certificates and billing administration.

## Independent review fixes (2026-09-18, third pass, same PR)

An independent review of PR #7 found eight enterprise-grade integrity gaps
in the P1 work above. All eight are closed, still on `claude/premium-v2`,
without reverting any of the applied P1 migrations:

- **Movement correction atomicity**: the reversal and corrected-replacement
  inserts moved from two independent Supabase calls into
  `correct_pallet_movement()`, a single Postgres transaction.
- **Double-correction protection**: enforced twice — the RPC checks before
  inserting, and a partial unique index (`correction_type = 'reversal'`)
  is the DB-level backstop against a direct INSERT bypassing the RPC.
- **Site/counterparty consistency**: a DB trigger now requires
  `site.counterparty_id = row.counterparty_id` on vouchers and recovery
  cases; movements allow org-owned depots (`site.counterparty_id is
  null`) explicitly, documented as a deliberate choice.
- **Contextual site pickers**: voucher/recovery-case forms fetch sites for
  only the selected counterparty instead of every site in the org.
- **Site-aware CSV import**: movement and voucher CSV import gained an
  optional site column, resolved by code then name, scoped to the row's
  counterparty, re-validated server-side.
- **Profile email integrity**: `profiles.email` can no longer be edited
  directly (a guard trigger blocks it); it now only changes via a new
  `auth.users` email-change trigger. `display_name` stays editable.
- **Assignee `ON DELETE SET NULL`**: deleting/offboarding a user with
  assigned recovery cases no longer fails; the case survives with the
  assignment cleared.
- **Unbounded-reads audit**: two now-dead unpaginated list functions were
  deleted; every remaining unbounded read has a comment explaining why
  (dropdown/CSV-lookup pickers realistically bounded, or an aggregate that
  requires seeing every row to total correctly).

A bug in the *first* version of the correction RPC was caught by this
pass's own adversarial testing before it shipped: `select ... for update`
on `pallet_movements` silently returned zero rows for every caller,
because Postgres RLS requires a matching UPDATE policy to grant a FOR
UPDATE lock and this table has none by design (full ledger immutability).
Fixed with a transaction-scoped advisory lock instead of a row lock —
verified working via a full adversarial re-run afterward.

Verified with adversarial SQL (ROLLBACK-wrapped, zero residual rows):
cross-counterparty site on a voucher and on a recovery case, correction
atomicity under forced failure, double correction via the RPC, a forged
direct-insert bypass, a forged second reversal after manually clearing
the guard, a direct `profiles.email` edit, `display_name` edit (allowed),
and deleting an assigned user (case survives, assignee cleared).
`npm run typecheck/lint/test/build` all clean (117 tests), `npm audit`: 0
vulnerabilities, Supabase security/performance advisors show no new
findings.

## Premium V3 — M1 Documents/Evidence + M2 Client Portal (2026-09-18, `claude/premium-v3-documents-portal`)

PR #7 (P1 + its independent-review fixes) merged to `main`. This pass
builds on top of it, on a new branch, still additive-only migrations.
Not started until M1 fully passed its own QA/advisors/adversarial pass
(per the explicit gating instruction for this work).

### M1 — Documents / Evidence

- **Schema**: `documents` (always carries both `organization_id` AND
  `counterparty_id`, even when also linked to a more specific entity —
  no ambiguous ownership) + `document_events` (append-only audit trail).
  Six tenant-scoped composite FKs cover counterparty/site/movement/
  voucher/recovery_case/recovery_event links; a
  `validate_document_counterparty_match` trigger rejects a document
  whose linked entity's own counterparty differs from the document's
  declared one (transitively through recovery_case for events).
  `recovery_events` needed its first-ever `unique(organization_id, id)`
  constraint to support this (previously only had FKs pointing away
  from it).
- **Identity immutable, state mutable via RPC only**: a `guard_document_update`
  trigger blocks every column except status/visibility/notes; those only
  change through `update_document_state()` (SECURITY INVOKER, atomically
  updates state + writes the matching `document_events` row). No DELETE
  policy anywhere — superseded/reactivated states preserve the audit
  trail instead of removing evidence; admin-only hard delete was
  explicitly not built (deliberate, per the spec's own preference).
- **Storage**: private `documents` bucket (`public = false`), allowlisted
  to PDF/JPG/PNG/WEBP at 15MB via `storage.buckets.allowed_mime_types`/
  `file_size_limit`. Deterministic path:
  `{organization_id}/{counterparty_id}/{entity}/{entity_id}/{uuid}-{safe_filename}`
  — never trusted for authorization; the SELECT policy authorizes
  strictly through a matching `public.documents` row instead of parsing
  the path, so `createSignedUrl()` is gated the same way as everything
  else. Server-side validation (`lib/documents/storage-path.ts`)
  cross-checks the declared MIME type against the file extension (a
  renamed-executable defense the browser's own MIME sniffing can't give)
  in addition to the Storage bucket's own allowlist.
- **UX**: a `DocumentsPanel`/`DocumentsSection` embedded on Recovery
  Case, Voucher, Movement correction and Counterparty detail pages —
  context-driven evidence sections (type/file/uploader/date/visibility/
  status/open/share/supersede), not a generic file-manager clone. Each
  panel's own query is paginated (`.range()`), single bounded page by
  design for this scope (a case/voucher/movement's evidence set is
  realistically small).
- **Tests**: 24 new unit tests (filename sanitization incl. path
  traversal, MIME allowlist, MIME/extension cross-check, storage-path
  construction, upload schema validation).
- **Adversarial SQL** (ROLLBACK-wrapped, zero residual rows), 12 attacks:
  cross-tenant documents SELECT (by org filter and by known id),
  cross-tenant Storage SELECT (known path and prefix scan), forged
  `organization_id` on document INSERT and on Storage upload, a viewer-role
  (non-admin/operator) org member attempting upload, a forged
  cross-org `counterparty_id` (blocked by the composite FK), a
  same-org mismatched linked-movement counterparty (blocked by the
  trigger), a disallowed MIME type and an oversized file (blocked by
  DB check constraints as defense-in-depth behind the app-layer
  validation), a direct identity-field tamper on an existing document
  (blocked by `guard_document_update`), and a direct `document_events`
  INSERT with no flag set (blocked — the one "not blocked" result during
  first-pass testing was confirmed a same-transaction artifact of the
  audit trigger's `set_config(..., true)` persisting for the rest of
  *that* multi-statement test transaction, not a real cross-request
  vulnerability; re-verified clean in an isolated transaction).
- **Advisors**: closed two real Performance Advisor findings this schema
  introduced (4 unindexed foreign keys; one RLS policy re-evaluating
  `current_setting()` per row instead of via a scalar subselect).
  Security Advisor shows only the pre-existing intentional
  `SECURITY DEFINER` warnings.
- `npm run typecheck/lint/test/build`: clean (141 tests). `npm audit`: 0
  vulnerabilities.

### M2 — Client Portal

- **Schema**: `client_portal_memberships` (role fixed to `client_viewer`
  in V1 — "don't overbuild roles now" — `organization_id` +
  `counterparty_id` + `user_id`, `active` flag). RLS: self can read their
  own row; org admin/operator can read/write (self-escalation blocked —
  a client cannot insert their own membership). Client users are never
  added to `organization_members`.
- **No new RLS policy on `recovery_cases`/`pallet_movements`/`vouchers`/
  `documents` for the client role.** RLS is row-level only and can't
  hide a column, so granting the client role any SELECT policy on those
  tables would let a client bypass the UI and pull internal columns
  (`assignee_user_id`, case `notes`, ...) straight from PostgREST. Every
  client-facing read instead goes through a SECURITY DEFINER `portal_*`
  function (`portal_get_context`, `portal_counterparty_summary`,
  `portal_list_vouchers`/`movements`/`recovery_cases`/`documents`,
  `portal_get_document_storage_path`) that resolves org/counterparty
  from the caller's OWN membership row (never a client-supplied
  parameter — nothing to forge) and returns an explicit, hand-picked
  safe column list. `recovery_cases.notes`/`assignee_user_id` and every
  internal-only column are structurally absent from the return type,
  not just filtered at query time.
- **Storage**: an additive `client_portal_read_documents_storage` SELECT
  policy via a new `is_client_visible_document_path()` SECURITY DEFINER
  helper. A first version used a plain `EXISTS` subquery against
  `public.documents` directly inside the policy — that subquery is
  itself subject to `documents`' own RLS, and a client-portal user has
  no SELECT policy there, so it always saw zero rows and the policy
  never matched even for a document the client *was* authorized to
  read; caught and fixed by this pass's own adversarial re-test.
- **Admin UI**: a "Portale clienti" panel on the counterparty detail
  page (grant by email via `admin_grant_client_portal_access`, which
  does its own admin/operator check since an operator's normal
  RLS-scoped session can't look up an arbitrary external profile by
  email; activate/deactivate toggle). Team invites by email are still
  blocked on SMTP configuration (same as P1) — this assumes the client
  already self-registered via the existing public `/signup` flow.
- **Routing**: `resolveWorkspace()` checks internal membership and
  portal membership in parallel — internal-only → `/dashboard`,
  portal-only → `/portal`, both → `/select-workspace`, neither →
  `/onboarding`. Root `/` and the post-login redirect now run this
  instead of assuming every signed-in user belongs in the internal app.
- **Portal UX**: a separate `(portal)` route group, its own layout (no
  internal sidebar, a simple pill nav: Panoramica/Pallet/Buoni/Recuperi/
  Documenti), **read-only throughout** — no create/edit/delete anywhere
  in this route group. Overview shows pallet outstanding, estimated
  exposure, open vouchers, active recoveries, recovered pallets/value,
  next due date. Documents list only ever shows `visibility='client'`
  rows; "Apri" calls a portal-scoped signed-URL action that re-verifies
  authorization at click time (not just at list time).
- **Deferred, explicitly out of scope for this pass**: `client_case_responses`
  (structured dispute acknowledge/contest) — the spec allowed skipping
  it if it added too much scope, and core M1+M2 already needed the full
  budget to ship correctly verified; nothing in the portal currently
  lets a client change any operational state, so this is a pure
  addition, not a gap.
- **Adversarial SQL** (ROLLBACK-wrapped, zero residual rows) covering
  attack scenarios 6, 7, 9, 11, 14, 16 from the spec plus extras: a
  client reading an internal-visibility document of their own
  counterparty (blocked), a client reading internal recovery-case notes
  via direct table SELECT (blocked, 0 rows), a client self-inserting a
  membership for another counterparty (blocked by RLS), an inactive/
  offboarded membership (every `portal_*` call raises "no active client
  portal membership"), cross-org isolation for both the RPCs and the
  Storage SELECT policy (Client B never sees Org A's data), an internal
  operator calling the portal RPCs with no portal membership of their
  own (blocked), an anonymous/unauthenticated call to a portal RPC
  (blocked — `EXECUTE` explicitly revoked from `anon` on every
  `portal_*`/`is_client_*` function after the Security Advisor flagged
  Supabase's default `anon`/`authenticated` grant on new functions), and
  a deleted/offboarded user's `client_portal_memberships` row cascading
  away automatically (`ON DELETE CASCADE` via `profiles`).
- Two real bugs caught by this pass's own adversarial re-test before
  shipping: `portal_list_recovery_cases` declared `opened_at` as
  `timestamptz` when the real column is `date`; and PL/pgSQL's
  `RETURN QUERY` requires an *exact* type match against `RETURNS TABLE`
  (no implicit `int -> numeric`/`bigint -> numeric` cast the way a plain
  top-level `SELECT` would apply) — every quantity/sum column needed an
  explicit cast.
- **Advisors**: closed a `multiple_permissive_policies` Performance
  Advisor finding (two overlapping SELECT policies on
  `client_portal_memberships` merged into one OR'd policy) and the
  `anon`-executable Security Advisor findings above. Remaining findings
  are the same pre-existing intentional `SECURITY DEFINER` warnings plus
  informational "unused index" notices (expected — no production
  traffic yet on brand-new indexes).
- `npm run typecheck/lint/test/build`: clean (141 tests, unchanged from
  M1 — no new portal-specific unit tests were added; portal logic is
  thin server-component/data-loader wiring over already-tested RPCs, and
  its real coverage is the adversarial SQL above). `npm audit`: 0
  vulnerabilities. Manual smoke test: every internal/portal route
  correctly redirects an unauthenticated request to `/login?next=...`,
  no redirect loop, `/login` itself renders 200.

### Not implemented this pass

- **`client_case_responses`** (structured client dispute
  acknowledge/request-clarification/contest) — explicitly optional per
  the spec, skipped to keep the verified core in scope.
- **Team/client invites by email** — still blocked on Supabase SMTP
  configuration, same blocker as P1's team invites.
- **Additional portal roles** (`client_manager`, etc.) — V1 ships a
  single fixed `client_viewer` role by explicit instruction not to
  overbuild.

## Independent review fixes (2026-09-19, fourth pass, same PR #8)

A focused independent-review hardening pass on the M1/M2 work above,
still on `claude/premium-v3-documents-portal`, additive migrations only:

- **Storage orphan cleanup**: `uploadDocumentAction`'s own error-recovery
  path removed the just-uploaded Storage object when the metadata insert
  failed, but there was intentionally no DELETE policy on
  `storage.objects` — that cleanup call silently no-opped under RLS and
  left an orphaned file on every failed upload. Added a narrowly-scoped
  DELETE policy: admin/operator of the object's own organization, AND
  only when no `public.documents` row references that `storage_path` at
  all — tracked evidence can never match it. Verified via the exact
  boolean logic Postgres RLS evaluates per row (literal SQL `DELETE` on
  `storage.objects` is blocked platform-wide by Supabase's own
  `storage.protect_delete()` trigger, confirmed via `pg_trigger` — not a
  sandbox limitation; real deletion goes through the Storage API, which
  checks this same policy).
- **Storage INSERT hardening**: the INSERT policy validated only that
  the first path segment (`organization_id`) matched the caller's org,
  never that the second segment (`counterparty_id`) was a real
  counterparty in that org. Tightened to require both.
- **Magic-byte file signature validation**: declared MIME type and
  filename extension are both strings the uploader controls. Server now
  reads only the leading bytes (`File.slice()`, never the full file) and
  checks them against each allowed format's real signature (`%PDF-`,
  `FF D8 FF`, the 8-byte PNG header, `RIFF....WEBP`) before the file
  ever reaches Storage.
- **Client portal: `priority` removed** from `portal_list_recovery_cases`
  — an internal recovery-management concept (escalation/strategy) with
  no business being shown to the counterparty the case is about. Removed
  from the RPC's `RETURNS TABLE` entirely, not just unused client-side.
- **Client portal: `notes` removed** from `portal_list_documents` — an
  internal operational field; a document being `visibility='client'`
  does not imply every internal annotation on its row should be too.
- **Client portal access management is admin-only**: granting/
  activating/deactivating a client's access to their own operational and
  financial data is an authorization operation, not a day-to-day
  operator task. `client_portal_memberships` INSERT/UPDATE/DELETE RLS
  and `admin_grant_client_portal_access()` tightened from admin/operator
  to admin only; operators keep read access to membership status. UI
  hides the grant/activate/deactivate controls for non-admins.
- **One active portal membership per user**: `portal_current_context()`
  picked the most-recently-created active membership when a user had
  more than one — silently deciding which customer's data they see. A
  partial unique index (`client_portal_memberships (user_id) WHERE
  active`) now enforces exactly one; `admin_grant_client_portal_access`
  rejects granting a second active counterparty with a clear message.
- **Portal RPC pagination clamp**: all four `portal_list_*` functions
  now cap `p_page_size` at 100 (`least(greatest(...), 100)`) — a portal
  user calling a SECURITY DEFINER RPC directly could otherwise request
  an unbounded row count. Not a data-isolation issue, but avoidable load.
- **Explicit Server Action results**: `setDocumentStatusAction`/
  `setDocumentVisibilityAction` returned `void` and were wired to plain
  fire-and-forget `<form action>` elements — a blocked RLS check or
  failed RPC call looked identical to success in the UI. Both now return
  `{ error? }`; the UI calls them directly (matching the existing
  download-button pattern) so a real failure surfaces to the user.
  `setClientPortalMembershipActiveAction` got the same treatment plus
  the single-active-membership conflict mapping.
- **Two real bugs found and fixed by this pass's own adversarial
  re-test**: `admin_grant_client_portal_access` declares `RETURNS TABLE
  (id, user_id, email, active)`, which implicitly creates PL/pgSQL
  variables with those names in the function body's scope. Unqualified
  references to `id` and `active`, plus the INSERT's own `ON CONFLICT
  (..., user_id)` column list (which cannot be table-qualified),
  collided with them — every single call failed with "column reference
  is ambiguous", including legitimate admin calls. This function had
  never actually worked since its introduction earlier in this PR.
  Fixed with explicit table-alias qualification everywhere possible,
  plus a `#variable_conflict use_column` directive for the one position
  that cannot be qualified. Verified end-to-end afterward (a real grant,
  idempotent re-grant, and the single-active-membership rejection all
  now behave correctly).

Verified with adversarial SQL (ROLLBACK-wrapped, zero residual rows),
covering every scenario the review asked for: tracked evidence
undeletable, orphan cleanup logic allowed for admin/operator, blocked
for viewer/portal-user/cross-tenant admin; `INSERT` with a fake
counterparty-id path segment blocked, a real one still works; portal
`recovery_cases`/`documents` RPCs confirmed to have no `priority`/`notes`
column in their return type at the `information_schema` level; operator
blocked from granting/deactivating portal access, admin succeeds; a
second active membership blocked both through the RPC and via a direct
`INSERT` bypass; a huge `p_page_size` request returns without error;
internal-visibility and superseded documents both remain invisible to
`portal_list_documents` and rejected by `portal_get_document_storage_path`
(the superseded case specifically, not just internal-visibility, which
was the only case tested before).

`npm ci`, `npm run typecheck/lint/test/build`: clean (148 tests, +7 from
magic-byte signature coverage). `npm audit`: 0 vulnerabilities. Supabase
Security Advisor: only the same pre-existing intentional `SECURITY
DEFINER` warnings (now 12, including the fixed
`admin_grant_client_portal_access` — all confirmed `search_path=public`,
`anon` execute explicitly revoked, `authenticated` execute intentional).
Performance Advisor: only informational "unused index" notices.

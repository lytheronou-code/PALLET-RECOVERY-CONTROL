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

## Premium V4 — international self-service foundation (2026-09-19)

On `claude/premium-v4-international-selfservice` (PR open toward `main`,
not merged). Builds the foundation for internationalization, self-service
organization configuration, and white-label Client Portal branding — a
"not necessarily 100% end-state" foundation as scoped by the task, not a
translation of every existing screen (see "What's deliberately not done"
below).

### i18n architecture

Hand-rolled, not a routing-framework library (no `next-intl`): centralized
JSON dictionaries (`src/i18n/messages/en.json`, `it.json`), a type-safe
`createTranslator()` deriving every valid dot-path key from `en.json`'s own
shape (`typeof en`), and **no locale-prefixed routes** (`/en/...`,
`/it/...`). This was a deliberate choice over `next-intl`'s default
routing: this is an authenticated B2B app where locale is a per-user/
per-organization *data* decision (see hierarchy below), not a URL/SEO
concern, and locale-prefixed routing would have meant rewriting every
route under `app/[locale]/...` — high risk to the already-built auth/
workspace-resolution routing for no benefit here. Extending to `de`/`fr`/
`es`/`pt` later is: add the locale to `SUPPORTED_LOCALES`
(`src/i18n/locale.ts`), add a new dictionary file, extend the two DB CHECK
constraints (locale is validated in exactly two places: the
`organizations.default_locale`/`profiles.preferred_locale` CHECK
constraints and the `admin_update_organization_localization` RPC) — no
page rewrites.

**Locale resolution hierarchy** (`src/i18n/resolve.ts`):
`profiles.preferred_locale` (explicit per-user choice, nullable = "not
set") → `organizations.default_locale` (per-tenant default, itself
constrained to `en`/`it`) → a `prc_locale` cookie or `Accept-Language`
header (unauthenticated pages only) → `en`. Internal operators and Client
Portal users resolve through the *same* function with their own
organization context, so — the worked example from the task spec — an
Italian-default organization can have an English-preference internal
operator and an English-preference portal customer coexisting with an
Italian-preference operator and an Italian-preference portal customer, all
correctly independent. `src/i18n/server.ts`'s `getPageContext()` is the one
call operational pages use: resolves locale + org currency/timezone in a
single round trip and returns a translator plus bound formatters together.

**Language switcher** (`src/components/language-switcher.tsx` +
`src/lib/actions/locale.ts`): two buttons (EN/IT), present in the internal
app topbar and the Client Portal header. Persists to
`profiles.preferred_locale` for authenticated users (their own row, via
the existing `self_update_profile` RLS policy — no new policy needed) and
to the `prc_locale` cookie for everyone (harmless for authenticated users,
since the cookie is never consulted once a profile preference exists).
Implemented as a plain `<form action={serverAction}>` per button — no
client-side state, no refresh loop, and it cannot affect
`resolveWorkspace()`/auth routing because it only ever writes
`profiles.preferred_locale` and a cookie, never `organization_members` or
`client_portal_memberships` (the two tables workspace routing actually
reads).

**Formatting** (`src/lib/format.ts`): `createFormatters(locale, currency,
timeZone)` built on `Intl.NumberFormat`/`Intl.DateTimeFormat`, replacing
the previous hardcoded `it-IT`/`EUR`/implicit-local-timezone formatters.
`en` renders as `en-GB` (DD/MM dates, leading currency symbol) rather than
`en-US`, a deliberate choice for an EU-heavy international B2B product,
not a US-only assumption. Every page that reads `formatCurrency`/
`formatDate`/`formatNumber` now gets them from `getPageContext()` — no
remaining hardcoded `it-IT`/`EUR` formatter in the app. The 3 interactive
client-side table components that render dates receive `locale`/
`currency`/`timeZone` as plain serializable props and build their own
formatter locally (a bound function can't cross the server/client
boundary as a prop).

**Translation-completeness test**
(`src/lib/__tests__/i18n-completeness.test.ts`, and `npm run i18n:check`
to run it alone): fails if `en.json` and `it.json` ever have different key
sets in either direction, or if either has an empty string value. Runs as
part of `npm run test`, so it already gates CI.

### Organization localization, currency, timezone

Additive migrations, all nullable/safely-defaulted (verified before
writing them: **zero** organization rows existed in this database at the
time, so there was no real Italian-tenant data to preserve or default
toward — the defaults below are the neutral international choice for a
brand-new tenant, not a backfill decision):

- `organizations.default_locale text not null default 'en' check (in
  ('en','it'))`
- `organizations.default_currency text not null default 'EUR' check
  (format ~ '^[A-Z]{3}$')` — format-checked at the DB layer; the actual
  *supported* set (25 common international currencies,
  `src/lib/currencies.ts`) is enforced by `admin_update_organization_localization`
  and mirrored in a SQL array inside that function (documented there as
  the thing to keep in sync when adding a currency).
- `organizations.timezone text not null default 'UTC'` — validated
  against Postgres's own `pg_timezone_names` inside the RPC (can't be a
  CHECK constraint; that catalog isn't immutable), so it's always a real
  IANA name.
- `profiles.preferred_locale text` (nullable — see hierarchy above).

Mutated only via two admin-only `SECURITY DEFINER` RPCs,
`admin_update_organization_company` and `admin_update_organization_localization`
(deliberately two functions, not one combined — see "bug found and fixed"
below for why). No direct RLS `UPDATE` policy on `organizations` exists or
is needed; the RPCs are the sole write path, same pattern as
`bootstrap_organization`.

**One real bug found and fixed by this phase's own adversarial QA**
(`20260919110000_fix_country_currency_validation_logic.sql`): both RPCs
validated their allow-list with `value <> any(array[...])`, which
evaluates true as soon as the value differs from *at least one* array
element — true for nearly any input, not the SQL spelling of "not in this
list" (`<> all(...)` is). Every legitimate call with a real country code
or currency, including `'IT'`/`'EUR'`, was being rejected as
"unsupported". Neither RPC had ever actually accepted a valid value since
being created a few commits earlier in this same PR. Caught by a
"positive control" scenario (a legitimate update should succeed) in the
17-scenario adversarial suite, fixed, and the full suite re-run clean.

### International company/counterparty/site schema

Additive columns only, existing `address_line`/`province` kept as-is
(they already served as "line 1"/"region"; not renamed, to avoid an
invasive sweep across every form/CSV-import/data-layer consumer for no
functional gain):

- `organizations`: `legal_name`, `trading_name`, `country_code`, `tax_id`,
  `vat_id`, `registration_number`, `address_line_1`, `address_line_2`,
  `city`, `region`, `postal_code`, `website`, `support_email`,
  `support_phone` — all nullable, no existing rows to backfill.
- `counterparties`: `+ trading_name, tax_id, registration_number,
  address_line_2` (existing `vat_number` already served as the
  international "vat_id" concept and was already optional — no schema
  change needed to satisfy "VAT not mandatory globally").
- `sites`: `+ address_line_2`.

A curated ISO 3166-1 alpha-2 country list (`src/lib/countries.ts`, ~195
entries, English names — reference data, not translated UI copy) backs a
real `<select>` (`src/components/country-select.tsx`) that replaced the
free-text 2-letter country inputs on the counterparty/site forms, and
`counterpartySchema`/`siteSchema` now validate against it
(`isSupportedCountry`) instead of only checking string length.

### Self-service Organization Settings (`/settings`)

Four tabs (Company / Localization / Branding / Client Portal) via
`?tab=` query params — a server-rendered tab pattern (same as the Client
Portal nav), no client-side tab state. Admins get the real forms; every
other role gets a read-only `<dl>` of the same fields. The Client Portal
tab is intentionally a pointer to the existing per-counterparty
`ClientPortalAccessPanel` (on each counterparty's own detail page) rather
than a duplicate management UI — that feature already existed from
Premium V3 and manages access per-counterparty, which is where it belongs.

### White-label branding foundation

`organization_branding` (`organization_id` primary key — branding is
inherently 1:1 with an org): `portal_name`, `logo_path`,
`compact_logo_path`, `primary_color`/`secondary_color` (hex, DB
CHECK-validated), `support_email`, `support_phone`, `website`,
`welcome_message_it`/`welcome_message_en`. A single combined SELECT RLS
policy (`readers_read_branding`, merged from two policies after a
Performance Advisor "multiple permissive policies" finding) grants read to
an org's own internal members *or* its own active Client Portal members
— never any other organization's, verified adversarially. Mutation is a
single admin-only `SECURITY DEFINER` RPC
(`admin_update_organization_branding`), which also validates that any
supplied `logo_path`/`compact_logo_path` actually sits under the calling
organization's own Storage prefix (blocks a forged cross-tenant path even
from a legitimate admin of a *different* org).

**Logo storage**: a separate private Storage bucket, `branding-assets`
(deliberately not the `documents` bucket — branding assets are
non-sensitive presentation images with no audit-trail requirement, unlike
evidence documents, so a replace/delete flow is safe here in a way it
isn't for documents). PNG/JPEG/WEBP only (no SVG — an SVG can embed
`<script>`, and "safely sanitized" is a real parsing project not justified
for v1), magic-byte-validated (not just MIME/extension — mirrors the
documents feature's approach), 2 MB limit, enforced at both the app layer
(`src/lib/branding/logo.ts`) and the Storage bucket's own
`file_size_limit`/`allowed_mime_types`.

**Brand color**: hex-format server-side validation
(`src/lib/branding/color.ts`, both app-layer and a DB CHECK constraint on
`organization_branding`) rejects arbitrary CSS strings (`red`,
`javascript:alert(1)`, anything not `#RRGGBB`) — verified adversarially.
Accessibility is handled by automatic WCAG contrast derivation
(`getReadableTextColor`, relative-luminance formula) rather than by
rejecting valid-but-unusual colors: any well-formed hex color is accepted,
and the portal always picks black or white button text against it.

**Client Portal white-label behavior**: the portal layout
(`src/app/(portal)/portal/layout.tsx`) renders the organization's own
logo, portal name, welcome message (in the viewer's resolved locale),
support email/phone, and brand color — the brand color is applied via a
CSS custom-property override (`--accent`/`--portal-text-on-accent`)
scoped to a `.portal-shell` wrapper class, so it affects only the portal's
own buttons/accents and never leaks into the internal app's own `:root`
branding. A discreet "Powered by Pallet Recovery Control" line is always
present as plain text (not a config flag), specifically so a future
plan-controlled toggle can gate it later without restructuring the
layout — no plan-gating logic exists yet, per the explicit scope
boundary. The internal app's own sidebar/topbar branding
("Recovery Control" + the workspace's own org name in the sidebar footer)
is untouched — full internal-app white-labeling was explicitly out of
scope for this milestone.

**Future custom-domain compatibility**: nothing here assumes
`app.palletrecoverycontrol.com`. `organization_branding.portal_name` and
the branding resolution path (`getOrganizationBranding(organizationId)`,
keyed purely by the caller's own resolved org context, never by hostname)
would work unchanged if a future `portal.<tenant>.com` were added in
front of the same routes — domain provisioning itself remains out of
scope for this PR, as instructed.

### Guided self-service onboarding

`createOrganizationAction` now redirects to `/onboarding/setup?step=company`
instead of straight to `/dashboard`. A 6-step wizard (Company →
Localization → Branding → Operational setup → First customer → Ready),
reusing the exact same form components as `/settings` (one place that
knows how to save each kind of data, not two). Every step after Company
has both a persistent "Skip for now" link straight to the dashboard and a
"Next" link that never depends on that step's form having been submitted
— nothing is a hard gate, and everything remains editable from Settings
afterward. Pallet type presets (EPAL/EUR, CHEP, LPR, Generic) seed a
normal, fully editable `pallet_types` row with `unit_value = 0` rather
than a fabricated price — the app has no basis for guessing what a pallet
is worth to an arbitrary organization in its own base currency, and a
wrong invented number would be worse than an obvious placeholder.

### Friendly error mapping

`src/lib/errors/friendly.ts` (`mapDatabaseError`) maps a raw Postgres
error to a translated, non-technical message — a `23505` unique-violation
code becomes "A record with these details already exists." /"Esiste già
un record con questi dati.", an RLS/permission-denied message becomes "You
do not have permission to perform this action." — never the raw
`error.message`/`error.code`. Wired into the counterparties/sites/
pallet-types Server Actions (previously ad hoc hardcoded Italian strings
for every failure path, including ones unrelated to permissions).

### CSV import/export

Verified rather than rebuilt: the column-mapping architecture already
supported both IT and EN header names (`AUTO_MAP_HINTS` in
`movement-import.ts`/`voucher-import-wizard.tsx` already included
`"controparte"/"customer"`, `"quantità"/"quantity"`,
`"buono"/"voucher number"`, etc.) as *pre-fill suggestions* for an
explicit, user-confirmed dropdown — never a silent automatic guess that
changes which column feeds which field. What was added: the exposure
report's CSV export (`/report/export`) now takes its 7 column headers as
a parameter, resolved to the viewer's locale via `getT()`, instead of a
hardcoded Italian list — the exported row *values* are byte-identical
regardless of language (plain numbers, never locale-formatted strings).

### Adversarial security QA (17 scenarios)

Run via raw SQL against the real Supabase project, all inside one
`BEGIN ... ROLLBACK` transaction (role-switched to `authenticated` with
`request.jwt.claim.sub` set per test user, mirroring how PostgREST
actually authorizes a request) — confirmed zero residual rows afterward.
All 17 scenarios (plus 3 positive controls, including the two that caught
the currency/country bug above) pass: cross-org branding read/write
blocked, operator/portal-user blocked from admin-only mutation, forged
org ID and forged logo path blocked, invalid currency/locale/timezone/
country/color all blocked with the correct error, oversized/wrong-format
logo blocked at the Storage bucket config level (`file_size_limit`:
2097152, `allowed_mime_types`: png/jpeg/webp — app-layer magic-byte
rejection covered separately by unit tests), a legitimate update
succeeds and persists correctly, switching locale/currency does not
alter an unrelated `recovery_cases` row's `quantity_claimed`, and
switching language cannot affect auth/workspace routing by construction
(the switcher only ever writes `profiles.preferred_locale` and a cookie,
never `organization_members`/`client_portal_memberships`).

### What's deliberately not done (foundation, not full end-state)

- **Full screen-by-screen translation.** The i18n architecture, the
  translation-completeness test, and the highest-leverage/most-visible
  surfaces (auth, nav shell, topbar, Client Portal shell, Settings,
  onboarding wizard, dashboard KPI labels for currency/date/number,
  exposure report CSV headers) are translated end-to-end and proven in
  both languages. The remaining operational page *body* copy (table
  column headers and inline labels on movements/vouchers/reconciliation/
  recovery-case detail/CSV import screens, etc.) still renders Italian
  text regardless of the viewer's resolved locale — the DB-facing
  values under them are already fully locale-aware
  (`formatCurrency`/`formatDate`/`formatNumber` via `getPageContext()`
  everywhere), but the surrounding labels are not yet routed through
  `t()`. This is the largest remaining piece of work before "the entire
  product is usable in English" is literally true end to end, and it is
  mechanical (thread `t()` through ~15-20 more page files using the same
  pattern already established) rather than architectural.
- Zod validation messages outside `auth`/`onboarding` (master-data.ts,
  document.ts, etc.) remain hardcoded Italian strings — the factory-
  function pattern used for auth (`buildLoginSchema(t)`) was not extended
  to every other schema.
- SMTP/Client Portal invitation email sending (explicitly out of scope —
  no SMTP configured); the data model (`profiles.preferred_locale`,
  `organizations.default_locale`) is already shaped for a future
  transactional email's language to resolve the same way.
- Stripe/plans/billing, custom domain provisioning, full internal-app
  white-labeling: all explicitly out of scope per the task.
Performance Advisor: only informational "unused index" notices.

## Premium V5 — team management role UI (2026-09-19)

See `docs/PRODUCT_AUDIT.md`'s "Premium V5 status update" for the full
writeup. Short version: Settings > Team is a real UI now (list members,
admin adds an existing account by email with a chosen role, admin
changes another member's role or removes them), backed by three new
admin-gated RPCs (`admin_add_organization_member`,
`admin_update_organization_member_role`,
`admin_remove_organization_member`) since `organization_members` has no
client-facing write RLS policy by design. A caller can never target
their own membership, which also rules out a "last admin" edge case.
Adversarial QA (12 scenarios) caught and fixed one real bug pre-ship: an
ambiguous `id` reference in the role-change RPC's `UPDATE` statement,
caused by its own `RETURNS TABLE (id uuid, ...)` shadowing the column
name. 237/237 tests passing (7 new), typecheck/lint/i18n:check/build/
audit clean, Security/Performance advisors show no new findings beyond
the expected new `SECURITY DEFINER`-callable-by-`authenticated` entries
for the three new RPCs.

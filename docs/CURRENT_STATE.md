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

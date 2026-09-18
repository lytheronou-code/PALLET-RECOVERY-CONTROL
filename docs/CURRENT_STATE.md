# Current state — Premium Core

Date: 2026-09-18

PR #1 remains **Draft** against `main`. Do not merge until the live browser E2E gate is cleared.

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

Latest migrations include:

- `20260918065436_sync_linked_voucher_recovery`
- `20260918070430_index_tenant_scoped_foreign_keys`
- `20260918071605_harden_audit_and_recovery_invariants`
- `20260918072129_optimize_recovery_event_rls_policy`

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

## QA

Independent transactional attacks against real Supabase passed, with rollback and no persisted QA business data.

Latest automated verification before this documentation-only commit:

- TypeScript: pass
- ESLint: pass
- Unit tests: **81/81 pass**
- Production build: pass
- npm audit: **0 vulnerabilities**
- Vercel preview build: pass

## Remaining gate before merge

Real browser E2E:

`signup → email confirmation → onboarding → dashboard → master data → movement import → voucher → reconciliation → recovery → report`

## P1 after E2E/pilot

1. Sites / operational locations.
2. Documents + photographic evidence.
3. Team invites / roles / assignment queues.
4. Recovery planning / trips / stops.
5. Bulk voucher import.
6. Additive movement correction/reversal workflow.
7. Deadline notifications/digests.

Out of scope until validated: AI, live GPS, full route optimization, marketplace, QR serialization, carbon certificates and billing administration.

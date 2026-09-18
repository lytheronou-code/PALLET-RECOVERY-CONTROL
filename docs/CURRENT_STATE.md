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

## P1 after Auth E2E / pilot

1. Sites / operational locations.
2. Documents + photographic evidence.
3. Team invites / roles / assignment queues.
4. Recovery planning / trips / stops.
5. Bulk voucher import.
6. Additive movement correction/reversal workflow.
7. Deadline notifications/digests.

Out of scope until validated: AI, live GPS, full route optimization, marketplace, QR serialization, carbon certificates and billing administration.

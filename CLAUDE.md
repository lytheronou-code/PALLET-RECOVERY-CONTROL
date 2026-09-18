# Claude Code Handoff — Pallet Recovery Control

## Mission
Build a real production-capable B2B web application for pallet leakage reconciliation and recovery operations. This is NOT a mockup, NOT a Lovable project, and NOT part of Lytheron Cloud.

## Hard boundaries
- Never modify or reference the existing Supabase project `lytheron-cloud-vision` (`drkqaedxsftparcoebmu`).
- Use only the dedicated Supabase project `pallet-recovery-control` with ref `rizeeehngwbregoxqksy`.
- Supabase URL: `https://rizeeehngwbregoxqksy.supabase.co`.
- Never expose service-role/secret keys to the browser or commit secrets.
- Use current Supabase SSR patterns and Next.js App Router.
- Every public table must keep RLS enabled.
- Authorization must be organization-scoped, not merely `authenticated`.
- Do not use `user_metadata` for authorization.
- Version every schema change as a Supabase migration.
- Remote migration history already contains `20260917201815_create_recovery_core_schema` and `20260917201847_optimize_indexes_and_rls`. Before adding schema changes, sync/pull the remote schema rather than recreating it.
- Run lint, typecheck, build, tests and Supabase security checks before declaring a milestone complete.
- No AI feature is required for the MVP.
- Do not build generic WMS/TMS, marketplace, QR tracking, PPWR SaaS or RENTRI SaaS.

## Product definition
The product answers four questions for an industrial/logistics customer:
1. How many pallets are owed to us right now?
2. What is their economic exposure?
3. Which credits/vouchers are at risk or require action first?
4. How much value has the recovery operation actually recovered?

Core flow:
`imports (DDT / movements / vouchers) -> reconciliation -> leakage/exposure -> recovery case -> recovery events -> recovered value`

## Existing Supabase schema
Tables already exist and RLS/security advisor are clean:
- organizations
- organization_members
- counterparties
- pallet_types
- import_batches
- pallet_movements
- vouchers
- recovery_cases
- recovery_events

Important recovery fields:
- `recovery_cases.quantity_claimed`
- `recovery_cases.quantity_recovered`
- `recovery_cases.unit_value_snapshot`
- open exposure = `(quantity_claimed - quantity_recovered) * unit_value_snapshot`

## MVP milestones — execute in this order

### M1 — Auth and organization bootstrap
- Email/password login plus magic link if useful.
- Protected app routes.
- Create a safe first-user onboarding flow that provisions an organization and owner membership.
- Never solve access errors by disabling RLS or adding broad policies.
- Add logout.

### M2 — Operational shell and dashboard
- Professional desktop-first B2B UI, responsive on tablet/mobile.
- Navigation: Dashboard, Import, Reconciliation, Recovery Cases, Counterparties, Pallet Types, Settings.
- Dashboard KPIs from real Supabase data only: open pallets, open economic exposure, recovered pallets, recovered economic value, cases due soon, overdue cases.
- Table: highest exposure counterparties.
- Table: cases requiring action.

### M3 — Master data
CRUD for counterparties and pallet types. Validate inputs with Zod. Pallet unit value must be configurable because exposure is monetary.

### M4 — CSV import
Support CSV import with explicit mapping/preview before commit. First supported import format should cover movement date, counterparty, pallet type, direction, quantity, document type, document number, voucher number. Record every import in `import_batches`; invalid rows must never silently disappear.

### M5 — Reconciliation engine v1
Implement deterministic rules, not AI. Reconcile outbound/inbound movements and vouchers by organization, counterparty and pallet type. Surface unmatched quantities and data-quality issues. Do not automatically create legal claims; label outputs as operational reconciliation findings.

### M6 — Recovery cases
Users can create a recovery case from a finding or voucher. Case detail page must show counterparty, pallet type, claimed/recovered/outstanding quantity, unit-value snapshot, outstanding EUR exposure, due date, priority, status, notes, and chronological events.

### M7 — Recovery events
Allow contact attempt, dispute, scheduled recovery, partial recovery, full recovery, settlement and note. Partial/full recovery updates the case totals transactionally. Never allow recovered quantity to exceed claimed quantity.

### M8 — Pilot reporting
Generate a client-level recovery summary for a selected date range: opening exposure, recovered pallets/value, outstanding exposure, ageing and top counterparties. CSV export first; PDF later.

## Explicit non-goals for MVP
- Route optimization
- GPS tracking
- Digital pallet voucher issuance platform
- EUDR workflow
- PPWR compliance engine
- RENTRI integration
- Billing/Stripe
- AI classification

## Engineering quality
- TypeScript strict mode.
- Prefer Server Components for reads and Server Actions or Route Handlers for mutations where appropriate.
- Avoid client-side data fetching unless interactivity demands it.
- Use database transactions/RPC only when they materially protect consistency.
- Include empty/error/loading states.
- Preserve auditability: operational state changes create `recovery_events`.
- Monetary values stored/handled without floating-point surprises; respect DB numeric values.
- No fabricated production data. Seed data may exist only in an explicit development seed.

## Definition of done for each milestone
1. implementation complete;
2. TypeScript passes;
3. lint passes;
4. tests pass;
5. `next build` passes;
6. real Supabase queries work;
7. auth/RLS boundaries are verified;
8. no relevant console errors;
9. the flow is usable from UI.

## Truthmode
If a feature does not create pilot value, duplicates existing infrastructure, or introduces premature complexity, do not build it. Document the decision and implement the simplest safe alternative.

## First task for Claude Code
Inspect the repository and verify the remote Supabase schema/migration assumptions. Then implement M1 fully. If a DB change is needed for onboarding, explain the threat model, create a migration, apply it only to `rizeeehngwbregoxqksy`, verify RLS, run advisors, lint, typecheck, tests and build. Then continue automatically into M2 unless blocked by credentials or external approval.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Current state

Milestones M1–M8 (per CLAUDE.md) are implemented on `claude/pallet-recovery-control-o7bssj`.

## Backend
- Dedicated Supabase project, `ACTIVE_HEALTHY`. Project ref: `rizeeehngwbregoxqksy`. Region: `eu-west-3`.
- Migrations (remote, applied via Supabase MCP — mirrored under `supabase/migrations/`):
  - `20260917201815_create_recovery_core_schema`
  - `20260917201847_optimize_indexes_and_rls`
  - `20260917210500_bootstrap_organization_rpc` — SECURITY DEFINER RPC, the
    only path that can write `organizations`/`organization_members`
  - `20260917210530_revoke_anon_bootstrap_organization` — closes a default-
    privilege gap that left `anon` able to execute the RPC above
  - `20260917214500_record_recovery_event_rpc` — SECURITY INVOKER RPC that
    locks a `recovery_cases` row and applies a recovery event (quantity +
    status) and its audit event in one transaction
- Security advisor: clean except the intentional, documented
  `bootstrap_organization` "callable by authenticated" warning. Performance
  advisor: only "unused index" INFO notices (expected — no production
  traffic yet).

## Frontend
Next.js 16 (App Router, Turbopack), React 19, TypeScript strict,
`@supabase/ssr`, Zod. Plain CSS design system in `src/app/globals.css`
(no Tailwind — the repo didn't have it wired up and the CRUD-heavy B2B UI
didn't need it). `npm run typecheck`, `npm run lint`, `npm run test`
(vitest, 72 tests) and `npm run build` all pass as of the last commit.

## What's implemented
- Auth: email/password login + signup (email confirmation via
  `/auth/confirm`), logout, session refresh in `src/proxy.ts` (Next 16
  renamed `middleware.ts` → `proxy.ts`).
- Onboarding: first-organization bootstrap via RPC, gated so a user with no
  membership is always routed to `/onboarding`.
- Dashboard: real KPIs from `recovery_cases` (open pallets/exposure,
  recovered pallets/value, due-soon/overdue case counts), top-exposure
  counterparties, actionable-cases table.
- Counterparties / Pallet types: CRUD with Zod validation, soft
  activate/deactivate (no hard delete — both are FK-referenced elsewhere).
- CSV import (`/import`): upload → column mapping → live validated preview
  → confirm → `import_batches` record + chunked insert into
  `pallet_movements`. Validation logic is pure/shared and re-run
  server-side (never trusts client-computed validity).
- Reconciliation (`/reconciliation`): deterministic engine — balances by
  counterparty × pallet type (OUT/IN/theoretical balance/open voucher
  qty), findings (unbalanced movements, open/due/overdue vouchers, missing
  documentation, duplicate documents). Findings link into a prefilled
  "create recovery case" form.
- Recovery cases (`/recovery-cases`): create (auto reference,
  `unit_value_snapshot` captured from the pallet type's current price),
  list with status filters, detail page with a chronological event
  timeline and an add-event form. Partial/full recovery, over-recovery
  rejection and status transitions are enforced by the
  `record_recovery_event` RPC (transactional, race-safe) with a pure TS
  mirror for instant client-side feedback.
- Report (`/report`): date-ranged exposure report (outstanding as of
  today, recovered-in-period, ageing buckets, per-counterparty
  breakdown) with CSV export (`/report/export`).
- Settings (`/settings`): organization identity + the caller's own role.

## Known limitations / explicit scope cuts (documented, not oversights)
- No member-invite UI: `organization_members` has no client INSERT policy
  by design (see `bootstrap_organization`'s threat-model comment); adding
  teammates isn't in CLAUDE.md's MVP milestones.
- "Opening exposure" in the M8 report is not a historical point-in-time
  balance — the schema has no ledger/snapshot table to reconstruct one
  honestly, so the report shows outstanding-as-of-today instead of
  fabricating a number.
- No automatic/AI priority scoring — `recovery_cases.priority` is a plain
  user-set field, matching CLAUDE.md (which drops the mega-prompt's
  separate "priority engine" milestone) and the "no AI required" note.

## Verification status
- Static verification (typecheck/lint/vitest/build) done after every
  milestone and after the security-review fixes.
- A security-review pass (agent-run + independently re-verified by
  reading the code) found and fixed: CSV/formula-injection in the report
  export, and a missing org-scoped existence check on
  `counterparty_id`/`voucher_id` when creating a recovery case.
- Live browser end-to-end verification (signup → onboarding → dashboard →
  full flow) could **not** be completed inside the sandbox this was built
  in: the session's network egress policy denies direct HTTPS to
  `rizeeehngwbregoxqksy.supabase.co` (confirmed via the agent proxy status
  endpoint — a policy denial, not a bug). Verify with `npm run dev`
  locally or on a deployment (Vercel etc.) where egress isn't restricted.

## Next up (not started)
- M9 in the original mega-prompt (route optimization, GPS, etc.) are
  explicit non-goals per CLAUDE.md.
- Nothing from CLAUDE.md's M1–M8 roadmap remains; further work would be
  pilot feedback-driven (e.g. member invites, PDF export, movement
  correction workflow) rather than a fixed milestone.

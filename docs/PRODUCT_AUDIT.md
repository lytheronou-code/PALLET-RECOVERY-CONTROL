# Product Audit — Premium Recovery Control

Date: 2026-09-18

## Product position

Recovery Control should not become another generic pallet pooling, voucher or WMS platform. Its premium position is a **recovery decision and execution control layer**:

`movements + vouchers → reconciliation → exposure → priority → recovery → recovered value`

The differentiator is operational closure: identify what is missing, quantify the money at risk, decide what to act on and record the physical/economic recovery.

## P0 — Premium core

Implemented or being completed in the current premium pass:

- Recovery Command Center with exposure, recovery rate, overdue exposure, ageing and action center.
- Recovery case lifecycle with transactional events and audit timeline.
- Deterministic reconciliation.
- Voucher/credit register with due dates, residual quantity and direct case creation.
- Voucher↔recovery transactional synchronization.
- Counterparty 360° profile with exposure, cases, vouchers and movements.
- Movement ledger and CSV import traceability.
- Global search across counterparties, cases and vouchers.
- Exposure reporting and CSV export.
- Tenant isolation through RLS plus tenant-scoped foreign keys.
- Responsive premium visual system and operation-focused navigation.

## P1 — Required before broad commercial rollout

These are not cosmetic features. They close real operational gaps and should be driven by pilot data:

1. **Sites / locations**
   - Multiple operational sites per counterparty.
   - Recovery origin/destination, CAP/province and depot association.
   - Required for route grouping and location-level balances.

2. **Documents & photographic evidence**
   - DDT, voucher scan/photo, pickup proof, dispute evidence.
   - Supabase Storage with tenant-scoped policies.
   - Links to case, movement, voucher and recovery event.

3. **Team management & assignment**
   - Invite users, role management, case owner.
   - Work queues by assignee.
   - Admin/operator/viewer separation in UI, not only database.

4. **Recovery planning**
   - Recovery requests grouped by geography/date.
   - Trip/stops, planned vs recovered quantity.
   - Start with deterministic grouping; no route-optimization engine initially.

5. **Bulk voucher import**
   - The manual form is useful for corrections and ad-hoc records, not for high-volume operations.
   - Reuse the existing import-validation architecture.

6. **Movement correction workflow**
   - Never silently overwrite imported history.
   - Correct through reversal/amendment records with reason and audit trail.

7. **Notifications**
   - In-app action center first.
   - Email digests/alerts for approaching deadlines after pilot validation.

## P2 — Useful only after pilot validation

- Read-only client portal.
- ERP/TMS/API integration.
- PWA/mobile recovery workflow and camera capture.
- Backhaul matching and route suggestions.
- Customer SLA / recovery performance scorecards.
- Economic settlement workflow for unrecovered pallet credits.

## Deliberately excluded for now

- AI decisioning.
- Live GPS.
- Full route optimization.
- Voucher marketplace / credit trading.
- QR serialization of every pallet.
- Carbon certificates.
- Billing/subscription administration.

These features would increase complexity and push the product toward mature pooling/TMS competitors before the core recovery economics are validated.

## Premium UX acceptance criteria

A user must understand within 10 seconds:

1. How many pallets are at risk.
2. How many euros are exposed.
3. What requires action today.
4. Which counterparty creates the largest exposure.
5. Whether recovery performance is improving.

A recovery manager must be able to move from anomaly to action in no more than three navigation steps.

## Pilot kill criteria

Do not continue expanding the platform if a real pilot shows that:

- customers already maintain accurate real-time pallet balances with low leakage;
- recovery costs consume most recoverable pallet value;
- ESSEGI cannot obtain the source data needed for reconciliation;
- operators continue using external spreadsheets/WhatsApp because the application adds no faster workflow;
- recovered value cannot be measured reliably.

New modules should be added only when they reduce recovery time, improve evidence, or increase measurable recovered value.


## P0 freeze status

The premium core is now functionally frozen pending real browser E2E and pilot feedback.

Additional safeguards completed after the initial audit:

- voucher correction and cancellation workflow with recovery-aware limits;
- server-enforced voucher/case counterparty and pallet-type consistency;
- one active recovery case per voucher at a time;
- server-side pallet value snapshot on case creation;
- recovery case state writable only through the transactional recovery RPC;
- voucher recovered quantity writable only through the recovery workflow;
- recovery events append-only;
- pallet movements immutable after import;
- authenticated hard delete removed from operational/master history;
- movement ledger, voucher detail and global search added to the premium workspace.

## P1 status update (2026-09-18, second pass)

The freeze above was explicitly overridden by the product owner: continue
real P1 development now rather than wait on browser E2E, since this
sandbox cannot reach the live Supabase project over HTTPS (egress policy)
and so cannot run true browser E2E regardless. Verification for this pass
relied on typecheck/lint/unit tests/build plus direct adversarial SQL
against the real database (18 attacks, all blocked, transaction rolled
back with zero residual rows — see `docs/CURRENT_STATE.md` for the full
list).

Delivered from the P1 list above: **#1 Sites/locations**, **#5 Bulk
voucher import**, **#6 Movement correction workflow**, and the
assignment/"my queue" half of **#3 Team management**. Two real bugs found
during the audit were also fixed: counterparties/movements/vouchers/
recovery-cases had no pagination (fetched unbounded result sets), and
`organization_members` RLS only ever exposed a user's own membership row,
so every organization's member count in Settings read 1.

Still not built, and why: **#2 Documents/evidence** (Storage integration
is its own scope, deferred rather than rushed), **team invites by email**
and **#7 notification digests** (both need Supabase SMTP, explicitly out
of scope for this phase), **#4 recovery planning/trips** (sites now give
it a real foundation but no UI yet). None of these were dropped for lack
of value — see `docs/CURRENT_STATE.md` for the itemized reasoning.

Browser E2E and pilot data confirmation remain the gate before P2.

## Premium V3 status update (2026-09-18)

Two items from this audit are now delivered, on `claude/premium-v3-documents-portal`:

- **P1 #2 Documents & photographic evidence** — delivered. Private
  tenant-isolated Supabase Storage, DDT/voucher-scan/pickup-proof/
  dispute-evidence/settlement-document/other types, linked to
  counterparty/site/movement/voucher/recovery-case/recovery-event,
  context-driven evidence panels (not a generic file manager). See
  `docs/CURRENT_STATE.md` for the full breakdown and adversarial
  verification.
- **P2 "Read-only client portal"** — delivered ahead of the original P2
  ordering, at the product owner's explicit request. Read-only V1: a
  client can see their own counterparty's pallet exposure, vouchers,
  recovery-case progress and shared evidence, and nothing else —
  verified with cross-tenant/cross-client adversarial SQL, not just RLS
  inspection. `client_case_responses` (a lightweight structured dispute
  response) was explicitly left out of this pass per the spec's own
  "if this adds too much scope, don't build it now" guidance.

Still not built from the P1 list: **#3 Team management** (role UI beyond
DB-level admin/operator/viewer, invites still blocked on SMTP), **#4
Recovery planning/trips**, **#7 notification digests** (also blocked on
SMTP). Reasoning unchanged from the prior P1 status update above.

## Premium V4 status update (2026-09-19) — international self-service foundation

The product's positioning changes with this pass: Pallet Recovery Control
is no longer architected as an ESSEGI-specific application anywhere in the
codebase. There is not a single ESSEGI name, assumption, or hardcoded
business rule in the schema, RLS policies, or application code — every
organization (ESSEGI included, as a future pilot on equal footing with any
other tenant) configures its own company profile, locale, currency,
timezone, country, and Client Portal branding through the same
self-service Settings area and onboarding wizard.

Delivered on `claude/premium-v4-international-selfservice` (PR open
toward `main`, not merged): i18n architecture (dictionaries, locale
resolution hierarchy, language switcher, locale-aware formatting),
organization localization (`default_locale`/`default_currency`/
`timezone`), international company/counterparty/site schema, self-service
Organization Settings (Company/Localization/Branding/Client Portal tabs),
white-label Client Portal branding (logo, portal name, brand color with
automatic contrast, support info, "Powered by" attribution architected
for future plan-gating), a guided 6-step onboarding wizard, friendly
(never-raw) database error messages, and verification that the CSV
import/export flows already support IT/EN column names. Full breakdown,
including the one real validation-logic bug this phase's own adversarial
QA found and fixed before it ever shipped to a real user, is in
`docs/CURRENT_STATE.md`.

**Explicitly not delivered in this pass, tracked as the next piece of
work**: translating the remaining ~15-20 operational page bodies (table
headers, inline labels) that still render Italian text regardless of
viewer locale — the architecture and every DB-facing formatted value are
already fully locale-aware, but full "the entire product renders in
English" is not yet literally true end to end. Also not started, as
explicitly scoped out of V4: Stripe/plans/billing, custom domain
provisioning, SMTP-backed Client Portal invitation emails, full
internal-app white-labeling.

## Premium V5 status update (2026-09-19) — team management role UI (P1 #3)

Product thesis for this pass: Pallet Recovery Control evolves from a
pallet-recovery platform toward a pallet-operations platform a paying
tenant can run as its daily workspace, without becoming a generic ERP.
This first V5 slice stays inside that boundary: team/role management is
operational tooling every multi-person tenant needs, not accounting,
HR, a marketing CRM, or anything AI-driven — none of which this pass
touches.

Delivered on `claude/team-management-roles`: a real Settings > Team tab
(previously the `role`/`roles.*` i18n keys and member count existed, but
there was no team UI at all — role changes and removal had no Server
Action, RPC, or RLS write-path of any kind, and `organization_members`
still has, by design, no client-facing INSERT/UPDATE/DELETE RLS policy,
same threat model as the original bootstrap RPC).

Three new admin-gated `SECURITY DEFINER` RPCs, matching every other
`admin_*` RPC's existing shape (org-membership-and-role check as the
first statement, translated `raise exception` per failure case):
`admin_add_organization_member`, `admin_update_organization_member_role`,
`admin_remove_organization_member`. A caller can never target their own
membership row for a role change or removal — a deliberate
simplification that also makes a separate "don't demote/remove the last
admin" check unnecessary, since the caller (always an admin) can never
be the target, so at least one admin always remains after either call
succeeds.

Adding a team member reuses the same "look up an already-registered
account by email" design as the existing
`admin_grant_client_portal_access` (Client Portal invites): real invite
emails to a stranger remain blocked on missing SMTP configuration, same
as every prior pass, but an admin can add anyone who has already signed
up via `/signup` (any organization) to their own team with a chosen role.

Adversarial QA (12 scenarios, raw SQL against `rizeeehngwbregoxqksy`
inside `BEGIN...ROLLBACK`) caught one real bug before it ever shipped:
`admin_update_organization_member_role`'s `RETURNS TABLE (id uuid, ...)`
implicitly declares `id` as a plpgsql variable for the whole function
body, which made its own `UPDATE ... WHERE id = ...` statement ambiguous
between that variable and the table's `id` column — Postgres raised
`42702: column reference "id" is ambiguous` on the very first live role-
change attempt. Fixed with an explicit table alias, re-verified, and all
12 scenarios (operator/viewer/cross-org blocked from every mutation;
nonexistent-email, already-a-member, and invalid-role rejected;
self-role-change and self-removal blocked; legitimate add/promote/remove
all succeed with the removed member's row immediately gone) pass.

Still not built from the P1 list: **#4 Recovery planning/trips**, **#7
notification digests** (blocked on SMTP, unchanged). Real
email-invite-a-stranger-to-your-org flow remains out of scope for the
same SMTP reason as Client Portal invites and notification digests.

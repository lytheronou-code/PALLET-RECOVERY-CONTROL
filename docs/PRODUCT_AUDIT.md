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

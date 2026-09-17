# Current state

- Dedicated Supabase backend exists and is `ACTIVE_HEALTHY`.
- Project ref: `rizeeehngwbregoxqksy`.
- Region: `eu-west-3` (Paris).
- Core schema already exists remotely.
- Remote migrations:
  - `20260917201815_create_recovery_core_schema`
  - `20260917201847_optimize_indexes_and_rls`
- Public tables currently include:
  - `organizations`
  - `organization_members`
  - `counterparties`
  - `pallet_types`
  - `import_batches`
  - `pallet_movements`
  - `vouchers`
  - `recovery_cases`
  - `recovery_events`
- RLS is enabled on exposed tables.
- Supabase Security Advisor returned zero findings after initial hardening.
- Performance advisor issues found during initial setup were addressed before handoff.
- Frontend authentication/onboarding is intentionally incomplete: this is Claude Code milestone M1.

## Important
Do not create a second Supabase backend and do not connect this repository to `lytheron-cloud-vision`.
Before creating new migrations, synchronize the remote schema/migration history locally using the current Supabase CLI workflow.

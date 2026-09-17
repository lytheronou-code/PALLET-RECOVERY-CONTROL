# Supabase backend

This repository uses the dedicated Supabase project:

- Name: `pallet-recovery-control`
- Project ref: `rizeeehngwbregoxqksy`
- URL: `https://rizeeehngwbregoxqksy.supabase.co`

Remote migrations already applied:

- `20260917201815_create_recovery_core_schema`
- `20260917201847_optimize_indexes_and_rls`

## Claude Code workflow

Before creating a new migration, authenticate the Supabase CLI and link only to this project. Inspect CLI help rather than guessing flags, then synchronize the remote schema/migration history locally. Never recreate the current schema blindly.

After database changes:

1. verify the affected queries;
2. verify RLS/authorization boundaries;
3. run Supabase security advisors;
4. run performance advisors;
5. generate fresh TypeScript database types;
6. commit the migration and generated types together.

Never use or link `drkqaedxsftparcoebmu` (`lytheron-cloud-vision`) from this repository.

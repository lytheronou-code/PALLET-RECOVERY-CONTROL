# Pallet Recovery Control

Independent MVP for pallet leakage reconciliation and physical recovery operations.

## Backend
Dedicated Supabase project: `pallet-recovery-control` (`rizeeehngwbregoxqksy`).

## Start with Claude Code
1. Clone this repository.
2. Copy `.env.example` to `.env.local` and provide the Supabase publishable key locally.
3. Run `claude` from the repository root.
4. Tell Claude: `Read CLAUDE.md and execute the First task. Continue milestone by milestone, testing each one.`
5. Install dependencies and pin the resolved versions in `package.json` + lockfile before production commits.

## Deployment validation
Preview deployment and live E2E validation are required before merging PR #1 to `main`.

Never connect this codebase to `lytheron-cloud-vision`.

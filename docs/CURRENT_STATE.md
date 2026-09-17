# Current state

Milestones M1–M8 (per `CLAUDE.md`) are implemented on `claude/pallet-recovery-control-o7bssj` and PR #1 is open against `main`.

## Backend
- Dedicated Supabase project: `pallet-recovery-control` (`rizeeehngwbregoxqksy`), region `eu-west-3`.
- Remote migration history currently applied:
  - `20260917201815_create_recovery_core_schema`
  - `20260917201847_optimize_indexes_and_rls`
  - `20260917204239_bootstrap_organization_rpc`
  - `20260917204307_revoke_anon_bootstrap_organization`
  - `20260917210833_record_recovery_event_rpc`
  - `20260917214250_guard_bootstrap_single_initial_org`
  - `20260917214731_harden_recovery_event_terminal_states`
- The five application-level migrations after the initial schema/RLS baseline are mirrored under `supabase/migrations/` with timestamps matching Supabase migration history.
- The first two schema/RLS migrations predate repository initialization and are still a remote baseline; materializing them into the repository remains a reproducibility task before handing the codebase to another development team.
- `bootstrap_organization` is a `SECURITY DEFINER` RPC intentionally callable only by `authenticated`. It rejects repeat bootstrap attempts by a user who already has an organization membership.
- `record_recovery_event` is `SECURITY INVOKER`, row-locks the recovery case and applies case state + audit event atomically. Terminal cases (`recovered`, `closed_unrecovered`, `cancelled`) accept notes only, and `full_recovery` must consume the full remaining quantity.

## Frontend
Next.js 16 App Router, React 19, TypeScript strict, `@supabase/ssr`, Zod, Vitest and a plain CSS B2B design system.

Implemented:
- email/password auth + confirmation callback + logout;
- organization onboarding;
- application shell and dashboard;
- counterparties and pallet-type CRUD;
- CSV movement import with mapping/preview/server-side validation;
- deterministic reconciliation engine;
- recovery cases and transactional recovery events;
- exposure report and CSV export;
- settings page.

The client configuration uses Vercel env vars when present, with a checked-in fallback to the Supabase URL + publishable key. The fallback contains no service-role credential; the publishable key is the same public credential shipped to browser clients. Never add a service-role key to source control.

## Verification
Claude's development pass reported:
- `npm run typecheck` — pass
- `npm run lint` — pass
- `npm run test` — 72/72 pass before the independent hardening tests were added
- `npm run build` — pass

Independent verification after handoff:
- GitHub/Vercel integration confirmed by real preview deployments from the PR branch.
- Vercel build initially failed because required public Supabase env vars were absent; code was changed to allow public fallback configuration and subsequent Vercel builds pass.
- Supabase transaction QA (rolled back, no persistent QA data):
  - authenticated user sees only its own organization — pass;
  - authenticated user sees only its own recovery case — pass;
  - cross-tenant counterparty insert blocked by RLS — pass;
  - partial recovery updates quantity/status — pass;
  - over-recovery rejected — pass;
  - partial quantity tagged as `full_recovery` rejected — pass;
  - terminal case rejects state-changing events — pass;
  - terminal case accepts note events — pass.
- Additional unit tests were added for the new terminal/full-recovery invariants; final CI/build verification is required on the branch head.
- Security Advisor: one intentional warning only — authenticated users can execute the `SECURITY DEFINER` `bootstrap_organization` RPC. This is required for first-org onboarding and guarded by `auth.uid()`, repeat-membership rejection, fixed `search_path`, and explicit privilege revocation from `anon`/`PUBLIC`.
- Performance Advisor: only unused-index INFO findings, expected before real traffic.

## Deployment
- Vercel project: `pallet-recovery-control`
- Team: `Marcos' projects`
- Git repo: `lytheronou-code/PALLET-RECOVERY-CONTROL`
- Production branch: `main`
- Preview deployment from the PR branch builds successfully.
- Vercel Deployment Protection is enabled on the preview. Unauthenticated external checks are redirected to Vercel login, so browser E2E cannot be completed from the available unauthenticated automation session yet.

## Remaining gate before merge
Do not merge PR #1 until a real browser flow has been exercised on the preview (or equivalent unprotected staging deployment):

`signup → email confirm → onboarding → dashboard → CRUD → CSV import → reconciliation → recovery → report`

No new product features should be added before this gate is cleared.

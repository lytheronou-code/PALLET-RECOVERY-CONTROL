-- Independent review finding: recovery_cases_assignee_profile_fkey had no
-- ON DELETE behavior (defaults to NO ACTION), so deleting/offboarding a
-- user who is still assigned to a recovery case would fail outright,
-- blocking account deletion. Recovery-case history must survive the
-- assignee being removed -- the case itself is never deleted, only the
-- (now-dangling) assignment.
alter table public.recovery_cases
  drop constraint if exists recovery_cases_assignee_profile_fkey;

alter table public.recovery_cases
  add constraint recovery_cases_assignee_profile_fkey
  foreign key (assignee_user_id)
  references public.profiles (id)
  on delete set null;

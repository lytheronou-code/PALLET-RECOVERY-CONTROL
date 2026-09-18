-- recovery_cases.assignee_user_id currently references auth.users(id), which
-- PostgREST cannot embed through (auth.users isn't in the exposed schema),
-- so `select=...,profiles(email)` on recovery_cases has no relationship to
-- walk. profiles.id already has its own FK to auth.users(id) and is kept in
-- sync by the handle_new_user() trigger, so repointing the assignee FK at
-- profiles(id) instead is equivalent in practice (every profiles.id is an
-- auth.users.id) while making the assignee's name/email embeddable.
alter table public.recovery_cases
  drop constraint if exists recovery_cases_assignee_user_id_fkey;

alter table public.recovery_cases
  add constraint recovery_cases_assignee_profile_fkey
  foreign key (assignee_user_id)
  references public.profiles (id);

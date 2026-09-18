-- Same rationale as recovery_cases_assignee_profile_fkey: organization_members.user_id
-- references auth.users(id), which PostgREST cannot embed through, so the "my queue" /
-- team-visibility UI has no relationship path to pull a member's name/email. profiles.id
-- already FKs to auth.users(id) with the same ON DELETE CASCADE and is kept in sync by the
-- handle_new_user() trigger, so repointing at profiles(id) is equivalent while making the
-- embed possible.
alter table public.organization_members
  drop constraint if exists organization_members_user_id_fkey;

alter table public.organization_members
  add constraint organization_members_profile_fkey
  foreign key (user_id)
  references public.profiles (id)
  on delete cascade;

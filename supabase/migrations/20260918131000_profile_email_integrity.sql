-- Independent review finding: self_update_profile lets a user UPDATE their
-- entire profiles row (using/with check only on id = auth.uid()), with no
-- column-level restriction. Since the assignee picker and "my queue" UI
-- both display profiles.email, a user could edit their own row to show a
-- different email than the one Auth actually has for them -- profiles.email
-- is supposed to mirror auth.users.email, not be independently editable.
-- handle_new_user() also only fires on INSERT, so if a user's Auth email
-- ever changes (e.g. via a future "change email" flow), profiles.email
-- would silently go stale.
--
-- Fix: a BEFORE UPDATE guard trigger blocks any change to profiles.email
-- unless the session-local app.allow_profile_email_sync flag is set (same
-- pattern as the other app.allow_* guards in this schema). Only the new
-- AFTER UPDATE OF email ON auth.users trigger sets that flag, so the only
-- way profiles.email can change is via the Auth-sourced sync path.
-- display_name is untouched by the guard and remains freely user-editable.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.email is distinct from old.email
     and coalesce(current_setting('app.allow_profile_email_sync', true), '') <> 'on' then
    raise exception 'profile email is managed by authentication and cannot be edited directly';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_update on public.profiles;
create trigger trg_guard_profile_update
before update on public.profiles
for each row execute function public.guard_profile_update();

-- SECURITY DEFINER (like handle_new_user): it must write to public.profiles
-- from a trigger fired on auth.users, a different schema/table the
-- triggering statement has no direct privilege over. Owned by the same
-- role as the rest of this schema's privileged functions, so it also
-- bypasses profiles' RLS the same way handle_new_user's INSERT does --
-- this function performs no user-supplied logic beyond copying
-- NEW.email, so there is nothing here for a caller to abuse.
create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_profile_email_sync', 'on', true);
  update public.profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

revoke all on function public.sync_profile_email_from_auth() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.sync_profile_email_from_auth();

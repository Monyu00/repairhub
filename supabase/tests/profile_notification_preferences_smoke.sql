begin;

do $$
declare
  preference_default text;
  can_update_preferences boolean;
  cannot_update_role boolean;
begin
  select column_default into preference_default
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'notification_preferences';

  if preference_default is null then
    raise exception 'profiles.notification_preferences is missing';
  end if;

  select has_column_privilege('authenticated', 'public.profiles', 'notification_preferences', 'UPDATE')
  into can_update_preferences;

  if not can_update_preferences then
    raise exception 'authenticated cannot UPDATE profiles.notification_preferences';
  end if;

  select has_column_privilege('authenticated', 'public.profiles', 'user_role', 'UPDATE')
  into cannot_update_role;

  if cannot_update_role then
    raise exception 'authenticated must not UPDATE profiles.user_role';
  end if;
end $$;

rollback;

begin;

do $$
declare
  duplicate_select_count int;
  expected_policy_count int;
begin
  select count(*) into duplicate_select_count
  from (
    select tablename, cmd, roles
    from pg_policies
    where schemaname = 'public'
      and cmd = 'SELECT'
      and roles @> ARRAY['authenticated']::name[]
    group by tablename, cmd, roles
    having count(*) > 1
  ) duplicates;

  if duplicate_select_count > 0 then
    raise exception 'Duplicate authenticated SELECT policies remain: %', duplicate_select_count;
  end if;

  select count(*) into expected_policy_count
  from pg_policies
  where schemaname = 'public'
    and policyname in (
      'Allow admins or authenticated users to read announcements',
      'Allow admins to insert announcements',
      'Allow admins to update announcements',
      'Allow admins to delete announcements',
      'Allow admins to insert buildings',
      'Allow admins to update buildings',
      'Allow admins to delete buildings',
      'Allow admins to insert categories',
      'Allow admins to update categories',
      'Allow admins to delete categories',
      'Allow admins to insert equipment',
      'Allow admins to update equipment',
      'Allow admins to delete equipment',
      'Allow admins to insert spaces',
      'Allow admins to update spaces',
      'Allow admins to delete spaces',
      'Allow technician or admin to insert link',
      'Allow technician or admin to update link',
      'Allow technician or admin to delete link'
    );

  if expected_policy_count <> 19 then
    raise exception 'Expected 19 rewritten policies, found %', expected_policy_count;
  end if;
end $$;

rollback;

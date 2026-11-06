-- Transaction smoke test for the campus map Building migration (#145).
-- Run it against a database where 20261106085351_campus_map_building_codes.sql is applied:
--   psql "$DATABASE_URL" -f supabase/tests/campus_map_building_codes_smoke.sql
-- Everything runs in one transaction and is rolled back.

begin;

create temporary table campus_map_smoke_baseline as
select count(*) as ticket_count from public.tickets;

-- Rebuild the pre-migration legacy shape so the destructive block runs again for real.
do $$
declare
  legacy_acad uuid;
  legacy_libr uuid;
  acad_space uuid;
  ac_02 uuid;
  smoke_category uuid;
begin
  insert into public.buildings (code, name)
  values ('ACAD', '教學大樓'), ('ADMIN', '行政大樓'), ('LIBR', '圖書館');

  select id into legacy_acad from public.buildings where code = 'ACAD';
  select id into legacy_libr from public.buildings where code = 'LIBR';

  insert into public.spaces (name, floor, building_id)
  values ('Smoke 教室 101', 1, legacy_acad)
  returning id into acad_space;

  insert into public.equipment (name, code, space_id)
  values ('冷氣機 AC-02', 'AC-ACAD-101', acad_space)
  returning id into ac_02;

  insert into public.categories (name, sort_order) values ('Smoke 分類', 9999)
  returning id into smoke_category;

  insert into public.tickets (status, category_id, space_id, equipment_id, description, reporter_email)
  values ('pending', smoke_category, acad_space, ac_02, 'Smoke 冷氣機 AC-02 工單', 'campus-map-smoke@example.com');

  insert into public.tickets (status, category_id, building_id, description, reporter_email)
  values ('pending', smoke_category, legacy_libr, 'Smoke 圖書館工單', 'campus-map-smoke@example.com');
end $$;

\ir ../migrations/20261106085351_campus_map_building_codes.sql

do $$
declare
  expected_codes text[] := array[
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H1', 'H2', 'H3', 'H5', 'H6',
    'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  ];
  missing text[];
  leftover text[];
  fallback_id uuid;
  smoke_tickets int;
  repointed int;
  locationless int;
begin
  select id into fallback_id from public.buildings where code = 'OTHER';

  if fallback_id is null then
    raise exception 'The OTHER fallback Building is missing.';
  end if;

  select array_agg(code) into missing
  from unnest(expected_codes) as code
  where not exists (select 1 from public.buildings where buildings.code = code);

  if missing is not null then
    raise exception 'Missing campus Building codes: %', missing;
  end if;

  select array_agg(code) into leftover
  from public.buildings
  where code in ('ACAD', 'ADMIN', 'LIBR', 'H4');

  if leftover is not null then
    raise exception 'Legacy or unused Building codes still exist: %', leftover;
  end if;

  if exists (
    select 1 from public.buildings
    where code = any(expected_codes) and name !~ '[一-龥]'
  ) then
    raise exception 'Campus Building names must be Traditional Chinese.';
  end if;

  if exists (select 1 from public.equipment where code = 'AC-ACAD-101' or name = '冷氣機 AC-02') then
    raise exception '冷氣機 AC-02 still exists after the migration.';
  end if;

  if exists (select 1 from public.spaces where name = 'Smoke 教室 101') then
    raise exception 'The legacy Space still exists after the migration.';
  end if;

  select count(*) into smoke_tickets
  from public.tickets
  where reporter_email = 'campus-map-smoke@example.com';

  if smoke_tickets <> 2 then
    raise exception 'Expected both smoke Tickets to survive, found %.', smoke_tickets;
  end if;

  select count(*) into repointed
  from public.tickets
  where reporter_email = 'campus-map-smoke@example.com'
    and building_id = fallback_id
    and space_id is null
    and equipment_id is null;

  if repointed <> 2 then
    raise exception 'Expected both smoke Tickets to fall back to OTHER, found %.', repointed;
  end if;

  select count(*) into locationless from public.tickets where building_id is null and space_id is null;

  if locationless > 0 then
    raise exception 'Tickets lost their location: %', locationless;
  end if;

  if (select count(*) from public.tickets) < (select ticket_count from campus_map_smoke_baseline) then
    raise exception 'Re-running the migration removed Tickets.';
  end if;
end $$;

rollback;

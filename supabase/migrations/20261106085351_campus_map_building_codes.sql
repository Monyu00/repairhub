-- Replace the generic ACAD/ADMIN/LIBR Buildings with the campus map Building codes (#145).
-- Existing Tickets stay reachable through the OTHER fallback Building.

do $$
declare
  fallback_id uuid;
  legacy_ids uuid[];
begin
  select id into fallback_id from public.buildings where code = 'OTHER';

  if fallback_id is null then
    insert into public.buildings (code, name) values ('OTHER', '其他') returning id into fallback_id;
  end if;

  select array_agg(id) into legacy_ids
  from public.buildings
  where code in ('ACAD', 'ADMIN', 'LIBR');

  if legacy_ids is not null then
    -- Tickets keep their updated_at: report KPIs derive from updated_at - created_at.
    alter table public.tickets disable trigger trigger_update_tickets_timestamp;

    -- space_id and building_id are ON DELETE RESTRICT, and ADR-0004 still requires
    -- one of them, so move the Tickets to OTHER before the Spaces disappear.
    update public.tickets
       set building_id = fallback_id
     where building_id = any(legacy_ids)
        or space_id in (select id from public.spaces where building_id = any(legacy_ids));

    update public.tickets
       set space_id = null
     where space_id in (select id from public.spaces where building_id = any(legacy_ids));

    update public.tickets
       set equipment_id = null
     where equipment_id in (
             select id from public.equipment
              where space_id in (select id from public.spaces where building_id = any(legacy_ids))
           );

    alter table public.tickets enable trigger trigger_update_tickets_timestamp;

    delete from public.equipment
     where space_id in (select id from public.spaces where building_id = any(legacy_ids));

    delete from public.spaces where building_id = any(legacy_ids);

    delete from public.buildings where id = any(legacy_ids);
  end if;

  insert into public.buildings (code, name, sort_order) values
    ('A', 'A 棟', 1),
    ('B', 'B 棟', 2),
    ('C', 'C 棟', 3),
    ('D', 'D 棟', 4),
    ('E', 'E 棟', 5),
    ('F', 'F 棟', 6),
    ('G', 'G 棟', 7),
    ('H1', 'H1 宿舍', 8),
    ('H2', 'H2 宿舍', 9),
    ('H3', 'H3 宿舍', 10),
    ('H5', 'H5 宿舍', 11),
    ('H6', 'H6 宿舍', 12),
    ('I', 'I 棟', 13),
    ('J', 'J 棟', 14),
    ('K', 'K 棟', 15),
    ('L', 'L 棟', 16),
    ('M', 'M 棟', 17),
    ('N', 'N 棟', 18),
    ('O', 'O 棟', 19),
    ('P', 'P 棟', 20),
    ('Q', 'Q 棟', 21),
    ('R', 'R 棟', 22),
    ('S', 'S 棟', 23),
    ('T', 'T 棟', 24),
    ('U', 'U 棟', 25),
    ('V', 'V 棟', 26),
    ('W', 'W 棟', 27),
    ('X', 'X 棟', 28),
    ('Y', 'Y 棟', 29),
    ('Z', 'Z 棟', 30)
  on conflict (code) do nothing;

  update public.buildings
     set sort_order = 1000
   where code = 'OTHER';
end $$;

begin;

create index if not exists idx_tickets_created_at on public.tickets (created_at desc);
create index if not exists idx_tickets_status_created_at on public.tickets (status, created_at desc);
create index if not exists idx_tickets_assigned_status_created_at
  on public.tickets (assigned_to, status, created_at desc);
create index if not exists idx_tickets_completed_closed_updated_at
  on public.tickets (updated_at)
  where status in ('completed', 'closed');
create index if not exists idx_announcements_author_id on public.announcements (author_id);
create index if not exists idx_equipment_space_id on public.equipment (space_id);
create index if not exists idx_technician_categories_category_id on public.technician_categories (category_id);
create index if not exists idx_ticket_notes_author_id on public.ticket_notes (author_id);
create index if not exists idx_ticket_notes_ticket_id on public.ticket_notes (ticket_id);
create index if not exists idx_ticket_photos_ticket_id on public.ticket_photos (ticket_id);
create index if not exists idx_tickets_building_id on public.tickets (building_id);
create index if not exists idx_tickets_category_id on public.tickets (category_id);
create index if not exists idx_tickets_equipment_id on public.tickets (equipment_id);
create index if not exists idx_tickets_space_id on public.tickets (space_id);

do $$
declare
  missing_count int;
begin
  select count(*) into missing_count
  from (
    values
      ('idx_tickets_created_at'),
      ('idx_tickets_status_created_at'),
      ('idx_tickets_assigned_status_created_at'),
      ('idx_tickets_completed_closed_updated_at'),
      ('idx_announcements_author_id'),
      ('idx_equipment_space_id'),
      ('idx_technician_categories_category_id'),
      ('idx_ticket_notes_author_id'),
      ('idx_ticket_notes_ticket_id'),
      ('idx_ticket_photos_ticket_id'),
      ('idx_tickets_building_id'),
      ('idx_tickets_category_id'),
      ('idx_tickets_equipment_id'),
      ('idx_tickets_space_id')
  ) as expected(indexname)
  where not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and indexname = expected.indexname
  );

  if missing_count > 0 then
    raise exception 'Missing performance indexes: %', missing_count;
  end if;
end $$;

rollback;

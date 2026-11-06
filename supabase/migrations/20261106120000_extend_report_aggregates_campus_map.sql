-- Adds a map-ready per-Building status breakdown to the existing report aggregates.
-- Only the campus map codes are returned (H4 is intentionally absent from the campus map);
-- OTHER stays a legacy bucket inside building_distribution and never becomes an interactive zone.
create or replace function public.report_aggregates(
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with filtered as (
    select
      t.id,
      t.status,
      t.ticket_number,
      t.description,
      t.category_id,
      t.assigned_to,
      t.rating,
      t.rated_at,
      t.created_at,
      t.updated_at,
      coalesce(b.id, sb.id) as building_id,
      coalesce(b.name, sb.name) as building_name,
      coalesce(b.code, sb.code) as building_code,
      c.name as category_name,
      p.display_name as technician_display_name
    from public.tickets t
    left join public.categories c on c.id = t.category_id
    left join public.buildings b on b.id = t.building_id
    left join public.spaces s on s.id = t.space_id
    left join public.buildings sb on sb.id = s.building_id
    left join public.profiles p on p.id = t.assigned_to
    where (p_from is null or t.created_at >= p_from)
      and (p_to is null or t.created_at <= p_to)
  ),
  recent_ticket_summaries as (
    select
      building_id,
      jsonb_agg(jsonb_build_object(
        'id', id,
        'ticket_number', ticket_number,
        'description', description,
        'status', status,
        'created_at', created_at
      ) order by created_at desc) as recent_tickets
    from (
      select
        building_id,
        id,
        ticket_number,
        description,
        status,
        created_at,
        row_number() over (partition by building_id order by created_at desc) as row_number
      from filtered
      where building_id is not null
    ) recent
    where row_number <= 3
    group by building_id
  ),
  kpi as (
    select
      count(*)::int as total_tickets,
      count(*) filter (where status in ('completed', 'closed'))::int as completed_or_closed_count,
      count(*) filter (where status = 'pending')::int as pending_count,
      count(*) filter (where status = 'in_progress')::int as in_progress_count,
      case
        when count(*) > 0 then round(
          (count(*) filter (where status in ('completed', 'closed'))::numeric / count(*)::numeric) * 100,
          1
        )
        else 0
      end as completion_rate,
      coalesce(round(avg(extract(epoch from (updated_at - created_at)) / 86400.0) filter (
        where status in ('completed', 'closed') and updated_at > created_at
      )::numeric, 1), 0) as overall_avg_days_to_resolve
    from filtered
  ),
  monthly as (
    select
      to_char(created_at at time zone 'UTC', 'YYYY-MM') as month,
      count(*)::int as total,
      count(*) filter (where status in ('completed', 'closed'))::int as completed,
      count(*) filter (where status in ('pending', 'in_progress'))::int as pending_or_progress,
      coalesce(round(avg(extract(epoch from (updated_at - created_at)) / 3600.0) filter (
        where status in ('completed', 'closed') and updated_at > created_at
      )::numeric, 1), 0) as avg_hours,
      count(*) filter (
        where status in ('completed', 'closed') and updated_at > created_at
      )::int as completed_count
    from filtered
    group by 1
  ),
  building_distribution as (
    select
      coalesce(building_id::text, 'unknown') as building_id,
      coalesce(building_name, '未指定建築') as building_name,
      coalesce(building_code, 'N/A') as building_code,
      count(*)::int as count
    from filtered
    group by 1, 2, 3
  ),
  campus_map_codes as (
    select unnest(array[
      'A', 'B', 'C', 'D', 'E', 'F', 'G',
      'H1', 'H2', 'H3', 'H5', 'H6',
      'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
    ]) as code
  ),
  campus_buildings as (
    select
      b.id::text as building_id,
      b.code as building_code,
      b.name as building_name,
      count(f.id) filter (where f.status = 'pending')::int as pending_count,
      count(f.id) filter (where f.status = 'in_progress')::int as in_progress_count,
      count(f.id) filter (where f.status = 'completed')::int as completed_count,
      count(f.id) filter (where f.status = 'closed')::int as closed_count,
      count(f.id) filter (where f.status = 'cancelled')::int as cancelled_count,
      count(f.id)::int as total_count,
      coalesce(recent_ticket_summaries.recent_tickets, '[]'::jsonb) as recent_tickets
    from campus_map_codes mc
    join public.buildings b on b.code = mc.code
    left join filtered f on f.building_id = b.id
    left join recent_ticket_summaries on recent_ticket_summaries.building_id = b.id
    group by b.id, b.code, b.name, recent_ticket_summaries.recent_tickets
  ),
  category_distribution as (
    select
      coalesce(category_id::text, 'unknown') as category_id,
      coalesce(category_name, '未分類') as category_name,
      count(*)::int as count
    from filtered
    group by 1, 2
  ),
  technician_performance as (
    select
      assigned_to::text as technician_id,
      coalesce(technician_display_name, '未知技師') as display_name,
      count(*) filter (where status in ('completed', 'closed'))::int as completed_count,
      count(*) filter (where status = 'in_progress')::int as in_progress_count,
      coalesce(round(avg(extract(epoch from (updated_at - created_at)) / 86400.0) filter (
        where status in ('completed', 'closed') and updated_at > created_at
      )::numeric, 1), 0) as avg_days_to_resolve
    from filtered
    where assigned_to is not null
    group by 1, 2
  ),
  satisfaction as (
    select
      coalesce(round(avg(rating) filter (where rating between 1 and 5)::numeric, 1), 0) as avg_rating,
      count(*) filter (where rating between 1 and 5)::int as total_rated,
      count(*) filter (where status = 'closed')::int as total_closed,
      case
        when count(*) filter (where status = 'closed') > 0 then round(
          (count(*) filter (where rating between 1 and 5)::numeric
            / count(*) filter (where status = 'closed')::numeric) * 100,
          1
        )
        else 0
      end as response_rate
    from filtered
  ),
  satisfaction_distribution as (
    select
      star,
      count(rating) filter (where rating = star)::int as count
    from generate_series(1, 5) as star
    left join filtered on true
    group by star
  ),
  satisfaction_monthly as (
    select
      to_char(coalesce(rated_at, created_at) at time zone 'UTC', 'YYYY-MM') as month,
      round(avg(rating)::numeric, 1) as avg_rating,
      count(*)::int as count
    from filtered
    where rating between 1 and 5
    group by 1
  ),
  technician_rankings as (
    select
      assigned_to::text as technician_id,
      coalesce(technician_display_name, '技師 (' || left(assigned_to::text, 8) || ')') as display_name,
      coalesce(round(avg(rating) filter (where rating between 1 and 5)::numeric, 1), 0) as avg_rating,
      count(*) filter (where rating between 1 and 5)::int as rated_count,
      count(*) filter (where status in ('completed', 'closed'))::int as completed_count
    from filtered
    where assigned_to is not null
    group by 1, 2
    having count(*) filter (where status in ('completed', 'closed')) > 0
      or count(*) filter (where rating between 1 and 5) > 0
  )
  select jsonb_build_object(
    'kpi', (select to_jsonb(kpi) from kpi),
    'monthly_trends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', month,
        'total', total,
        'completed', completed,
        'pending_or_progress', pending_or_progress
      ) order by month)
      from monthly
    ), '[]'::jsonb),
    'resolution_trends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'month', month,
        'avg_hours', avg_hours,
        'avg_days', round(avg_hours / 24.0, 1),
        'completed_count', completed_count
      ) order by month)
      from monthly
    ), '[]'::jsonb),
    'building_distribution', coalesce((
      select jsonb_agg(jsonb_build_object(
        'building_id', building_id,
        'building_name', building_name,
        'building_code', building_code,
        'count', count
      ) order by count desc, building_id)
      from building_distribution
    ), '[]'::jsonb),
    'campus_buildings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'building_id', building_id,
        'building_code', building_code,
        'building_name', building_name,
        'status_counts', jsonb_build_object(
          'pending', pending_count,
          'in_progress', in_progress_count,
          'completed', completed_count,
          'closed', closed_count,
          'cancelled', cancelled_count,
          'total', total_count
        ),
        'recent_tickets', recent_tickets
      ) order by building_code)
      from campus_buildings
    ), '[]'::jsonb),
    'category_distribution', coalesce((
      select jsonb_agg(jsonb_build_object(
        'category_id', category_id,
        'category_name', category_name,
        'count', count
      ) order by count desc, category_id)
      from category_distribution
    ), '[]'::jsonb),
    'technician_performance', coalesce((
      select jsonb_agg(jsonb_build_object(
        'technician_id', technician_id,
        'display_name', display_name,
        'completed_count', completed_count,
        'in_progress_count', in_progress_count,
        'avg_days_to_resolve', avg_days_to_resolve
      ) order by completed_count desc, technician_id)
      from technician_performance
    ), '[]'::jsonb),
    'satisfaction', jsonb_build_object(
      'avg_rating', (select avg_rating from satisfaction),
      'total_rated', (select total_rated from satisfaction),
      'total_closed', (select total_closed from satisfaction),
      'response_rate', (select response_rate from satisfaction),
      'distribution', coalesce((
        select jsonb_agg(jsonb_build_object(
          'star', star,
          'count', count
        ) order by star desc)
        from satisfaction_distribution
      ), '[]'::jsonb),
      'monthly_trends', coalesce((
        select jsonb_agg(jsonb_build_object(
          'month', month,
          'avg_rating', avg_rating,
          'count', count
        ) order by month)
        from satisfaction_monthly
      ), '[]'::jsonb),
      'technician_rankings', coalesce((
        select jsonb_agg(jsonb_build_object(
          'technician_id', technician_id,
          'display_name', display_name,
          'avg_rating', avg_rating,
          'rated_count', rated_count,
          'completed_count', completed_count
        ) order by avg_rating desc, rated_count desc, technician_id)
        from technician_rankings
      ), '[]'::jsonb)
    )
  );
$$;

revoke all on function public.report_aggregates(timestamptz, timestamptz) from public;
revoke all on function public.report_aggregates(timestamptz, timestamptz) from anon;
revoke all on function public.report_aggregates(timestamptz, timestamptz) from authenticated;
grant execute on function public.report_aggregates(timestamptz, timestamptz) to service_role;

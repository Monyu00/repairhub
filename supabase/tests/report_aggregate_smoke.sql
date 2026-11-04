begin;

do $$
declare
  result jsonb;
begin
  result := public.report_aggregates(
    '2000-01-01T00:00:00.000Z'::timestamptz,
    '2100-01-01T00:00:00.000Z'::timestamptz
  );

  if not (result ? 'kpi' and result ? 'monthly_trends' and result ? 'satisfaction') then
    raise exception 'report_aggregates returned an incomplete payload: %', result;
  end if;

  if jsonb_typeof(result -> 'monthly_trends') <> 'array'
    or jsonb_typeof(result -> 'building_distribution') <> 'array'
    or jsonb_typeof(result -> 'category_distribution') <> 'array'
    or jsonb_typeof(result -> 'technician_performance') <> 'array'
    or jsonb_typeof(result -> 'satisfaction' -> 'distribution') <> 'array' then
    raise exception 'report_aggregates returned a non-array aggregate section: %', result;
  end if;
end $$;

rollback;

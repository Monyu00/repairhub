CREATE FUNCTION public.reorder_buildings(ordered_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.buildings AS buildings
  SET sort_order = ordered.position::integer
  FROM unnest(ordered_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE buildings.id = ordered.id;
$$;

REVOKE ALL ON FUNCTION public.reorder_buildings(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_buildings(uuid[]) TO authenticated;

CREATE FUNCTION public.reorder_spaces(target_building_id uuid, ordered_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  UPDATE public.spaces AS spaces
  SET sort_order = ordered.position::integer
  FROM unnest(ordered_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE spaces.id = ordered.id
    AND spaces.building_id = target_building_id;
$$;

REVOKE ALL ON FUNCTION public.reorder_spaces(uuid, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_spaces(uuid, uuid[]) TO authenticated;

CREATE FUNCTION public.reorder_categories(ordered_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM unnest(ordered_ids) AS supplied(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.categories
      WHERE categories.id = supplied.id
    )
  ) THEN
    RAISE EXCEPTION 'reorder_categories received an unknown category ID';
  END IF;

  UPDATE public.categories
  SET sort_order = ordered.position::integer
  FROM unnest(ordered_ids) WITH ORDINALITY AS ordered(id, position)
  WHERE public.categories.id = ordered.id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_categories(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_categories(uuid[]) TO authenticated;

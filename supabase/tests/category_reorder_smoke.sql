BEGIN;

DO $category_reorder_smoke$
DECLARE
  first_id UUID := gen_random_uuid();
  second_id UUID := gen_random_uuid();
  third_id UUID := gen_random_uuid();
  unknown_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.categories (id, name, sort_order)
  VALUES
    (first_id, 'Category Reorder Smoke A', 5),
    (second_id, 'Category Reorder Smoke B', 10),
    (third_id, 'Category Reorder Smoke C', 20);

  PERFORM public.reorder_categories(ARRAY[first_id, third_id]);

  IF (SELECT sort_order FROM public.categories WHERE id = first_id) <> 1 THEN
    RAISE EXCEPTION 'Expected first Category to receive sort_order 1.';
  END IF;

  IF (SELECT sort_order FROM public.categories WHERE id = third_id) <> 2 THEN
    RAISE EXCEPTION 'Expected third Category to receive sort_order 2.';
  END IF;

  IF (SELECT sort_order FROM public.categories WHERE id = second_id) <> 10 THEN
    RAISE EXCEPTION 'Expected omitted Category order to remain unchanged.';
  END IF;

  BEGIN
    PERFORM public.reorder_categories(ARRAY[second_id, unknown_id]);
    RAISE EXCEPTION 'Expected an unknown Category ID to fail the whole reorder.';
  EXCEPTION
    WHEN others THEN
      IF lower(SQLERRM) NOT LIKE '%unknown category id%' THEN
        RAISE EXCEPTION 'Unexpected reorder error: %', SQLERRM;
      END IF;
  END;

  IF (SELECT sort_order FROM public.categories WHERE id = second_id) <> 10 THEN
    RAISE EXCEPTION 'Expected no partial update after an unknown-ID failure.';
  END IF;
END
$category_reorder_smoke$;

ROLLBACK;

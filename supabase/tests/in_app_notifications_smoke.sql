BEGIN;

DO $$
DECLARE
  building_id UUID := gen_random_uuid();
  category_id UUID := gen_random_uuid();
  space_id UUID := gen_random_uuid();
  first_ticket_id UUID := gen_random_uuid();
  failing_ticket_id UUID := gen_random_uuid();
  active_technician_id UUID := gen_random_uuid();
  disabled_technician_id UUID := gen_random_uuid();
  unsubscribed_technician_id UUID := gen_random_uuid();
  notification_count INTEGER;
BEGIN
  INSERT INTO public.buildings (id, name, code)
  VALUES (building_id, 'In App Notification Building', 'IAN-' || left(building_id::text, 8));

  INSERT INTO public.categories (id, name, sort_order)
  VALUES (category_id, 'In App Notification Category', 9994);

  INSERT INTO public.spaces (id, name, floor, building_id)
  VALUES (space_id, 'In App Notification Space', 1, building_id);

  INSERT INTO auth.users (id, email)
  VALUES
    (active_technician_id, 'in-app-active@example.com'),
    (disabled_technician_id, 'in-app-disabled@example.com'),
    (unsubscribed_technician_id, 'in-app-unsubscribed@example.com');

  UPDATE public.profiles
  SET user_role = 'technician'::public.user_role
  WHERE id IN (active_technician_id, disabled_technician_id, unsubscribed_technician_id);

  UPDATE public.profiles
  SET notification_preferences = '{"new_ticket": false}'::jsonb
  WHERE id = disabled_technician_id;

  INSERT INTO public.technician_categories (technician_id, category_id)
  VALUES
    (active_technician_id, category_id),
    (disabled_technician_id, category_id),
    (unsubscribed_technician_id, category_id);

  INSERT INTO public.tickets (
    id,
    status,
    category_id,
    space_id,
    description,
    reporter_email,
    reporter_phone
  )
  VALUES
    (
      first_ticket_id,
      'pending',
      category_id,
      space_id,
      'In-app notification smoke fixture',
      'reporter@example.com',
      '0912345678'
    ),
    (
      failing_ticket_id,
      'pending',
      category_id,
      space_id,
      'In-app notification failure fixture',
      'reporter@example.com',
      '0912345678'
    );

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = first_ticket_id;

  SELECT count(*) INTO notification_count
  FROM public.notifications
  WHERE ticket_id = first_ticket_id;

  IF notification_count <> 1 THEN
    RAISE EXCEPTION 'Expected one new-ticket notification, found %.', notification_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE ticket_id = first_ticket_id
      AND recipient_id <> active_technician_id
  ) THEN
    RAISE EXCEPTION 'A disabled or unsubscribed technician must not receive an in-app notification.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND (cmd <> 'SELECT' OR roles::text NOT LIKE '%authenticated%' OR position('recipient_id' in qual) = 0)
  ) THEN
    RAISE EXCEPTION 'Notifications must have one recipient-scoped authenticated SELECT policy.';
  END IF;

  CREATE FUNCTION public.block_in_app_notification_smoke()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $smoke$
  BEGIN
    RAISE EXCEPTION 'Simulated in-app notification failure.';
  END;
  $smoke$;

  CREATE TRIGGER block_in_app_notification_smoke
    BEFORE INSERT ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.block_in_app_notification_smoke();

  UPDATE public.tickets
  SET notification_ready_at = now()
  WHERE id = failing_ticket_id;

  IF EXISTS (
    SELECT 1
    FROM public.notifications
    WHERE ticket_id = failing_ticket_id
  ) THEN
    RAISE EXCEPTION 'A failed in-app notification insert must not remain.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tickets
    WHERE id = failing_ticket_id
      AND notification_ready_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'A failed in-app notification must not block the ticket write.';
  END IF;
END
$$;

ROLLBACK;

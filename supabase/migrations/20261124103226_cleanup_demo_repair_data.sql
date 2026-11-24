-- Keep only the fallback building and clear demo/location/equipment/ticket rows.
-- Ticket-related notes, photos, in-app notifications, and notification logs
-- are removed by the existing ON DELETE CASCADE foreign keys.
-- shortcut: unconditional delete; migration runners will not reapply it, but do not run it by hand after real tickets exist.
-- Storage objects are not touched here because a DB migration cannot reliably remove files.

INSERT INTO public.buildings (name, code, sort_order)
VALUES ('其他', 'OTHER', 0)
ON CONFLICT (code) DO NOTHING;

DELETE FROM public.tickets;
DELETE FROM public.equipment;
DELETE FROM public.spaces;
DELETE FROM public.buildings
WHERE code <> 'OTHER';

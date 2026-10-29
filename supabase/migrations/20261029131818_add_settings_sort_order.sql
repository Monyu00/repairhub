ALTER TABLE public.buildings
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.spaces
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

WITH ordered_buildings AS (
  SELECT id, row_number() OVER (ORDER BY name) AS position
  FROM public.buildings
)
UPDATE public.buildings AS buildings
SET sort_order = ordered_buildings.position
FROM ordered_buildings
WHERE buildings.id = ordered_buildings.id;

WITH ordered_spaces AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY building_id ORDER BY floor, name) AS position
  FROM public.spaces
)
UPDATE public.spaces AS spaces
SET sort_order = ordered_spaces.position
FROM ordered_spaces
WHERE spaces.id = ordered_spaces.id;

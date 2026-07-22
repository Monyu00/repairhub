-- Seed data for campus buildings, spaces, and repair categories

-- 1. Insert Buildings
INSERT INTO public.buildings (name, code) VALUES
('行政大樓', 'ADMIN'),
('教學大樓', 'ACAD'),
('圖書館', 'LIBR')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Spaces
-- We use subqueries to fetch building IDs based on their codes.
INSERT INTO public.spaces (name, floor, building_id) VALUES
('校長室', 3, (SELECT id FROM public.buildings WHERE code = 'ADMIN')),
('教務處', 1, (SELECT id FROM public.buildings WHERE code = 'ADMIN')),
('一般教室 101', 1, (SELECT id FROM public.buildings WHERE code = 'ACAD')),
('一般教室 202', 2, (SELECT id FROM public.buildings WHERE code = 'ACAD')),
('電腦教室 301', 3, (SELECT id FROM public.buildings WHERE code = 'ACAD')),
('圖書閱覽室', 1, (SELECT id FROM public.buildings WHERE code = 'LIBR')),
('自習室 A', 2, (SELECT id FROM public.buildings WHERE code = 'LIBR'))
ON CONFLICT (building_id, name, floor) DO NOTHING;

-- 3. Insert Categories
INSERT INTO public.categories (name, sort_order) VALUES
('水電', 1),
('電器', 2),
('空調', 3),
('門窗', 4),
('網路', 5),
('清潔', 6),
('土木', 7),
('其他', 8)
ON CONFLICT (name) DO NOTHING;

-- 4. Insert Equipment
INSERT INTO public.equipment (name, code, space_id, purchase_date, warranty_expiry) VALUES
('冷氣機 AC-01', 'AC-ADMIN-P', (SELECT id FROM public.spaces WHERE name = '校長室' AND building_id = (SELECT id FROM public.buildings WHERE code = 'ADMIN')), '2024-01-15', '2027-01-15'),
('冷氣機 AC-02', 'AC-ACAD-101', (SELECT id FROM public.spaces WHERE name = '一般教室 101' AND building_id = (SELECT id FROM public.buildings WHERE code = 'ACAD')), '2024-03-20', '2027-03-20'),
('冷氣機 AC-03', 'AC-ACAD-202', (SELECT id FROM public.spaces WHERE name = '一般教室 202' AND building_id = (SELECT id FROM public.buildings WHERE code = 'ACAD')), '2024-03-20', '2027-03-20'),
('冷氣機 AC-04', 'AC-LIBR-READ', (SELECT id FROM public.spaces WHERE name = '圖書閱覽室' AND building_id = (SELECT id FROM public.buildings WHERE code = 'LIBR')), '2023-06-10', '2026-06-10'),
('投影機 PROJ-01', 'PROJ-ACAD-101', (SELECT id FROM public.spaces WHERE name = '一般教室 101' AND building_id = (SELECT id FROM public.buildings WHERE code = 'ACAD')), '2024-05-12', '2026-05-12'),
('投影機 PROJ-02', 'PROJ-ACAD-301', (SELECT id FROM public.spaces WHERE name = '電腦教室 301' AND building_id = (SELECT id FROM public.buildings WHERE code = 'ACAD')), '2024-05-12', '2026-05-12')
ON CONFLICT (code) DO NOTHING;


-- Migration to seed rich historical tickets for reports and statistics dashboard
DO $$
DECLARE
  tech_id UUID := '5c40c89b-9c9a-4140-844e-7cbe066fc67a';
  admin_id UUID := 'f6b1675d-3d6a-41d4-a2fd-91baf4d7cd8a';
  
  -- Spaces
  space_admin_1 UUID;
  space_admin_2 UUID;
  space_acad_101 UUID;
  space_acad_202 UUID;
  space_acad_301 UUID;
  space_libr_read UUID;
  space_libr_self UUID;

  -- Categories
  cat_water UUID;
  cat_elec UUID;
  cat_ac UUID;
  cat_door UUID;
  cat_net UUID;
  cat_clean UUID;
  cat_civil UUID;
  cat_other UUID;
BEGIN
  -- Get Space IDs
  SELECT id INTO space_admin_1 FROM public.spaces WHERE name = '校長室' LIMIT 1;
  SELECT id INTO space_admin_2 FROM public.spaces WHERE name = '教務處' LIMIT 1;
  SELECT id INTO space_acad_101 FROM public.spaces WHERE name = '一般教室 101' LIMIT 1;
  SELECT id INTO space_acad_202 FROM public.spaces WHERE name = '一般教室 202' LIMIT 1;
  SELECT id INTO space_acad_301 FROM public.spaces WHERE name = '電腦教室 301' LIMIT 1;
  SELECT id INTO space_libr_read FROM public.spaces WHERE name = '圖書閱覽室' LIMIT 1;
  SELECT id INTO space_libr_self FROM public.spaces WHERE name = '自習室 A' LIMIT 1;

  -- Get Category IDs
  SELECT id INTO cat_water FROM public.categories WHERE name = '水電' LIMIT 1;
  SELECT id INTO cat_elec FROM public.categories WHERE name = '電器' LIMIT 1;
  SELECT id INTO cat_ac FROM public.categories WHERE name = '空調' LIMIT 1;
  SELECT id INTO cat_door FROM public.categories WHERE name = '門窗' LIMIT 1;
  SELECT id INTO cat_net FROM public.categories WHERE name = '網路' LIMIT 1;
  SELECT id INTO cat_clean FROM public.categories WHERE name = '清潔' LIMIT 1;
  SELECT id INTO cat_civil FROM public.categories WHERE name = '土木' LIMIT 1;
  SELECT id INTO cat_other FROM public.categories WHERE name = '其他' LIMIT 1;

  -- Insert Tickets with diverse timestamps (over past months up to Aug 2026)
  INSERT INTO public.tickets (
    status, category_id, space_id, description, reporter_email, reporter_phone, assigned_to, created_at, updated_at
  ) VALUES
    -- 2026-03
    ('closed', cat_water, space_admin_1, '洗手台水管微漏水', 'user1@campus.edu.tw', '0912345671', tech_id, '2026-03-05 09:15:00+00', '2026-03-06 14:30:00+00'),
    ('closed', cat_ac, space_acad_101, '冷氣出風口異音', 'user2@campus.edu.tw', '0912345672', tech_id, '2026-03-12 10:20:00+00', '2026-03-14 16:00:00+00'),
    ('closed', cat_net, space_libr_read, '無線網路連線中斷', 'user3@campus.edu.tw', '0912345673', admin_id, '2026-03-18 11:00:00+00', '2026-03-18 17:30:00+00'),
    ('closed', cat_elec, space_acad_301, '投影機無法開機', 'user4@campus.edu.tw', '0912345674', tech_id, '2026-03-25 08:30:00+00', '2026-03-27 10:00:00+00'),

    -- 2026-04
    ('closed', cat_door, space_admin_2, '辦公室大門喇叭鎖卡住', 'staff1@campus.edu.tw', '0922345671', tech_id, '2026-04-03 09:00:00+00', '2026-04-04 11:30:00+00'),
    ('closed', cat_water, space_acad_202, '洗手間馬桶沖水按鈕故障', 'user5@campus.edu.tw', '0922345672', tech_id, '2026-04-10 14:00:00+00', '2026-04-11 16:00:00+00'),
    ('closed', cat_clean, space_libr_self, '走廊地面有大片水漬需清理', 'user6@campus.edu.tw', '0922345673', admin_id, '2026-04-15 13:00:00+00', '2026-04-15 15:30:00+00'),
    ('closed', cat_ac, space_acad_301, '機房空調溫度過高', 'staff2@campus.edu.tw', '0922345674', tech_id, '2026-04-22 10:45:00+00', '2026-04-23 12:00:00+00'),
    ('cancelled', cat_other, space_admin_1, '誤報：會議室白板筆沒水', 'user7@campus.edu.tw', '0922345675', NULL, '2026-04-28 16:00:00+00', '2026-04-28 16:30:00+00'),

    -- 2026-05
    ('closed', cat_net, space_acad_101, '教師講桌網路孔無訊號', 'teacher1@campus.edu.tw', '0933345671', admin_id, '2026-05-02 08:50:00+00', '2026-05-02 11:00:00+00'),
    ('closed', cat_elec, space_libr_read, '閱讀區吸頂燈管閃爍', 'user8@campus.edu.tw', '0933345672', tech_id, '2026-05-08 15:20:00+00', '2026-05-09 10:00:00+00'),
    ('closed', cat_civil, space_acad_202, '窗台壁癌滲水', 'staff3@campus.edu.tw', '0933345673', tech_id, '2026-05-14 09:30:00+00', '2026-05-18 17:00:00+00'),
    ('closed', cat_ac, space_libr_self, '自習室冷氣不冷', 'student1@campus.edu.tw', '0933345674', tech_id, '2026-05-20 14:10:00+00', '2026-05-22 09:30:00+00'),
    ('closed', cat_water, space_admin_2, '飲水機不出熱水', 'staff4@campus.edu.tw', '0933345675', tech_id, '2026-05-27 11:00:00+00', '2026-05-28 15:00:00+00'),

    -- 2026-06
    ('closed', cat_elec, space_acad_301, '電腦總電源插座接觸不良', 'teacher2@campus.edu.tw', '0944345671', tech_id, '2026-06-03 10:00:00+00', '2026-06-04 16:20:00+00'),
    ('closed', cat_door, space_libr_read, '圖書館側門門鉸鏈鬆脫', 'user9@campus.edu.tw', '0944345672', tech_id, '2026-06-11 13:40:00+00', '2026-06-12 11:00:00+00'),
    ('closed', cat_ac, space_acad_101, '冷氣濾網需清洗保養', 'staff5@campus.edu.tw', '0944345673', tech_id, '2026-06-17 09:00:00+00', '2026-06-18 14:00:00+00'),
    ('closed', cat_net, space_admin_1, '行政區交換器燈號異常', 'admin@campus.edu.tw', '0944345674', admin_id, '2026-06-22 15:00:00+00', '2026-06-23 09:30:00+00'),
    ('closed', cat_clean, space_acad_202, '黑板粉筆灰過多需深層清理', 'teacher3@campus.edu.tw', '0944345675', tech_id, '2026-06-28 17:00:00+00', '2026-06-29 09:00:00+00'),

    -- 2026-07
    ('closed', cat_water, space_libr_self, '洗手間洗手乳擠壓器損壞', 'student2@campus.edu.tw', '0955345671', tech_id, '2026-07-04 11:30:00+00', '2026-07-05 10:00:00+00'),
    ('closed', cat_ac, space_admin_2, '中央空調送風偏弱', 'staff6@campus.edu.tw', '0955345672', tech_id, '2026-07-10 14:00:00+00', '2026-07-12 16:30:00+00'),
    ('completed', cat_elec, space_acad_101, '講桌麥克風雜音嚴重', 'teacher4@campus.edu.tw', '0955345673', tech_id, '2026-07-18 09:15:00+00', '2026-07-19 15:00:00+00'),
    ('completed', cat_net, space_libr_read, '電子檢索區網路斷線', 'student3@campus.edu.tw', '0955345674', admin_id, '2026-07-25 16:00:00+00', '2026-07-26 11:20:00+00'),
    ('closed', cat_civil, space_admin_1, '貴賓室地磚鬆動', 'staff7@campus.edu.tw', '0955345675', tech_id, '2026-07-29 10:30:00+00', '2026-08-02 14:00:00+00'),

    -- 2026-08 (Current month)
    ('in_progress', cat_ac, space_acad_202, '冷氣吹出溫風不製冷', 'teacher5@campus.edu.tw', '0966345671', tech_id, '2026-08-02 08:30:00+00', '2026-08-05 10:00:00+00'),
    ('completed', cat_water, space_admin_1, '茶水間水龍頭滴水', 'staff8@campus.edu.tw', '0966345672', tech_id, '2026-08-06 09:00:00+00', '2026-08-07 11:30:00+00'),
    ('in_progress', cat_net, space_acad_301, '電腦教室第 3 排網路不通', 'teacher6@campus.edu.tw', '0966345673', admin_id, '2026-08-08 13:10:00+00', '2026-08-09 14:00:00+00'),
    ('pending', cat_door, space_libr_self, '自習室門弓器力道過大關門聲吵', 'student4@campus.edu.tw', '0966345674', NULL, '2026-08-11 15:40:00+00', '2026-08-11 15:40:00+00'),
    ('pending', cat_elec, space_admin_2, '印表機專用迴路跳電', 'staff9@campus.edu.tw', '0966345675', NULL, '2026-08-13 10:20:00+00', '2026-08-13 10:20:00+00');
END $$;

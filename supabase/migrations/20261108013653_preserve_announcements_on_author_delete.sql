-- 公告是組織內容：作者帳號被刪除時保留公告，只把 author_id 設為 null，
-- 由前端既有的 fallback（「系統人員」）接手顯示。
alter table public.announcements alter column author_id drop not null;

alter table public.announcements drop constraint announcements_author_id_fkey;

alter table public.announcements
  add constraint announcements_author_id_fkey
  foreign key (author_id) references public.profiles(id) on delete set null;

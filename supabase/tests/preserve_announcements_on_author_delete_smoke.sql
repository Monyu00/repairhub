begin;

do $$
declare
  author uuid := gen_random_uuid();
  announcement uuid;
  remaining integer;
begin
  insert into auth.users (id, email) values (author, 'announcement-author-smoke@example.test');
  update public.profiles set user_role = 'admin' where id = author;

  insert into public.announcements (title, body, audience, author_id)
  values ('smoke', 'smoke', 'internal', author)
  returning id into announcement;

  delete from auth.users where id = author;

  select count(*) into remaining
  from public.announcements
  where id = announcement and author_id is null;

  if remaining <> 1 then
    raise exception 'announcement did not survive author deletion (author_id should be null)';
  end if;
end $$;

rollback;

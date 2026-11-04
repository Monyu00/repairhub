drop policy "Allow admins to manage announcements" on public.announcements;

drop policy "Allow authenticated users to read valid announcements" on public.announcements;
create policy "Allow admins or authenticated users to read announcements"
  on public.announcements
  for select
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
    or (
      published_at <= now()
      and (expires_at is null or expires_at > now())
    )
  );

create policy "Allow admins to insert announcements"
  on public.announcements
  for insert
  to authenticated
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );

create policy "Allow admins to update announcements"
  on public.announcements
  for update
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  )
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );

create policy "Allow admins to delete announcements"
  on public.announcements
  for delete
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );

drop policy "Allow admins to manage buildings" on public.buildings;
create policy "Allow admins to insert buildings"
  on public.buildings
  for insert
  to authenticated
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow admins to update buildings"
  on public.buildings
  for update
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  )
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow admins to delete buildings"
  on public.buildings
  for delete
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );

drop policy "Allow admins to manage categories" on public.categories;
create policy "Allow admins to insert categories"
  on public.categories
  for insert
  to authenticated
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow admins to update categories"
  on public.categories
  for update
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  )
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow admins to delete categories"
  on public.categories
  for delete
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );

drop policy "Allow admins to manage equipment" on public.equipment;
create policy "Allow admins to insert equipment"
  on public.equipment
  for insert
  to authenticated
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow admins to update equipment"
  on public.equipment
  for update
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  )
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow admins to delete equipment"
  on public.equipment
  for delete
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );

drop policy "Allow admins to manage spaces" on public.spaces;
create policy "Allow admins to insert spaces"
  on public.spaces
  for insert
  to authenticated
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow admins to update spaces"
  on public.spaces
  for update
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  )
  with check (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow admins to delete spaces"
  on public.spaces
  for delete
  to authenticated
  using (
    (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );

drop policy "Allow technician or admin to manage link" on public.technician_categories;
create policy "Allow technician or admin to insert link"
  on public.technician_categories
  for insert
  to authenticated
  with check (
    (select auth.uid()) = technician_id
    or (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow technician or admin to update link"
  on public.technician_categories
  for update
  to authenticated
  using (
    (select auth.uid()) = technician_id
    or (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  )
  with check (
    (select auth.uid()) = technician_id
    or (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );
create policy "Allow technician or admin to delete link"
  on public.technician_categories
  for delete
  to authenticated
  using (
    (select auth.uid()) = technician_id
    or (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );

drop policy "Allow users to update own profile" on public.profiles;
create policy "Allow users to update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy "Allow authenticated users to insert notes" on public.ticket_notes;
create policy "Allow authenticated users to insert notes"
  on public.ticket_notes
  for insert
  to authenticated
  with check ((select auth.uid()) = author_id);

drop policy "Allow admins and assigned technicians to update tickets" on public.tickets;
create policy "Allow admins and assigned technicians to update tickets"
  on public.tickets
  for update
  to authenticated
  using (
    assigned_to = (select auth.uid())
    or (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  )
  with check (
    assigned_to = (select auth.uid())
    or (
      select profiles.user_role
      from public.profiles
      where profiles.id = (select auth.uid())
    ) = 'admin'
  );

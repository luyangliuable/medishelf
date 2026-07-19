alter table public.photo_submissions enable row level security;
alter table public.photo_submission_images enable row level security;

create policy "submissions insert own" on public.photo_submissions
for insert to authenticated with check (created_by = auth.uid());

create policy "submissions select own" on public.photo_submissions
for select to authenticated using (created_by = auth.uid());

create policy "images insert for own submission" on public.photo_submission_images
for insert to authenticated with check (
  exists (select 1 from public.photo_submissions s where s.id = submission_id and s.created_by = auth.uid())
);

create policy "images select for own submission" on public.photo_submission_images
for select to authenticated using (
  exists (select 1 from public.photo_submissions s where s.id = submission_id and s.created_by = auth.uid())
);

create policy "images delete for own submission" on public.photo_submission_images
for delete to authenticated using (
  exists (select 1 from public.photo_submissions s where s.id = submission_id and s.created_by = auth.uid())
);

create policy "submissions update own" on public.photo_submissions
for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.photo_submissions to authenticated;
grant usage, select on sequence public.photo_submissions_id_seq to authenticated;
grant select, insert, update, delete on public.photo_submission_images to authenticated;

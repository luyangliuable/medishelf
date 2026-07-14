-- Additive edit-flow policies. No drops.
-- Storage delete is bucket-scoped because storage.objects has no owner_id
-- column and mp-images is an app-scoped bucket. Acceptable for MVP.

create policy "images delete for own submission" on public.photo_submission_images
for delete to authenticated using (
  exists (select 1 from public.photo_submissions s
          where s.id = submission_id and s.created_by = auth.uid())
);

create policy "submissions update own" on public.photo_submissions
for update to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

create policy "mp-images delete authenticated" on storage.objects
for delete to authenticated using (bucket_id = 'mp-images');

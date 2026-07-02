create table if not exists public.photo_submissions (
  id bigserial primary key,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Product upload',
  manufacturer text not null default 'Unknown',
  status text not null default 'in_review',
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photo_submission_images (
  id uuid primary key default gen_random_uuid(),
  submission_id bigint not null references public.photo_submissions(id) on delete cascade,
  storage_path text not null,
  status text not null default 'active',
  size_bytes bigint,
  mime_type text,
  created_at timestamptz not null default now()
);

insert into storage.buckets (id, name, public)
values ('mp-images', 'mp-images', true)
on conflict (id) do update set public = true;

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

create policy "mp-images insert authenticated" on storage.objects
for insert to authenticated with check (bucket_id = 'mp-images');

create policy "mp-images read public" on storage.objects
for select to public using (bucket_id = 'mp-images');

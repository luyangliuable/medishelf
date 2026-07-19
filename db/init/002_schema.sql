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

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

insert into storage.buckets (id, name, public)
values ('mp-images', 'mp-images', true)
on conflict (id) do update set public = true;

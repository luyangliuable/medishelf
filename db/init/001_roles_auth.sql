create extension if not exists pgcrypto;

create schema if not exists auth;
create schema if not exists storage;

do $$ begin
  create role anon;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role authenticated;
exception when duplicate_object then null;
end $$;

do $$ begin
  create role app_user with login password 'app_password';
exception when duplicate_object then null;
end $$;

grant authenticated to app_user;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  encrypted_password text not null,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant usage on schema auth to app_user;
grant select, insert, update, delete on auth.users to app_user;

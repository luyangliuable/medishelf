import { existsSync, readFileSync } from 'fs'
import pg from 'pg'

for (const file of ['.env.local', '.env']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

function connectionOptions(connectionString) {
  const url = new URL(connectionString)
  const ssl = url.searchParams.get('sslmode') === 'require'
  url.searchParams.delete('sslmode')
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n')
  return {
    connectionString: url.toString(),
    ssl: ssl ? { ca, rejectUnauthorized: ca ? true : process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true' } : undefined
  }
}

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required')

const statements = [
  `create table if not exists public.users (id uuid primary key, email text unique not null, encrypted_password text not null, raw_user_meta_data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
  `create table if not exists public.photo_submissions (id bigserial primary key, created_by uuid not null references public.users(id) on delete cascade, name text not null default 'Product upload', manufacturer text not null default 'Unknown', status text not null default 'in_review', reviewed boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now())`,
  `create table if not exists public.photo_submission_images (id uuid primary key, submission_id bigint not null references public.photo_submissions(id) on delete cascade, storage_path text not null, status text not null default 'active', size_bytes bigint, mime_type text, created_at timestamptz not null default now())`
]

const pool = new pg.Pool(connectionOptions(databaseUrl))
try {
  for (const statement of statements) await pool.query(statement)
  console.log('Database schema is ready')
} finally {
  await pool.end()
}

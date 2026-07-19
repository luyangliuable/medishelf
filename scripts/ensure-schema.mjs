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

const requiredRelations = [
  'auth.users',
  'public.photo_submissions',
  'public.photo_submission_images',
  'storage.buckets'
]

const pool = new pg.Pool(connectionOptions(databaseUrl))
try {
  const result = await pool.query(
    `with required(relation) as (select unnest($1::text[]))
     select relation from required where to_regclass(relation) is null`,
    [requiredRelations]
  )
  const missingRelations = result.rows.map(row => row.relation)
  if (missingRelations.length > 0) {
    throw new Error(`Database schema is missing required relations: ${missingRelations.join(', ')}`)
  }
  console.log('Database schema is ready')
} finally {
  await pool.end()
}

import { Pool } from 'pg'
import { databaseConnectionOptions } from '@/lib/database/ssl'
import { requireDatabaseUrl } from '@/lib/server/env'

let schemaReady: Promise<void> | null = null

const requiredRelations = [
  'auth.users',
  'public.photo_submissions',
  'public.photo_submission_images',
  'storage.buckets'
]

async function validateSchema() {
  const pool = new Pool(databaseConnectionOptions(requireDatabaseUrl()))
  try {
    const result = await pool.query<{ relation: string }>(
      `with required(relation) as (select unnest($1::text[]))
       select relation from required where to_regclass(relation) is null`,
      [requiredRelations]
    )
    const missingRelations = result.rows.map(row => row.relation)
    if (missingRelations.length > 0) {
      throw new Error(`Database schema is missing required relations: ${missingRelations.join(', ')}`)
    }
  } finally {
    await pool.end()
  }
}

export async function ensureDatabaseSchema() {
  schemaReady ??= validateSchema().catch(error => {
    schemaReady = null
    throw error
  })
  return schemaReady
}

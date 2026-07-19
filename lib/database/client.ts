import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/lib/database/schema'
import { requireDatabaseUrl } from '@/lib/server/env'

const connectionString = requireDatabaseUrl()

function databaseSslConfig() {
  if (!connectionString.includes('sslmode=require')) return undefined

  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n')
  if (ca) return { ca, rejectUnauthorized: true }

  return {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
  }
}

declare global {
  var medishelfPool: Pool | undefined
}

const pool = globalThis.medishelfPool ?? new Pool({
  connectionString,
  ssl: databaseSslConfig()
})

export const db = drizzle(pool, { schema })

if (process.env.NODE_ENV !== 'production') {
  globalThis.medishelfPool = pool
}

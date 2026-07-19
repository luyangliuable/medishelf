import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/lib/database/schema'
import { requireDatabaseUrl } from '@/lib/server/env'

const connectionString = requireDatabaseUrl()
const usesSsl = connectionString.includes('sslmode=require')

declare global {
  var medishelfPool: Pool | undefined
}

const pool = globalThis.medishelfPool ?? new Pool({
  connectionString,
  ssl: usesSsl ? true : undefined
})

export const db = drizzle(pool, { schema })

if (process.env.NODE_ENV !== 'production') {
  globalThis.medishelfPool = pool
}

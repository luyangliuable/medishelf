import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from '@/lib/database/schema'
import { databaseConnectionOptions } from '@/lib/database/ssl'
import { requireDatabaseUrl } from '@/lib/server/env'

const databaseOptions = databaseConnectionOptions(requireDatabaseUrl())

declare global {
  var medishelfPool: Pool | undefined
}

const pool = globalThis.medishelfPool ?? new Pool(databaseOptions)

export const db = drizzle(pool, { schema })

if (process.env.NODE_ENV !== 'production') {
  globalThis.medishelfPool = pool
}

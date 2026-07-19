import { Pool, type PoolClient, type QueryResultRow } from 'pg'

const connectionString = process.env.DATABASE_URL
  ?? 'postgres://app_user:app_password@localhost:5432/medishelf'

declare global {
  var medishelfPool: Pool | undefined
}

export const pool = globalThis.medishelfPool ?? new Pool({ connectionString })

if (process.env.NODE_ENV !== 'production') {
  globalThis.medishelfPool = pool
}

export function query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
  return pool.query<T>(sql, params)
}

export async function withUserDb<T>(userId: string, work: (client: PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query('begin')
    await client.query('select set_config($1, $2, true)', ['app.current_user_id', userId])
    const result = await work(client)
    await client.query('commit')
    return result
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

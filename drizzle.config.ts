import { existsSync, readFileSync } from 'fs'
import type { Config } from 'drizzle-kit'
import { databaseConnectionOptions } from './lib/database/ssl'

function loadLocalEnv() {
  for (const file of ['.env.local', '.env']) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
    }
  }
}

loadLocalEnv()

const databaseOptions = databaseConnectionOptions(process.env.DATABASE_URL ?? '')

export default {
  schema: './lib/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseOptions.connectionString,
    ssl: databaseOptions.ssl
  }
} satisfies Config

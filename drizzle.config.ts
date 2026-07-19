import { existsSync, readFileSync } from 'fs'
import type { Config } from 'drizzle-kit'

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

function databaseSslConfig() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.includes('sslmode=require')) return undefined

  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n')
  if (ca) return { ca, rejectUnauthorized: true }

  return {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
  }
}

export default {
  schema: './lib/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
    ssl: databaseSslConfig()
  }
} satisfies Config

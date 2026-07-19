const isNextBuild = process.env.NEXT_PHASE === 'phase-production-build'

function buildFallback(name: string) {
  return name === 'DATABASE_URL'
    ? 'postgres://user:password@localhost:5432/build'
    : `missing-${name.toLowerCase()}`
}

export function requireDatabaseUrl() {
  const value = process.env.DATABASE_URL
  if (value) return value
  if (isNextBuild) return buildFallback('DATABASE_URL')
  throw new Error('Missing required environment variable: DATABASE_URL')
}

export function requireAuthSecret() {
  const value = process.env.NEXTAUTH_SECRET ?? process.env.SESSION_SECRET
  if (value) return value
  if (isNextBuild) return buildFallback('NEXTAUTH_SECRET')
  throw new Error('Missing required environment variable: NEXTAUTH_SECRET or SESSION_SECRET')
}

export function configureNextAuthUrl() {
  if (!process.env.NEXTAUTH_URL && process.env.NEXT_PUBLIC_APP_URL) {
    process.env.NEXTAUTH_URL = process.env.NEXT_PUBLIC_APP_URL
  }
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL
  if (isNextBuild) return buildFallback('NEXTAUTH_URL')
  throw new Error('Missing required environment variable: NEXTAUTH_URL or NEXT_PUBLIC_APP_URL')
}

export function validateServerEnv() {
  if (isNextBuild) return
  requireDatabaseUrl()
  requireAuthSecret()
  configureNextAuthUrl()
}

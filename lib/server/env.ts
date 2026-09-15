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

export type LlmProvider = 'openai-compatible' | 'anthropic'

export type LlmConfig = {
  provider: LlmProvider
  baseUrl: string
  apiKey?: string
  model: string
  headers: Record<string, string>
}

/**
 * Reads and validates the server-only LLM endpoint configuration.
 *
 * @returns Provider-neutral LLM configuration.
 */
export function requireLlmConfig(): LlmConfig {
  const provider = process.env.LLM_PROVIDER
  if (provider !== 'openai-compatible' && provider !== 'anthropic') {
    throw new Error('LLM_PROVIDER must be openai-compatible or anthropic')
  }
  const baseUrl = process.env.LLM_BASE_URL
  if (!baseUrl) throw new Error('Missing required environment variable: LLM_BASE_URL')
  new URL(baseUrl)
  const model = process.env.LLM_MODEL
  if (!model) throw new Error('Missing required environment variable: LLM_MODEL')
  const rawHeaders = JSON.parse(process.env.LLM_HEADERS_JSON ?? '{}') as unknown
  if (!rawHeaders || Array.isArray(rawHeaders) || typeof rawHeaders !== 'object') {
    throw new Error('LLM_HEADERS_JSON must be a JSON object')
  }
  const entries = Object.entries(rawHeaders)
  if (entries.some(([, value]) => typeof value !== 'string')) {
    throw new Error('LLM_HEADERS_JSON values must be strings')
  }
  return {
    provider,
    baseUrl,
    apiKey: process.env.LLM_API_KEY || undefined,
    model,
    headers: Object.fromEntries(entries) as Record<string, string>
  }
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

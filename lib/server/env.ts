import { withBasePath } from '@/lib/basePath'

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

export type LlmProvider = 'azure' | 'openai-compatible' | 'anthropic'

export type LlmConfig = {
  provider: LlmProvider
  baseUrl: string
  apiKey?: string
  model: string
  headers: Record<string, string>
  azureUseBearerAuth: boolean
}

/**
 * Reads and validates the server-only LLM endpoint configuration.
 *
 * @returns Provider-neutral LLM configuration.
 */
export function requireLlmConfig(): LlmConfig {
  const provider = process.env.LLM_PROVIDER
  if (provider !== 'azure' && provider !== 'openai-compatible' && provider !== 'anthropic') {
    throw new Error('LLM_PROVIDER must be azure, openai-compatible, or anthropic')
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
    headers: Object.fromEntries(entries) as Record<string, string>,
    azureUseBearerAuth: process.env.LLM_AZURE_USE_BEARER_AUTH === 'true'
  }
}

export type CodeReaderConfig = {
  /** Run the locating agent when a plain scan finds no GS1 lot or expiry. */
  agentEnabled: boolean
  /** Vision model the agent uses to locate codes; defaults to LLM_MODEL. */
  model: string
  maxSteps: number
  /** When decoded and printed values disagree: leave the field empty, or trust the code. */
  conflictPolicy: 'empty' | 'prefer-code'
}

/**
 * Reads the optional code reader settings. Every value has a safe default.
 *
 * @param llm - Main LLM configuration, used for the default model.
 */
export function requireCodeReaderConfig(llm: LlmConfig): CodeReaderConfig {
  const maxSteps = Number(process.env.CODE_AGENT_MAX_STEPS ?? 6)
  if (!Number.isInteger(maxSteps) || maxSteps < 1 || maxSteps > 20) {
    throw new Error('CODE_AGENT_MAX_STEPS must be an integer from 1 to 20')
  }
  const conflictPolicy = process.env.CODE_CONFLICT_POLICY ?? 'empty'
  if (conflictPolicy !== 'empty' && conflictPolicy !== 'prefer-code') {
    throw new Error('CODE_CONFLICT_POLICY must be empty or prefer-code')
  }
  return {
    agentEnabled: process.env.CODE_AGENT_ENABLED !== 'false',
    model: process.env.CODE_LOCATOR_MODEL || llm.model,
    maxSteps,
    conflictPolicy
  }
}

export function configureNextAuthUrl() {
  if (!process.env.NEXTAUTH_URL && process.env.NEXT_PUBLIC_APP_URL) {
    // next-auth treats the path of NEXTAUTH_URL as its own route, so point it at the auth
    // handler rather than at the app root, which may sit under a base path such as /new.
    process.env.NEXTAUTH_URL = `${new URL(process.env.NEXT_PUBLIC_APP_URL).origin}${withBasePath('/api/auth')}`
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

/**
 * @fileoverview Builds a language model for the configured provider protocol.
 */
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAzure } from '@ai-sdk/azure'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type { LanguageModel } from 'ai'
import type { LlmConfig } from '@/lib/server/env'

/**
 * Creates a model adapter for the configured provider protocol.
 *
 * @param config - Validated LLM endpoint configuration.
 * @returns Provider-neutral language model.
 */
export function createLanguageModel(config: LlmConfig): LanguageModel {
  if (config.provider === 'anthropic') {
    return createAnthropic({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      headers: config.headers
    })(config.model)
  }
  if (config.provider === 'azure') {
    return createAzure({
      baseURL: config.baseUrl,
      apiKey: config.azureUseBearerAuth ? 'gateway-authenticated' : config.apiKey,
      headers: config.azureUseBearerAuth && config.apiKey
        ? { ...config.headers, Authorization: `Bearer ${config.apiKey}` }
        : config.headers
    })(config.model)
  }
  return createOpenAICompatible({
    name: 'medishelf-llm',
    baseURL: config.baseUrl,
    apiKey: config.apiKey,
    headers: config.headers
  }).chatModel(config.model)
}

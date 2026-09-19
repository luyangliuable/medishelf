/**
 * @fileoverview Analyzes product images through a configurable LLM provider.
 */
import { createAnthropic } from '@ai-sdk/anthropic'
import { createAzure } from '@ai-sdk/azure'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateObject, type LanguageModel } from 'ai'
import { z } from 'zod'
import { requireLlmConfig, type LlmConfig } from '@/lib/server/env'

const SYSTEM_PROMPT = `You analyze photographs of the same medical product.
Use visible packaging and labels to identify the requested label fields.
Compare every supplied view and prefer the clearest readable evidence.
Never invent, infer, or complete obscured text. Return null when a value cannot be established, is incomplete, conflicts between images, or has an ambiguous date.
For barcode, GTIN, lot, and reference, preserve the printed characters and leading zeroes exactly; do not convert them to numbers or reformat them.
Use YYYY-MM-DD only for an unambiguous full manufacture or expiration date; otherwise return null for that date.
Do not provide medical advice, diagnoses, descriptions, or additional fields.
Return only a JSON object with exactly these fields: "name", "manufacturer", "barcode", "size", "manufacturedOn", "expiresOn", "lot", "reference", "manufacturerAddress", and "manufacturerSite".
Do not wrap the JSON in Markdown or explanatory text.`

const labelText = z.string().trim().min(1).max(500).nullable()
const labelDate = z.string().trim().max(10).nullable().transform(value => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? value
    : null
})

const analysisSchema = z.object({
  name: labelText,
  manufacturer: labelText,
  barcode: labelText,
  size: labelText,
  manufacturedOn: labelDate,
  expiresOn: labelDate,
  lot: labelText,
  reference: labelText,
  manufacturerAddress: labelText,
  manufacturerSite: labelText
}).strict()

export type ProductAnalysis = z.infer<typeof analysisSchema>

const MAX_ANALYSIS_OUTPUT_TOKENS = 4096
const ANALYSIS_TIMEOUT_MS = 120_000

/**
 * Creates a model adapter for the configured provider protocol.
 *
 * @param config - Validated LLM endpoint configuration.
 * @returns Provider-neutral language model.
 */
function createLanguageModel(config: LlmConfig): LanguageModel {
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

/**
 * Converts an uploaded image into a provider-neutral image part.
 *
 * @param file - Validated uploaded image.
 * @returns Image content for the configured provider adapter.
 */
async function toImagePart(file: File) {
  return {
    type: 'file' as const,
    data: Buffer.from(await file.arrayBuffer()),
    mediaType: file.type,
    filename: file.name
  }
}

/**
 * Sends a complete product-photo batch to the configured LLM endpoint.
 *
 * @param files - At least four validated product images.
 * @returns Validated product-label fields.
 */
export async function analyzeProductImages(files: File[]): Promise<ProductAnalysis> {
  if (files.length < 4) throw new Error('Product analysis requires at least four images')
  const config = requireLlmConfig()
  const images = await Promise.all(files.map(toImagePart))
  const { object } = await generateObject({
    model: createLanguageModel(config),
    schema: analysisSchema,
    schemaName: 'product_label',
    schemaDescription: 'The complete label data read from a medical product package.',
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze these views of the same medical product.' },
        ...images
      ]
    }],
    maxOutputTokens: MAX_ANALYSIS_OUTPUT_TOKENS,
    ...(config.provider === 'azure' ? {} : { temperature: 0 }),
    maxRetries: 1,
    abortSignal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS)
  })
  return object
}

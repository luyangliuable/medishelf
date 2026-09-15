/**
 * @fileoverview Analyzes product images through a configurable LLM provider.
 */
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateText, type LanguageModel } from 'ai'
import { z } from 'zod'
import { requireLlmConfig, type LlmConfig } from '@/lib/server/env'

const SYSTEM_PROMPT = `You analyze four photographs of the same medical product.
Use visible packaging and labels to identify only the product name and manufacturer.
Compare all four views and prefer the clearest readable evidence.
Never invent, infer, or complete obscured text. Use "Unknown" when a value cannot be established.
Do not provide medical advice, diagnoses, descriptions, or additional fields.
Return only a JSON object with exactly two string fields: "name" and "manufacturer".
Do not wrap the JSON in Markdown or explanatory text.`

const analysisSchema = z.object({
  name: z.string().trim().min(1).max(200),
  manufacturer: z.string().trim().min(1).max(200)
}).strict()

export type ProductAnalysis = z.infer<typeof analysisSchema>

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
 * Sends exactly four product images to the configured LLM endpoint.
 *
 * @param files - Four validated product images.
 * @returns Validated product name and manufacturer.
 */
export async function analyzeProductImages(files: File[]): Promise<ProductAnalysis> {
  if (files.length !== 4) throw new Error('Product analysis requires exactly four images')
  const config = requireLlmConfig()
  const images = await Promise.all(files.map(toImagePart))
  const result = await generateText({
    model: createLanguageModel(config),
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze these four views of the same medical product.' },
        ...images
      ]
    }],
    maxOutputTokens: 300,
    temperature: 0,
    maxRetries: 1,
    timeout: 60_000
  })
  return analysisSchema.parse(JSON.parse(result.text))
}

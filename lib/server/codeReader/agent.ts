/**
 * @fileoverview Reads every machine-readable code in a product-photo batch. A plain ZXing
 * scan runs first; if it finds no GS1 lot or expiry, a vision agent looks at the photos,
 * proposes regions that contain codes, and calls the decoder on them until it is done.
 * Only values the decoder returns are kept; the agent's own text is never used as data.
 */
import { hasToolCall, stepCountIs, tool, ToolLoopAgent, type LanguageModel } from 'ai'
import sharp from 'sharp'
import { z } from 'zod'
import { decodeRegion, scanImage, uniqueHits, type CodeHit } from '@/lib/server/codeReader/decode'

const INSTRUCTIONS = `You locate machine-readable codes on photographs of one medical product: GS1 DataMatrix, QR codes, barcodes (EAN-13, UPC, GS1-128, ITF-14) and similar.
You cannot read codes yourself. To read one, call decodeRegion with the photo number and a box around the code, given as fractions of the photo's width and height (0 to 1, top-left origin).
Small square DataMatrix codes often sit beside the LOT and expiry symbols. Look at every photo.
If a decode fails, try once more with a looser box, a rotation, or a different enhancement, then move on.
Call finish when every visible code has been decoded or tried. Do not describe or transcribe the codes.`

/** Long edge of the preview images the agent sees; decoding always uses the full photo. */
const PREVIEW_EDGE = 1280

export type ReadCodesOptions = {
  /** Locating agent model; omit to skip the agent and rely on the plain scan only. */
  model?: LanguageModel
  maxSteps?: number
  temperature?: number
  abortSignal?: AbortSignal
  log?: (message: string, details?: Record<string, unknown>) => void
}

/** True when the plain scan already found what matters most: a GS1 lot or expiry. */
const hasRichGs1 = (hits: CodeHit[]) => hits.some(hit => hit.fields.lot || hit.fields.expiresOn)

const describe = (hit: CodeHit) => ({
  photo: hit.image + 1,
  format: hit.format,
  ...Object.fromEntries(Object.entries(hit.fields).filter(([, value]) => value))
})

/**
 * Finds and decodes every code in the batch.
 *
 * @param photos - Encoded photos in upload order.
 * @returns Every distinct decoded code. Never throws; failures just mean fewer hits.
 */
export async function readCodes(photos: Buffer[], options: ReadCodesOptions = {}): Promise<CodeHit[]> {
  const log = options.log ?? (() => {})
  const hits: CodeHit[] = []
  for (const [i, photo] of photos.entries()) {
    try {
      hits.push(...(await scanImage(i, photo)))
    } catch (error) {
      log('Code scan failed', { photo: i + 1, error: (error as Error).message })
    }
  }
  if (!options.model || hasRichGs1(hits)) return uniqueHits(hits)

  try {
    hits.push(...(await runAgent(photos, uniqueHits(hits), options)))
  } catch (error) {
    log('Code agent failed', { error: (error as Error).message })
  }
  return uniqueHits(hits)
}

async function runAgent(photos: Buffer[], known: CodeHit[], options: ReadCodesOptions): Promise<CodeHit[]> {
  const found: CodeHit[] = []
  const previews = await Promise.all(
    photos.map(photo => sharp(photo).rotate().resize({ width: PREVIEW_EDGE, height: PREVIEW_EDGE, fit: 'inside' }).jpeg({ quality: 82 }).toBuffer())
  )

  const agent = new ToolLoopAgent({
    model: options.model!,
    instructions: INSTRUCTIONS,
    temperature: options.temperature,
    maxOutputTokens: 1024,
    maxRetries: 1,
    toolChoice: 'required',
    stopWhen: [stepCountIs(options.maxSteps ?? 6), hasToolCall('finish')],
    tools: {
      decodeRegion: tool({
        description: 'Crop a region of one photo, enhance it, and decode any code inside with a barcode decoder.',
        inputSchema: z.object({
          photo: z.number().int().min(1).max(photos.length).describe('Photo number, starting at 1'),
          x: z.number().min(0).max(1).describe('Left edge as a fraction of the photo width'),
          y: z.number().min(0).max(1).describe('Top edge as a fraction of the photo height'),
          width: z.number().gt(0).max(1),
          height: z.number().gt(0).max(1),
          rotate: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
          enhancement: z.enum(['none', 'contrast', 'threshold']).optional()
        }),
        execute: async ({ photo, rotate, enhancement, ...box }) => {
          const hits = await decodeRegion(photo - 1, photos[photo - 1], box, { rotate, enhancement, via: 'agent' })
          found.push(...hits)
          return hits.length
            ? { decoded: hits.map(describe) }
            : { decoded: [], hint: 'Nothing decoded. Try a looser box, a rotation, or another enhancement, or move on.' }
        }
      }),
      finish: tool({
        description: 'Call when every visible code has been decoded or tried.',
        inputSchema: z.object({ codesSeen: z.number().int().min(0).describe('How many codes you saw in total') }),
        execute: async () => ({ ok: true })
      })
    }
  })

  const already = known.length
    ? `Already decoded without your help: ${JSON.stringify(known.map(describe))}. Look for any other codes.`
    : 'No codes have been decoded yet.'
  const result = await agent.generate({
    abortSignal: options.abortSignal,
    prompt: [{
      role: 'user',
      content: [
        { type: 'text', text: `${photos.length} photos of the same product follow. ${already}` },
        ...previews.flatMap((preview, i) => [
          { type: 'text' as const, text: `Photo ${i + 1}` },
          { type: 'file' as const, data: preview, mediaType: 'image/jpeg' }
        ])
      ]
    }]
  })
  options.log?.('Code agent finished', {
    steps: result.steps.length,
    decodeCalls: result.steps.flatMap(step => step.toolCalls).filter(call => call.toolName === 'decodeRegion').length,
    decoded: found.length
  })
  return found
}

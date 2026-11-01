import bwipjs from 'bwip-js/node'
import sharp, { type OverlayOptions } from 'sharp'
import { MockLanguageModelV4 } from 'ai/test'
import { describe, expect, it, vi } from 'vitest'
import { readCodes } from '@/lib/server/codeReader/agent'

const USAGE = { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 5, text: 5, reasoning: 0 } }

/** One model step that calls a single tool. */
const call = (toolName: string, input: object, id = toolName) => ({
  content: [{ type: 'tool-call' as const, toolCallId: `${id}-${Math.random()}`, toolName, input: JSON.stringify(input) }],
  finishReason: { unified: 'tool-calls' as const, raw: 'tool_calls' },
  usage: USAGE,
  warnings: []
})

const card = (composite: OverlayOptions[] = []) =>
  sharp({ create: { width: 1200, height: 900, channels: 3, background: '#e9e5da' } }).composite(composite).jpeg().toBuffer()

const ean = async () =>
  card([{ input: await sharp(await bwipjs.toBuffer({ bcid: 'ean13', text: '9345678000121', scale: 3 })).png().toBuffer(), left: 100, top: 100 }])

const dataMatrix = async () =>
  card([{
    input: await sharp(await bwipjs.toBuffer({ bcid: 'gs1datamatrix', text: '(01)09345678000121(17)280331(10)4A1B-07', scale: 4 })).resize({ width: 160 }).png().toBuffer(),
    left: 800,
    top: 500
  }])

describe('readCodes', () => {
  it('skips the agent when the plain scan already found a GS1 lot or expiry', async () => {
    const model = new MockLanguageModelV4({ doGenerate: [] })
    const hits = await readCodes([await dataMatrix(), await card()], { model })
    expect(hits).toHaveLength(1)
    expect(hits[0].fields.lot).toBe('4A1B-07')
    expect(model.doGenerateCalls).toHaveLength(0)
  })

  it('runs the agent otherwise, shows it every photo, and keeps only what the decoder returns', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        call('decodeRegion', { photo: 2, x: 0.05, y: 0.05, width: 0.2, height: 0.2 }),
        call('decodeRegion', { photo: 1, x: 0.05, y: 0.08, width: 0.3, height: 0.25 }),
        {
          // Text the model writes is never treated as data, even if it looks like a code.
          content: [{ type: 'text' as const, text: 'I can see LOT 9Z9Z-99' }, call('finish', { codesSeen: 1 }).content[0]],
          finishReason: { unified: 'tool-calls' as const, raw: 'tool_calls' },
          usage: USAGE,
          warnings: []
        }
      ]
    })
    const hits = await readCodes([await ean(), await card()], { model })

    expect(model.doGenerateCalls).toHaveLength(3)
    const firstPrompt = JSON.stringify(model.doGenerateCalls[0].prompt)
    expect(firstPrompt).toContain('Photo 2')
    expect(firstPrompt).toContain('Already decoded')
    // The EAN-13 found by the plain scan and again by the agent is reported once.
    expect(hits).toHaveLength(1)
    expect(hits[0]).toMatchObject({ format: 'EAN13', fields: { gtin: '9345678000121', lot: null } })
  })

  it('stops at the step limit', async () => {
    const steps = Array.from({ length: 10 }, (_, i) => call('decodeRegion', { photo: 1, x: 0.5, y: 0.5, width: 0.1, height: 0.1 }, `s${i}`))
    const model = new MockLanguageModelV4({ doGenerate: steps })
    await readCodes([await card()], { model, maxSteps: 3 })
    expect(model.doGenerateCalls).toHaveLength(3)
  })

  it('falls back to the plain scan when the agent fails', async () => {
    const log = vi.fn()
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error('provider down')
      }
    })
    const hits = await readCodes([await ean()], { model, log })
    expect(hits[0].fields.gtin).toBe('9345678000121')
    expect(log).toHaveBeenCalledWith('Code agent failed', expect.objectContaining({ error: expect.stringContaining('provider down') }))
  })

  it('runs no model at all when the agent is disabled', async () => {
    expect(await readCodes([await card()])).toEqual([])
  })
})

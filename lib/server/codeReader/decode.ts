/**
 * @fileoverview Finds and decodes machine-readable codes in product photos with ZXing-C++
 * (WebAssembly), using sharp for orientation, cropping and enhancement. A code is only ever
 * reported when ZXing decodes it with a valid checksum; nothing is read by eye.
 */
import { readFile } from 'fs/promises'
import { createRequire } from 'module'
import { join } from 'path'
import sharp, { type Sharp } from 'sharp'
import { prepareZXingModule, readBarcodes, type ReaderOptions } from 'zxing-wasm/reader'
import {
  fieldsFromElements,
  isValidGtin,
  parseBracketed,
  parseDigitalLink,
  parseElementString,
  type Gs1Elements,
  type Gs1Fields
} from '@/lib/server/codeReader/gs1'

/** A decoded code and the label fields it establishes. */
export type CodeHit = {
  /** Zero-based index of the photo it came from. */
  image: number
  format: string
  text: string
  elements: Gs1Elements | null
  fields: Gs1Fields
  /** Which attempt found it, for logs and tests. */
  via: string
}

/** Region of a photo as fractions of its width and height. */
export type Box = { x: number; y: number; width: number; height: number }

export type Enhancement = 'none' | 'contrast' | 'threshold'

/** Symbology identifiers of carriers whose data is a GS1 element string. */
const GS1_SYMBOLOGIES = new Set([']d2', ']Q3', ']C1', ']e0', ']J1', ']z4'])
const RETAIL_GTIN_FORMATS = new Set(['EAN13', 'EAN8', 'UPCA', 'ITF14'])
const EMPTY_FIELDS: Gs1Fields = { gtin: null, lot: null, expiresOn: null, manufacturedOn: null }

const READER_OPTIONS: ReaderOptions = {
  formats: ['DataMatrix', 'QRCode', 'MicroQRCode', 'Aztec', 'PDF417', 'EAN13', 'EAN8', 'UPCA', 'Code128', 'ITF14', 'DataBar', 'DataBarExp'],
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  tryDownscale: true,
  maxNumberOfSymbols: 8,
  textMode: 'Plain'
}

/** Long edge small regions are enlarged to before decoding; small printed codes need the pixels. */
const REGION_TARGET = 1400
/** Photos larger than this are scanned as overlapping tiles too, so small codes are not lost. */
const TILE_MIN_EDGE = 1600

let ready: Promise<unknown> | null = null

/** Loads the ZXing WebAssembly from the installed package rather than the default CDN. */
function ensureReader() {
  ready ??= (async () => {
    const require = createRequire(join(process.cwd(), 'package.json'))
    const wasm = await readFile(require.resolve('zxing-wasm/reader/zxing_reader.wasm'))
    const wasmBinary = wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength) as ArrayBuffer
    return prepareZXingModule({ overrides: { wasmBinary }, fireImmediately: true })
  })().catch(error => {
    ready = null
    throw error
  })
  return ready
}

/** Turns one ZXing result into a hit, interpreting GS1 data where the code carries it. */
function interpret(image: number, via: string, result: { format: string; text: string; symbologyIdentifier: string }): CodeHit {
  const { format, text, symbologyIdentifier } = result
  let elements: Gs1Elements | null = null
  if (GS1_SYMBOLOGIES.has(symbologyIdentifier)) elements = parseElementString(text)
  else if (RETAIL_GTIN_FORMATS.has(format)) elements = isValidGtin(text) ? { '01': text } : null
  else elements = parseDigitalLink(text) ?? parseBracketed(text)
  return { image, format, text, elements, fields: elements ? fieldsFromElements(elements) : EMPTY_FIELDS, via }
}

type Pixels = { data: Uint8ClampedArray; width: number; height: number }

const toPixels = async (pipeline: Sharp): Promise<Pixels> => {
  const { data, info } = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength), width: info.width, height: info.height }
}

const enhance = (pipeline: Sharp, enhancement: Enhancement) => {
  if (enhancement === 'contrast') return pipeline.grayscale().normalise().sharpen({ sigma: 1.2 })
  if (enhancement === 'threshold') return pipeline.grayscale().normalise().threshold(128)
  return pipeline
}

async function decodePixels(image: number, via: string, pixels: Pixels) {
  await ensureReader()
  const results = await readBarcodes(pixels as unknown as ImageData, READER_OPTIONS)
  return results.filter(result => result.isValid && result.text).map(result => interpret(image, via, result))
}

/** Keeps one hit per distinct code (same format and content) across attempts. */
export function uniqueHits(hits: CodeHit[]) {
  const seen = new Set<string>()
  return hits.filter(hit => {
    const key = `${hit.format}|${hit.text}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Scans a whole photo: as taken, then enhanced, then as overlapping tiles for small codes.
 * Stops at the first pass that finds anything.
 *
 * @param image - Zero-based photo index, carried into each hit.
 * @param buffer - Encoded photo (JPEG, PNG or WebP).
 */
export async function scanImage(image: number, buffer: Buffer): Promise<CodeHit[]> {
  const oriented = sharp(buffer).rotate()
  const { width = 0, height = 0 } = await sharp(await oriented.clone().toBuffer()).metadata()

  for (const enhancement of ['none', 'contrast'] as const) {
    const hits = await decodePixels(image, `full/${enhancement}`, await toPixels(enhance(oriented.clone(), enhancement)))
    if (hits.length) return uniqueHits(hits)
  }

  if (Math.max(width, height) < TILE_MIN_EDGE) return []
  const hits: CodeHit[] = []
  for (const y of [0, 0.4]) {
    for (const x of [0, 0.4]) {
      hits.push(...(await decodeRegion(image, buffer, { x, y, width: 0.6, height: 0.6 }, { enhancement: 'contrast', via: 'tile' })))
    }
  }
  return uniqueHits(hits)
}

/**
 * Decodes one region of a photo: crops it with padding, scales it up, optionally rotates and
 * enhances it, and falls back through enhancements until something decodes.
 *
 * @param box - Region as fractions of the oriented photo; padded by 15% on each side.
 */
export async function decodeRegion(
  image: number,
  buffer: Buffer,
  box: Box,
  options: { rotate?: 0 | 90 | 180 | 270; enhancement?: Enhancement; via?: string } = {}
): Promise<CodeHit[]> {
  const oriented = await sharp(buffer).rotate().toBuffer()
  const { width = 0, height = 0 } = await sharp(oriented).metadata()
  const pad = 0.15
  const left = Math.max(0, Math.floor((box.x - box.width * pad) * width))
  const top = Math.max(0, Math.floor((box.y - box.height * pad) * height))
  const right = Math.min(width, Math.ceil((box.x + box.width * (1 + pad)) * width))
  const bottom = Math.min(height, Math.ceil((box.y + box.height * (1 + pad)) * height))
  if (right - left < 8 || bottom - top < 8) return []

  // Small regions are enlarged so fine modules survive binarisation; large ones keep every pixel.
  const cropped = sharp(oriented).extract({ left, top, width: right - left, height: bottom - top }).rotate(options.rotate ?? 0)
  const region = Math.max(right - left, bottom - top) < REGION_TARGET
    ? await cropped.resize({ width: REGION_TARGET, height: REGION_TARGET, fit: 'inside', kernel: 'lanczos3' }).toBuffer()
    : await cropped.toBuffer()

  const order: Enhancement[] = options.enhancement
    ? [options.enhancement, ...(['none', 'contrast', 'threshold'] as const).filter(e => e !== options.enhancement)]
    : ['none', 'contrast', 'threshold']
  for (const enhancement of order) {
    const hits = await decodePixels(image, `${options.via ?? 'region'}/${enhancement}`, await toPixels(enhance(sharp(region), enhancement)))
    if (hits.length) return uniqueHits(hits)
  }
  return []
}

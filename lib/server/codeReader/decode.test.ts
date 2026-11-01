import bwipjs from 'bwip-js/node'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { decodeRegion, scanImage } from '@/lib/server/codeReader/decode'

const GTIN = '09345678000121'
const GS1_TEXT = `(01)${GTIN}(17)280331(10)4A1B-07(11)250304`
const EXPECTED = { gtin: GTIN, lot: '4A1B-07', expiresOn: '2028-03-31', manufacturedOn: '2025-03-04' }

const code = (bcid: string, text: string) => bwipjs.toBuffer({ bcid, text, scale: 4, includetext: bcid === 'ean13' })

type Photo = { width?: number; height?: number; codeWidth?: number; left?: number; top?: number; rotate?: number; blur?: number; contrast?: number; noise?: boolean }

/** Places a code on a card-coloured "photo", with optional rotation, blur, fading and noise. */
async function photo(png: Buffer, { width = 1200, height = 900, codeWidth = 220, left = 650, top = 420, rotate = 0, blur = 0, contrast = 1, noise = false }: Photo = {}) {
  let placed = sharp(png).rotate(rotate, { background: '#ffffff' }).resize({ width: codeWidth })
  if (contrast < 1) placed = placed.linear(contrast, 255 * (1 - contrast))
  let out = sharp({ create: { width, height, channels: 3, background: '#e9e5da' } }).composite([
    { input: await placed.png().toBuffer(), left, top }
  ])
  if (blur) out = sharp(await out.png().toBuffer()).blur(blur)
  if (noise) {
    const grain = await sharp({ create: { width, height, channels: 3, background: '#808080', noise: { type: 'gaussian', mean: 128, sigma: 18 } } }).png().toBuffer()
    out = sharp(await out.png().toBuffer()).composite([{ input: grain, blend: 'overlay' }])
  }
  return out.jpeg({ quality: 88 }).toBuffer()
}

describe('scanImage', () => {
  it('decodes a rotated GS1 DataMatrix into GTIN, lot and both dates', async () => {
    const hits = await scanImage(0, await photo(await code('gs1datamatrix', GS1_TEXT), { rotate: 17, codeWidth: 160 }))
    expect(hits).toHaveLength(1)
    expect(hits[0].format).toBe('DataMatrix')
    expect(hits[0].fields).toEqual(EXPECTED)
  })

  it('decodes a QR code carrying a GS1 Digital Link', async () => {
    const hits = await scanImage(2, await photo(await code('qrcode', `https://id.gs1.org/01/${GTIN}/10/4A1B-07?17=280331`)))
    expect(hits[0]).toMatchObject({ image: 2, format: 'QRCode', fields: { gtin: GTIN, lot: '4A1B-07', expiresOn: '2028-03-31' } })
  })

  it('decodes an EAN-13 retail barcode as a GTIN only', async () => {
    const hits = await scanImage(0, await photo(await code('ean13', '9345678000121'), { codeWidth: 360 }))
    expect(hits[0]).toMatchObject({ format: 'EAN13', fields: { gtin: '9345678000121', lot: null, expiresOn: null } })
  })

  it('finds a small DataMatrix in a full-resolution phone photo', async () => {
    const hits = await scanImage(0, await photo(await code('gs1datamatrix', GS1_TEXT), { width: 4032, height: 3024, codeWidth: 120, left: 2900, top: 2100 }))
    expect(hits[0]?.fields).toEqual(EXPECTED)
  })

  it('reports a plain QR code without inventing label fields', async () => {
    const hits = await scanImage(0, await photo(await code('qrcode', 'https://halden.example/instructions')))
    expect(hits[0]).toMatchObject({ format: 'QRCode', elements: null, fields: { gtin: null, lot: null } })
  })

  it('returns nothing for a photo with no code', async () => {
    const blank = await sharp({ create: { width: 1200, height: 900, channels: 3, background: '#e9e5da' } }).jpeg().toBuffer()
    expect(await scanImage(0, blank)).toEqual([])
  })

  it('never returns a wrong value, however degraded the photo', async () => {
    const png = await code('gs1datamatrix', GS1_TEXT)
    const variants: Photo[] = [
      { blur: 1 }, { blur: 2.5 }, { blur: 5 }, { blur: 9 },
      { codeWidth: 70 }, { codeWidth: 50 }, { codeWidth: 36 },
      { contrast: 0.35 }, { contrast: 0.15 }, { contrast: 0.06 },
      { noise: true }, { noise: true, blur: 2 }, { rotate: 45, blur: 3 }
    ]
    let decoded = 0
    for (const variant of variants) {
      const hits = await scanImage(0, await photo(png, variant))
      for (const hit of hits) expect(hit.fields).toEqual(EXPECTED)
      if (hits.length) decoded++
    }
    // The point is correctness, but most of these should still decode.
    expect(decoded).toBeGreaterThan(variants.length / 2)
  })
})

describe('decodeRegion', () => {
  it('decodes the code inside a box, given as fractions of the photo', async () => {
    const image = await photo(await code('gs1datamatrix', GS1_TEXT), { codeWidth: 120, left: 900, top: 600 })
    const hits = await decodeRegion(1, image, { x: 0.74, y: 0.66, width: 0.12, height: 0.16 }, { via: 'test' })
    expect(hits[0]).toMatchObject({ image: 1, via: 'test/none', fields: EXPECTED })
  })

  it('returns nothing for a box that misses the code', async () => {
    const image = await photo(await code('gs1datamatrix', GS1_TEXT), { codeWidth: 120, left: 900, top: 600 })
    expect(await decodeRegion(0, image, { x: 0.05, y: 0.05, width: 0.2, height: 0.2 })).toEqual([])
  })
})

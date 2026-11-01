import { describe, expect, it } from 'vitest'
import type { CodeHit } from '@/lib/server/codeReader/decode'
import { consolidateCodes, mergeCodeFields, type CodeFields } from '@/lib/server/codeReader/merge'

const hit = (fields: Partial<CodeHit['fields']>, format = 'DataMatrix'): CodeHit => ({
  image: 0,
  format,
  text: '',
  elements: {},
  fields: { gtin: null, lot: null, expiresOn: null, manufacturedOn: null, ...fields },
  via: 'test'
})

const label = (fields: Partial<CodeFields> = {}) => ({
  name: 'Sterile Island Dressing',
  barcode: null,
  lot: null,
  expiresOn: null,
  manufacturedOn: null,
  ...fields
})

const NONE: CodeFields = { barcode: null, lot: null, expiresOn: null, manufacturedOn: null }

describe('consolidateCodes', () => {
  it('combines fields from several codes', () => {
    expect(consolidateCodes([hit({ gtin: '9345678000121' }, 'EAN13'), hit({ gtin: '09345678000121', lot: '4A1B-07', expiresOn: '2028-03-31' })])).toEqual({
      barcode: '09345678000121',
      lot: '4A1B-07',
      expiresOn: '2028-03-31',
      manufacturedOn: null
    })
  })

  it('leaves a field empty when codes disagree about it', () => {
    expect(consolidateCodes([hit({ gtin: '09345678000121', lot: 'A' }), hit({ gtin: '96385074', lot: 'A' })])).toEqual({ ...NONE, lot: 'A' })
  })
})

describe('mergeCodeFields', () => {
  it('fills fields the label left empty, e.g. a smudged lot', () => {
    const { fields, sources } = mergeCodeFields(label(), { ...NONE, lot: '4A1B-07', manufacturedOn: '2025-03-04' })
    expect(fields).toMatchObject({ lot: '4A1B-07', manufacturedOn: '2025-03-04', name: 'Sterile Island Dressing' })
    expect(sources).toMatchObject({ lot: 'code', manufacturedOn: 'code', barcode: 'none' })
  })

  it('keeps the printed form when label and code agree', () => {
    const { fields, sources } = mergeCodeFields(label({ barcode: '9345678000121' }), { ...NONE, barcode: '09345678000121' })
    expect(fields.barcode).toBe('9345678000121')
    expect(sources.barcode).toBe('label+code')
  })

  it('treats lots as equal regardless of case and surrounding space', () => {
    expect(mergeCodeFields(label({ lot: ' 4a1b-07' }), { ...NONE, lot: '4A1B-07' }).sources.lot).toBe('label+code')
  })

  it('leaves a field empty on a genuine conflict by default', () => {
    const { fields, sources } = mergeCodeFields(label({ lot: '4A1B-01' }), { ...NONE, lot: '4A1B-07' })
    expect(fields.lot).toBeNull()
    expect(sources.lot).toBe('conflict')
  })

  it('trusts the code on a conflict when the policy says so', () => {
    expect(mergeCodeFields(label({ expiresOn: '2028-03-30' }), { ...NONE, expiresOn: '2028-03-31' }, 'prefer-code').fields.expiresOn).toBe('2028-03-31')
  })

  it('replaces a label GTIN that fails its check digit, even under the empty policy', () => {
    const { fields, sources } = mergeCodeFields(label({ barcode: '09345678000126' }), { ...NONE, barcode: '09345678000121' })
    expect(fields.barcode).toBe('09345678000121')
    expect(sources.barcode).toBe('code')
  })

  it('changes nothing when no code was decoded', () => {
    const read = label({ barcode: '09345678000121', lot: '4A1B-07' })
    expect(mergeCodeFields(read, NONE).fields).toEqual(read)
  })
})

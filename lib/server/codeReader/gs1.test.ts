import { describe, expect, it } from 'vitest'
import {
  fieldsFromElements,
  gs1Date,
  isValidGtin,
  parseBracketed,
  parseDigitalLink,
  parseElementString
} from '@/lib/server/codeReader/gs1'

const NOW = new Date('2026-11-01T00:00:00Z')

describe('isValidGtin', () => {
  it('accepts valid GTIN-8, -12, -13 and -14', () => {
    for (const gtin of ['96385074', '036000291452', '9345678000121', '09345678000121']) expect(isValidGtin(gtin)).toBe(true)
  })

  it('rejects a wrong check digit, wrong length or non-digits', () => {
    for (const gtin of ['09345678000126', '0934567800012', '0934567800012X', '']) expect(isValidGtin(gtin)).toBe(false)
  })
})

describe('gs1Date', () => {
  it('converts YYMMDD to ISO', () => {
    expect(gs1Date('280331', NOW)).toBe('2028-03-31')
  })

  it('treats day 00 as the last day of the month, including leap years', () => {
    expect(gs1Date('280200', NOW)).toBe('2028-02-29')
    expect(gs1Date('270200', NOW)).toBe('2027-02-28')
  })

  it('picks the century within 50 years of now', () => {
    expect(gs1Date('760101', NOW)).toBe('2076-01-01')
    expect(gs1Date('770101', NOW)).toBe('1977-01-01')
  })

  it('rejects impossible dates', () => {
    for (const value of ['281301', '280230', '28033', 'abcdef']) expect(gs1Date(value, NOW)).toBeNull()
  })
})

describe('parseElementString', () => {
  it('splits fixed and GS-terminated variable-length elements', () => {
    expect(parseElementString('010934567800012117280331104A1B-07\u001d11250304')).toEqual({
      '01': '09345678000121',
      '17': '280331',
      '10': '4A1B-07',
      '11': '250304'
    })
  })

  it('reads a variable-length element at the end without a separator', () => {
    expect(parseElementString('0109345678000121214A1B07XYZ')).toEqual({ '01': '09345678000121', '21': '4A1B07XYZ' })
  })

  it('reads four-digit AIs', () => {
    expect(parseElementString('01093456780001213103000250')).toEqual({ '01': '09345678000121', '3103': '000250' })
  })

  it('rejects truncated or non-GS1 data', () => {
    expect(parseElementString('0109345678')).toBeNull()
    expect(parseElementString('https://example.com')).toBeNull()
  })
})

describe('parseBracketed', () => {
  it('parses bracketed human-readable text', () => {
    expect(parseBracketed('(01)09345678000121(17)280331(10)4A1B-07')).toEqual({ '01': '09345678000121', '17': '280331', '10': '4A1B-07' })
  })

  it('ignores text that is not bracketed GS1', () => {
    expect(parseBracketed('LOT 4A1B-07')).toBeNull()
  })
})

describe('parseDigitalLink', () => {
  it('reads path and query AIs', () => {
    expect(parseDigitalLink('https://id.gs1.org/01/09345678000121/10/4A1B-07?17=280331&utm=x')).toEqual({
      '01': '09345678000121',
      '10': '4A1B-07',
      '17': '280331'
    })
  })

  it('accepts a brand domain with a path prefix', () => {
    expect(parseDigitalLink('https://halden.example/p/01/09345678000121')?.['01']).toBe('09345678000121')
  })

  it('ignores ordinary URLs', () => {
    expect(parseDigitalLink('https://halden.example/products/dressing')).toBeNull()
    expect(parseDigitalLink('not a url')).toBeNull()
  })
})

describe('fieldsFromElements', () => {
  it('maps GTIN, lot, expiry and manufacture date', () => {
    expect(fieldsFromElements({ '01': '09345678000121', '10': '4A1B-07', '17': '280331', '11': '250304' }, NOW)).toEqual({
      gtin: '09345678000121',
      lot: '4A1B-07',
      expiresOn: '2028-03-31',
      manufacturedOn: '2025-03-04'
    })
  })

  it('drops values that fail validation instead of passing them on', () => {
    expect(fieldsFromElements({ '01': '09345678000126', '17': '281399' }, NOW)).toEqual({
      gtin: null,
      lot: null,
      expiresOn: null,
      manufacturedOn: null
    })
  })
})

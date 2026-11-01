/**
 * @fileoverview Parses GS1 data carried by machine-readable codes on product packaging:
 * raw element strings (GS1 DataMatrix, GS1 QR, GS1-128), bracketed human-readable text,
 * and GS1 Digital Link URLs. Everything here is deterministic; nothing is inferred.
 */

/** Group separator ZXing emits between variable-length GS1 elements. */
const GS = '\u001d'

/** Element string keyed by Application Identifier, e.g. `{ '01': '09345678000121', '10': '4A1B-07' }`. */
export type Gs1Elements = Record<string, string>

/** Label fields a GS1 code can establish. Dates are ISO `YYYY-MM-DD`. */
export type Gs1Fields = {
  gtin: string | null
  lot: string | null
  expiresOn: string | null
  manufacturedOn: string | null
}

/** AI length by its first two digits (GS1 General Specifications, figure 5.10.1-2). */
const AI_LENGTH: Record<string, number> = { '24': 3, '25': 3, '31': 4, '32': 4, '33': 4, '34': 4, '35': 4, '36': 4, '39': 4, '40': 3, '41': 3, '42': 3, '43': 3, '70': 4, '71': 4, '72': 4, '80': 4, '81': 4, '82': 4 }

/** Total length (AI plus data) of predefined fixed-length elements, by first two digits. */
const FIXED_LENGTH: Record<string, number> = { '00': 20, '01': 16, '02': 16, '03': 16, '04': 18, '11': 8, '12': 8, '13': 8, '14': 8, '15': 8, '16': 8, '17': 8, '18': 8, '19': 8, '20': 4, '31': 10, '32': 10, '33': 10, '34': 10, '35': 10, '36': 10, '41': 16 }

const aiLength = (prefix: string) => AI_LENGTH[prefix] ?? 2

/**
 * Validates a GTIN-8/12/13/14 check digit.
 *
 * @param digits - GTIN as printed, digits only.
 * @returns Whether the final digit matches the GS1 mod-10 check.
 */
export function isValidGtin(digits: string) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(digits)) return false
  const body = digits.slice(0, -1)
  const sum = [...body].reverse().reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === Number(digits.at(-1))
}

/** Pads a GTIN to 14 digits so GTIN-13 and GTIN-14 forms of the same number compare equal. */
export const toGtin14 = (digits: string) => digits.padStart(14, '0')

/**
 * Converts a GS1 YYMMDD date to ISO. Day `00` means the last day of the month, and the
 * century is chosen within a 50-year window of `now`, both as the GS1 specification defines.
 *
 * @returns ISO date, or null when the value is not a valid GS1 date.
 */
export function gs1Date(value: string, now = new Date()): string | null {
  if (!/^\d{6}$/.test(value)) return null
  const yy = Number(value.slice(0, 2))
  const month = Number(value.slice(2, 4))
  let day = Number(value.slice(4, 6))
  if (month < 1 || month > 12) return null
  const current = now.getUTCFullYear()
  const diff = yy - (current % 100)
  const century = Math.floor(current / 100) + (diff >= 51 ? -1 : diff <= -50 ? 1 : 0)
  const year = century * 100 + yy
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day === 0) day = lastDay
  if (day > lastDay) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Splits a raw GS1 element string (no leading FNC1, GS between variable-length elements).
 *
 * @returns Elements by AI, or null when the string is not well formed.
 */
export function parseElementString(raw: string): Gs1Elements | null {
  const elements: Gs1Elements = {}
  let i = 0
  while (i < raw.length) {
    if (raw[i] === GS) {
      i++
      continue
    }
    const prefix = raw.slice(i, i + 2)
    if (!/^\d{2}$/.test(prefix)) return null
    const ai = raw.slice(i, i + aiLength(prefix))
    if (!/^\d+$/.test(ai)) return null
    const fixed = FIXED_LENGTH[prefix]
    let end: number
    if (fixed) {
      end = i + fixed
      if (end > raw.length) return null
    } else {
      const separator = raw.indexOf(GS, i + ai.length)
      end = separator === -1 ? raw.length : separator
    }
    const value = raw.slice(i + ai.length, end)
    if (!value || value.includes(GS)) return null
    elements[ai] = value
    i = end
  }
  return Object.keys(elements).length ? elements : null
}

/** Parses bracketed text such as `(01)09345678000121(17)280331(10)4A1B-07`. */
export function parseBracketed(text: string): Gs1Elements | null {
  if (!/^\(\d{2,4}\)/.test(text)) return null
  const elements: Gs1Elements = {}
  for (const match of text.matchAll(/\((\d{2,4})\)([^(]*)/g)) {
    if (!match[2]) return null
    elements[match[1]] = match[2]
  }
  return Object.keys(elements).length ? elements : null
}

/**
 * Parses a GS1 Digital Link URI, e.g. `https://id.gs1.org/01/09345678000121/10/4A1B-07?17=280331`.
 * Only numeric AI keys are read; anything else in the URL is ignored.
 */
export function parseDigitalLink(text: string): Gs1Elements | null {
  let url: URL
  try {
    url = new URL(text)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  const start = segments.findIndex(segment => ['01', '8006', '8013', '8010', '00', '414', '417'].includes(segment))
  if (start === -1) return null
  const elements: Gs1Elements = {}
  for (let i = start; i + 1 < segments.length; i += 2) {
    if (!/^\d{2,4}$/.test(segments[i])) return null
    elements[segments[i]] = segments[i + 1]
  }
  url.searchParams.forEach((value, key) => {
    if (/^\d{2,4}$/.test(key) && value) elements[key] = value
  })
  return elements['01'] ? elements : null
}

/**
 * Reads the label fields a set of GS1 elements establishes, discarding anything that fails
 * validation (bad GTIN check digit, impossible date) rather than passing it on.
 */
export function fieldsFromElements(elements: Gs1Elements, now = new Date()): Gs1Fields {
  const gtin = elements['01']
  const lot = elements['10']?.trim()
  return {
    gtin: gtin && isValidGtin(gtin) ? gtin : null,
    lot: lot && lot.length <= 20 ? lot : null,
    expiresOn: elements['17'] ? gs1Date(elements['17'], now) : null,
    manufacturedOn: elements['11'] ? gs1Date(elements['11'], now) : null
  }
}

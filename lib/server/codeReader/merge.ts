/**
 * @fileoverview Combines decoded codes with the fields the vision model read off the label.
 * Decoded values are checksum-verified, so they fill gaps; disagreements are left empty
 * rather than settled by guessing, unless the label reading is provably invalid.
 */
import { isValidGtin, toGtin14, type Gs1Fields } from '@/lib/server/codeReader/gs1'
import type { CodeHit } from '@/lib/server/codeReader/decode'

/** The label fields a code can establish, named as in the product analysis. */
export type CodeFields = { barcode: string | null; lot: string | null; expiresOn: string | null; manufacturedOn: string | null }
export type CodeField = keyof CodeFields

/** Where a merged value came from. */
export type FieldSource = 'label' | 'code' | 'label+code' | 'conflict' | 'none'

export type ConflictPolicy = 'empty' | 'prefer-code'

const FIELD_MAP: Record<CodeField, keyof Gs1Fields> = {
  barcode: 'gtin',
  lot: 'lot',
  expiresOn: 'expiresOn',
  manufacturedOn: 'manufacturedOn'
}

const sameGtin = (a: string, b: string) => toGtin14(a) === toGtin14(b)
const digitsOnly = (value: string) => value.replace(/[\s-]/g, '')

const same = (field: CodeField, a: string, b: string) =>
  field === 'barcode' ? sameGtin(digitsOnly(a), digitsOnly(b)) : a.trim().toUpperCase() === b.trim().toUpperCase()

/**
 * Reduces every decoded code to one value per field. Codes that disagree with each other
 * (say, an EAN-13 and a DataMatrix with different GTINs) leave that field empty.
 */
export function consolidateCodes(hits: CodeHit[]): CodeFields {
  const result: CodeFields = { barcode: null, lot: null, expiresOn: null, manufacturedOn: null }
  for (const field of Object.keys(FIELD_MAP) as CodeField[]) {
    const values = hits.map(hit => hit.fields[FIELD_MAP[field]]).filter((value): value is string => Boolean(value))
    if (!values.length) continue
    if (values.some(value => !same(field, value, values[0]))) continue
    // The 14-digit GS1 form is canonical when both it and a retail EAN-13 are present.
    result[field] = field === 'barcode' ? values.reduce((a, b) => (b.length > a.length ? b : a)) : values[0]
  }
  return result
}

/** A label value that fails validation outright cannot be right, so it never blocks a decoded one. */
const provablyInvalid = (field: CodeField, value: string) => field === 'barcode' && !isValidGtin(digitsOnly(value))

/**
 * Merges decoded fields into the label reading.
 *
 * @param label - Fields from the vision model.
 * @param codes - Consolidated decoded fields.
 * @param policy - What to do when both have a value and they disagree.
 * @returns The merged fields and where each code-backed field came from.
 */
export function mergeCodeFields<T extends CodeFields>(label: T, codes: CodeFields, policy: ConflictPolicy = 'empty') {
  const merged = { ...label }
  const sources = {} as Record<CodeField, FieldSource>
  for (const field of Object.keys(FIELD_MAP) as CodeField[]) {
    const read = label[field]
    const decoded = codes[field]
    if (!decoded) {
      sources[field] = read ? 'label' : 'none'
    } else if (!read) {
      merged[field] = decoded as T[CodeField]
      sources[field] = 'code'
    } else if (same(field, read, decoded)) {
      sources[field] = 'label+code'
    } else if (policy === 'prefer-code' || provablyInvalid(field, read)) {
      merged[field] = decoded as T[CodeField]
      sources[field] = 'code'
    } else {
      merged[field] = null as T[CodeField]
      sources[field] = 'conflict'
    }
  }
  return { fields: merged, sources }
}

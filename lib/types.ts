export const PHOTO_BATCH_SIZE = 4
export const MAX_PHOTO_BATCH_SIZE = 12
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_BATCH_BYTES = 40 * 1024 * 1024
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type User = {
  id: string
  email: string
  name: string
  phone: string
  user_metadata: Record<string, string>
}

export type Profile = {
  name: string
  staffEmail: string
  phone: string
}

export type Notification = {
  id: string
  type: string
  title: string
  message: string
  created_at: string
}

export type SubmissionStatus = 'in_review' | 'complete' | 'rejected'

export type ProductLabel = {
  name: string | null
  manufacturer: string | null
  barcode: string | null
  size: string | null
  manufactured_on: string | null
  expires_on: string | null
  lot: string | null
  reference: string | null
  manufacturer_address: string | null
  manufacturer_site: string | null
}

export type Submission = ProductLabel & {
  id: string | number
  status: SubmissionStatus | string
  created_at: string
}

export type Photo = {
  file: File
  url: string
}

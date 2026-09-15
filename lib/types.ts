export const PHOTO_BATCH_SIZE = 4
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
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

export type SubmissionStatus = 'in_review' | 'complete' | 'rejected'

export type Submission = {
  id: string | number
  name: string | null
  status: SubmissionStatus | string
  created_at: string
}

export type Photo = {
  file: File
  url: string
}

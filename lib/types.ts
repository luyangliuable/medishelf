import type { User as SupabaseUser } from '@supabase/supabase-js'

export type User = SupabaseUser

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any

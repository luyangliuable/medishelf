export type User = {
  id: string
  email: string
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

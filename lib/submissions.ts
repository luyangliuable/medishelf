import type { Notification, Submission } from '@/lib/types'

export type SubmissionProcessing = 'complete' | 'in_review'

export type UploadResult = {
  data: { id: number }
  processing: SubmissionProcessing
}

export type SubmissionImage = {
  id: string
  storage_path: string
  publicUrl: string
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}))
  return new Error(data.error ?? fallback)
}

export async function getUploadCount(): Promise<number> {
  const response = await fetch('/api/submissions/count')
  if (!response.ok) throw await readError(response, 'Unable to load upload count')
  const data = await response.json()
  if (typeof data.count !== 'number') throw new Error('Upload count response is invalid')
  return data.count
}

export async function getHistory(): Promise<Submission[]> {
  const response = await fetch('/api/submissions')
  if (!response.ok) throw await readError(response, 'Unable to load upload history')
  const data = await response.json()
  return data.submissions ?? []
}

export async function getNotifications(): Promise<Notification[]> {
  const response = await fetch('/api/notifications')
  if (!response.ok) throw await readError(response, 'Unable to load notifications')
  const data = await response.json()
  return data.notifications ?? []
}

export async function getSubmission(submissionId: string | number) {
  const response = await fetch(`/api/submissions/${submissionId}`)
  if (!response.ok) return null
  return await response.json() as { submission: Submission; images: SubmissionImage[] }
}

export async function uploadSubmission(files: File[]): Promise<UploadResult> {
  const form = new FormData()
  files.forEach(file => form.append('files', file))
  const response = await fetch('/api/submissions', { method: 'POST', body: form })
  if (!response.ok) throw await readError(response, 'Unable to upload photos')
  return response.json() as Promise<UploadResult>
}

export async function deleteSubmission(submissionId: string | number): Promise<void> {
  const response = await fetch(`/api/submissions/${submissionId}`, { method: 'DELETE' })
  if (!response.ok) throw await readError(response, 'Unable to delete upload')
}

export async function updateSubmission(
  submissionId: string | number,
  args: { addFiles: File[]; removeImageIds: string[] }
): Promise<void> {
  const form = new FormData()
  args.addFiles.forEach(file => form.append('files', file))
  args.removeImageIds.forEach(id => form.append('removeImageIds', id))
  const response = await fetch(`/api/submissions/${submissionId}`, { method: 'PATCH', body: form })
  if (!response.ok) throw await readError(response, 'Unable to save changes')
}

export async function retrySubmissionAnalysis(submissionId: string | number): Promise<SubmissionProcessing> {
  const response = await fetch(`/api/submissions/${submissionId}/reanalyze`, { method: 'POST' })
  if (!response.ok) throw await readError(response, 'Unable to retry product analysis')
  const data = await response.json()
  return data.processing
}

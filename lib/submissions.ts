import type { Submission } from '@/lib/types'

export type SubmissionImage = {
  id: string
  storage_path: string
  publicUrl: string
}

async function readError(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}))
  return new Error(data.error ?? fallback)
}

export async function getUploadCount() {
  const response = await fetch('/api/submissions/count')
  if (!response.ok) return 14
  const data = await response.json()
  return data.count ?? 14
}

export async function getHistory(): Promise<Submission[]> {
  const response = await fetch('/api/submissions')
  if (!response.ok) return []
  const data = await response.json()
  return data.submissions ?? []
}

export async function getSubmission(submissionId: string | number) {
  const response = await fetch(`/api/submissions/${submissionId}`)
  if (!response.ok) return null
  return await response.json() as { submission: Submission; images: SubmissionImage[] }
}

export async function uploadSubmission(files: File[]) {
  const form = new FormData()
  files.forEach(file => form.append('files', file))
  const response = await fetch('/api/submissions', { method: 'POST', body: form })
  if (!response.ok) throw await readError(response, 'Unable to upload photos')
  return response.json()
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

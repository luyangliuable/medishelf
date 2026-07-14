import type { SupabaseClient } from '@supabase/supabase-js'
import { createUploadPath } from '@/lib/filePaths'
import type { Database, Submission } from '@/lib/types'

type Client = SupabaseClient<Database> | null

export type SubmissionImage = {
  id: string
  storage_path: string
  publicUrl: string
}

export async function getUploadCount(supabase: Client, userId: string | undefined) {
  if (!supabase || !userId) return 14
  const { count } = await supabase
    .from('photo_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId)
  return count ?? 14
}

export async function getHistory(supabase: Client, userId: string | undefined): Promise<Submission[]> {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('photo_submissions')
    .select('id, name, status, created_at')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as Submission[]) ?? []
}

export async function getSubmission(
  supabase: Client,
  userId: string | undefined,
  submissionId: string | number
): Promise<{ submission: Submission; images: SubmissionImage[] } | null> {
  if (!supabase || !userId) return null
  const numericId = Number(submissionId)
  if (!Number.isFinite(numericId)) return null
  const { data: submission, error } = await supabase
    .from('photo_submissions')
    .select('id, name, status, created_at')
    .eq('id', numericId)
    .eq('created_by', userId)
    .maybeSingle()
  if (error || !submission) return null
  const { data: imageRows, error: imageError } = await supabase
    .from('photo_submission_images')
    .select('id, storage_path')
    .eq('submission_id', numericId)
  if (imageError) throw imageError
  const images: SubmissionImage[] = (imageRows ?? []).map((row: { id: string; storage_path: string }) => ({
    id: row.id,
    storage_path: row.storage_path,
    publicUrl: supabase.storage.from('mp-images').getPublicUrl(row.storage_path).data.publicUrl
  }))
  return { submission: submission as Submission, images }
}

type UploadedFile = { path: string; size: number; mime: string }

export async function uploadSubmission(supabase: Client, userId: string | undefined, files: File[]) {
  if (!supabase || !userId) throw new Error('Please sign in before uploading')
  const uploaded = await uploadFiles(supabase, files)
  const { data, error } = await supabase.from('photo_submissions').insert({
    created_by: userId,
    name: 'Product upload',
    manufacturer: 'Unknown',
    status: 'in_review',
    reviewed: false
  }).select('id').single()
  if (error) throw error
  await saveImageRows(supabase, (data as { id: string }).id, uploaded)
  return data
}

// updateSubmission runs a series of ordered awaits — not a transaction (the
// Supabase JS client doesn't expose one). Failure modes on network flakes are
// partial updates. Mitigations: deletes are idempotent (safe to retry), and
// new uploads use fresh UUID paths so a retry re-uploads under a new name
// rather than colliding.
export async function updateSubmission(
  supabase: Client,
  userId: string | undefined,
  submissionId: string | number,
  args: { addFiles: File[]; removeImageIds: string[] }
): Promise<void> {
  if (!supabase || !userId) throw new Error('Please sign in before editing')
  const numericId = Number(submissionId)
  if (!Number.isFinite(numericId)) throw new Error('Invalid submission id')

  const pathsToRemove: string[] = []
  if (args.removeImageIds.length) {
    const { data: rowsToDelete, error: fetchError } = await supabase
      .from('photo_submission_images')
      .select('storage_path')
      .in('id', args.removeImageIds)
    if (fetchError) throw fetchError
    for (const row of (rowsToDelete ?? []) as { storage_path: string }[]) {
      pathsToRemove.push(row.storage_path)
    }
    const { error: deleteError } = await supabase
      .from('photo_submission_images')
      .delete()
      .in('id', args.removeImageIds)
    if (deleteError) throw deleteError
  }

  if (args.addFiles.length) {
    const uploaded = await uploadFiles(supabase, args.addFiles)
    await saveImageRows(supabase, numericId, uploaded)
  }

  const { error: touchError } = await supabase
    .from('photo_submissions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', numericId)
  if (touchError) throw touchError

  if (pathsToRemove.length) {
    const { error: storageError } = await supabase.storage.from('mp-images').remove(pathsToRemove)
    // Best-effort: DB is source of truth for what's shown; orphaned blobs are
    // harmless in a public read-only bucket.
    if (storageError) console.warn('Failed to remove storage objects:', storageError.message)
  }
}

async function uploadFiles(supabase: NonNullable<Client>, files: File[]): Promise<UploadedFile[]> {
  const rows: UploadedFile[] = []
  for (const file of files) {
    const path = createUploadPath(file)
    const { error } = await supabase.storage.from('mp-images').upload(path, file)
    if (error) throw error
    rows.push({ path, size: file.size, mime: file.type })
  }
  return rows
}

async function saveImageRows(supabase: NonNullable<Client>, submissionId: string | number, files: UploadedFile[]) {
  const rows = files.map(file => ({
    submission_id: submissionId,
    storage_path: file.path,
    size_bytes: file.size,
    mime_type: file.mime
  }))
  const { error } = await supabase.from('photo_submission_images').insert(rows)
  if (error) throw error
}

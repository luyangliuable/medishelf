import { createUploadPath } from '@/lib/filePaths'

export async function getUploadCount(supabase, userId) {
  if (!supabase || !userId) return 14
  const { count } = await supabase
    .from('photo_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId)
  return count ?? 14
}

export async function getHistory(supabase, userId) {
  if (!supabase || !userId) return []
  const { data, error } = await supabase
    .from('photo_submissions')
    .select('id, name, status, created_at')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function uploadSubmission(supabase, userId, files) {
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
  await saveImageRows(supabase, data.id, uploaded)
  return data
}

async function uploadFiles(supabase, files) {
  const rows = []
  for (const file of files) {
    const path = createUploadPath(file)
    const { error } = await supabase.storage.from('mp-images').upload(path, file)
    if (error) throw error
    rows.push({ path, size: file.size, mime: file.type })
  }
  return rows
}

async function saveImageRows(supabase, submissionId, files) {
  const rows = files.map(file => ({
    submission_id: submissionId,
    storage_path: file.path,
    size_bytes: file.size,
    mime_type: file.mime
  }))
  const { error } = await supabase.from('photo_submission_images').insert(rows)
  if (error) throw error
}

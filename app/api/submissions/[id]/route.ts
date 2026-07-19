import { NextResponse } from 'next/server'
import { createUploadPath } from '@/lib/filePaths'
import { publicFileUrl, removeUploads, saveUpload } from '@/lib/server/files'
import { currentUser, unauthorized } from '@/lib/server/session'
import { withUserDb } from '@/lib/server/db'
import type { Submission } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_request: Request, context: Ctx) {
  const user = await currentUser()
  if (!user) return unauthorized()
  const id = Number((await context.params).id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const result = await withUserDb(user.id, async client => {
    const submission = await client.query<Submission>(
      `select id, name, status, created_at from public.photo_submissions
       where id = $1 and created_by = $2`,
      [id, user.id]
    )
    if (!submission.rows[0]) return null
    const images = await client.query<{ id: string; storage_path: string }>(
      'select id, storage_path from public.photo_submission_images where submission_id = $1',
      [id]
    )
    return { submission: submission.rows[0], images: images.rows.map(row => ({ ...row, publicUrl: publicFileUrl(row.storage_path) })) }
  })
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result)
}

export async function PATCH(request: Request, context: Ctx) {
  const user = await currentUser()
  if (!user) return unauthorized()
  const id = Number((await context.params).id)
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 })
  const form = await request.formData()
  const removeIds = form.getAll('removeImageIds').map(String)
  const files = form.getAll('files').filter((file): file is File => file instanceof File)
  const uploaded = await Promise.all(files.map(async file => {
    const path = createUploadPath(file)
    await saveUpload(path, file)
    return { path, size: file.size, mime: file.type }
  }))
  let pathsToRemove: string[]
  try {
    pathsToRemove = await withUserDb(user.id, async client => {
      const owned = await client.query('select id from public.photo_submissions where id = $1 and created_by = $2', [id, user.id])
      if (!owned.rowCount) throw new Error('Submission not found')
      const deleted = removeIds.length ? await client.query<{ storage_path: string }>(
      `delete from public.photo_submission_images where id = any($1::uuid[])
       and submission_id = $2 returning storage_path`,
      [removeIds, id]
    ) : { rows: [] }
      for (const file of uploaded) {
        await client.query(
          `insert into public.photo_submission_images
           (submission_id, storage_path, size_bytes, mime_type) values ($1, $2, $3, $4)`,
          [id, file.path, file.size, file.mime]
        )
      }
      await client.query('update public.photo_submissions set updated_at = now() where id = $1', [id])
      return deleted.rows.map(row => row.storage_path)
    })
  } catch {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  }
  await removeUploads(pathsToRemove)
  return NextResponse.json({ ok: true })
}

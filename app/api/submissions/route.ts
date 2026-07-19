import { NextResponse } from 'next/server'
import { createUploadPath } from '@/lib/filePaths'
import { saveUpload } from '@/lib/server/files'
import { currentUser, unauthorized } from '@/lib/server/session'
import { withUserDb } from '@/lib/server/db'
import type { Submission } from '@/lib/types'

export async function GET() {
  const user = await currentUser()
  if (!user) return unauthorized()
  const rows = await withUserDb(user.id, async client => {
    const result = await client.query<Submission>(
      `select id, name, status, created_at from public.photo_submissions
       where created_by = $1 order by created_at desc`,
      [user.id]
    )
    return result.rows
  })
  return NextResponse.json({ submissions: rows })
}

export async function POST(request: Request) {
  const user = await currentUser()
  if (!user) return unauthorized()
  const files = (await request.formData()).getAll('files').filter((file): file is File => file instanceof File)
  if (!files.length) return NextResponse.json({ error: 'Please add photos' }, { status: 400 })
  const uploaded = await Promise.all(files.map(async file => {
    const path = createUploadPath(file)
    await saveUpload(path, file)
    return { path, size: file.size, mime: file.type }
  }))
  const data = await withUserDb(user.id, async client => {
    const submission = await client.query<{ id: string }>(
      `insert into public.photo_submissions (created_by, name, manufacturer, status, reviewed)
       values ($1, 'Product upload', 'Unknown', 'in_review', false) returning id`,
      [user.id]
    )
    for (const file of uploaded) {
      await client.query(
        `insert into public.photo_submission_images
         (submission_id, storage_path, size_bytes, mime_type) values ($1, $2, $3, $4)`,
        [submission.rows[0].id, file.path, file.size, file.mime]
      )
    }
    return submission.rows[0]
  })
  return NextResponse.json({ data })
}

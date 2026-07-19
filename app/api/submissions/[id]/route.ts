import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createUploadPath } from '@/lib/filePaths'
import { getSubmissionById, updateSubmissionImages } from '@/lib/database/submissions'
import { removeUploads, saveUpload } from '@/lib/server/files'
import { authOptions } from '@/lib/server/auth'

type Ctx = { params: Promise<{ id: string }> }

function parseSubmissionId(value: string) {
  const id = Number(value)
  return Number.isFinite(id) ? id : null
}

export async function GET(_request: Request, context: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const id = parseSubmissionId((await context.params).id)
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const result = await getSubmissionById(session.user.id, id)
  if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result)
}

export async function PATCH(request: Request, context: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const id = parseSubmissionId((await context.params).id)
  if (!id) return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 })
  const form = await request.formData()
  const removeIds = form.getAll('removeImageIds').map(String)
  const files = form.getAll('files').filter((file): file is File => file instanceof File)
  const uploaded = await Promise.all(files.map(async file => {
    const path = createUploadPath(file)
    await saveUpload(path, file)
    return { path, size: file.size, mime: file.type }
  }))
  const pathsToRemove = await updateSubmissionImages(id, session.user.id, uploaded, removeIds)
  if (!pathsToRemove) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
  await removeUploads(pathsToRemove)
  return NextResponse.json({ ok: true })
}

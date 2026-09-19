import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createUploadPath } from '@/lib/filePaths'
import {
  deleteSubmission,
  getSubmissionById,
  updateSubmissionImages
} from '@/lib/database/submissions'
import { removeUploads, saveUpload } from '@/lib/server/files'
import { authOptions } from '@/lib/server/auth'
import { ACCEPTED_IMAGE_TYPES, MAX_BATCH_BYTES, MAX_IMAGE_BYTES, MAX_PHOTO_BATCH_SIZE } from '@/lib/types'

type Ctx = { params: Promise<{ id: string }> }
const IMAGE_TYPES = new Set<string>(ACCEPTED_IMAGE_TYPES)

function parseSubmissionId(value: string) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
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

/** Deletes one owned submission and its stored images. */
export async function DELETE(_request: Request, context: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const id = parseSubmissionId((await context.params).id)
  if (!id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const paths = await deleteSubmission(id, session.user.id)
  if (!paths) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await removeUploads(paths)
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(request: Request, context: Ctx) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  const id = parseSubmissionId((await context.params).id)
  if (!id) return NextResponse.json({ error: 'Invalid submission id' }, { status: 400 })
  const form = await request.formData()
  const removeIds = form.getAll('removeImageIds').map(String)
  const files = form.getAll('files').filter((file): file is File => file instanceof File)
  if (files.some(file => !IMAGE_TYPES.has(file.type))) {
    return NextResponse.json({ error: 'Photos must be JPEG, PNG, or WebP images' }, { status: 400 })
  }
  if (files.some(file => file.size > MAX_IMAGE_BYTES)) {
    return NextResponse.json({ error: 'Each photo must be 10 MB or smaller' }, { status: 400 })
  }
  if (files.length > MAX_PHOTO_BATCH_SIZE) {
    return NextResponse.json({ error: `Please add no more than ${MAX_PHOTO_BATCH_SIZE} photos at once` }, { status: 400 })
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_BATCH_BYTES) {
    return NextResponse.json({ error: 'The complete photo batch must be 40 MB or smaller' }, { status: 400 })
  }
  const uploaded = await Promise.all(files.map(async file => {
    const path = createUploadPath(file)
    await saveUpload(path, file)
    return { path, size: file.size, mime: file.type }
  }))
  const result = await updateSubmissionImages(id, session.user.id, uploaded, removeIds)
  if (result.state !== 'updated') {
    await removeUploads(uploaded.map(file => file.path))
    if (result.state === 'not_found') {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    return NextResponse.json({
      error: result.state === 'below_minimum'
        ? 'Please keep at least 4 photos'
        : `Please keep no more than ${MAX_PHOTO_BATCH_SIZE} photos`
    }, { status: 400 })
  }
  await removeUploads(result.removedPaths)
  return NextResponse.json({ ok: true })
}

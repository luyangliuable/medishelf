import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createUploadPath } from '@/lib/filePaths'
import {
  createSubmission,
  listSubmissions,
  updateSubmissionAnalysis
} from '@/lib/database/submissions'
import { saveUpload } from '@/lib/server/files'
import { analyzeProductImages } from '@/lib/server/productAnalysis'
import { authOptions } from '@/lib/server/auth'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES, PHOTO_BATCH_SIZE } from '@/lib/types'

const IMAGE_TYPES = new Set<string>(ACCEPTED_IMAGE_TYPES)

function unauthorized() {
  return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return unauthorized()
  return NextResponse.json({ submissions: await listSubmissions(session.user.id) })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return unauthorized()
  const files = (await request.formData()).getAll('files').filter((file): file is File => file instanceof File)
  if (files.length !== PHOTO_BATCH_SIZE) {
    return NextResponse.json({ error: `Please add exactly ${PHOTO_BATCH_SIZE} photos` }, { status: 400 })
  }
  if (files.some(file => !IMAGE_TYPES.has(file.type))) {
    return NextResponse.json({ error: 'Photos must be JPEG, PNG, or WebP images' }, { status: 400 })
  }
  if (files.some(file => file.size > MAX_IMAGE_BYTES)) {
    return NextResponse.json({ error: 'Each photo must be 10 MB or smaller' }, { status: 400 })
  }
  const uploaded = await Promise.all(files.map(async file => {
    const path = createUploadPath(file)
    await saveUpload(path, file)
    return { path, size: file.size, mime: file.type }
  }))
  const data = await createSubmission(session.user.id, uploaded)
  let processing: 'complete' | 'in_review' = 'in_review'
  try {
    const analysis = await analyzeProductImages(files)
    const updated = await updateSubmissionAnalysis(data.id, session.user.id, analysis)
    if (updated) processing = 'complete'
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    console.error('Product image analysis failed:', errorName)
  }
  return NextResponse.json({ data, processing }, { status: 201 })
}

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { createUploadPath } from '@/lib/filePaths'
import {
  createSubmission,
  listSubmissions
} from '@/lib/database/submissions'
import { createNotification } from '@/lib/database/notifications'
import { saveUpload } from '@/lib/server/files'
import { analyzeAndSaveSubmission } from '@/lib/server/submissionAnalysis'
import { authOptions } from '@/lib/server/auth'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_BATCH_BYTES,
  MAX_IMAGE_BYTES,
  MAX_PHOTO_BATCH_SIZE,
  PHOTO_BATCH_SIZE
} from '@/lib/types'

const IMAGE_TYPES = new Set<string>(ACCEPTED_IMAGE_TYPES)

/** Returns an authorization error response. */
function unauthorized() {
  return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
}

/**
 * Stores one upload-processing notification without failing the upload request.
 *
 * @param userId - Authenticated application user identifier.
 * @param submissionId - Submission associated with the processing event.
 * @param processing - Final processing result.
 */
async function notifyProcessing(userId: string, submissionId: number, processing: 'complete' | 'in_review') {
  try {
    await createNotification(userId, processing === 'complete'
      ? {
          type: 'analysis_complete',
          title: 'Product details saved',
          message: 'Your product details were identified and saved.',
          submissionId
        }
      : {
          type: 'analysis_pending',
          title: 'Product review pending',
          message: 'Your photos were saved and await product review.',
          submissionId
        })
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    console.error('Notification persistence failed:', errorName)
  }
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
  if (files.length < PHOTO_BATCH_SIZE) {
    return NextResponse.json({ error: `Please add at least ${PHOTO_BATCH_SIZE} photos` }, { status: 400 })
  }
  if (files.length > MAX_PHOTO_BATCH_SIZE) {
    return NextResponse.json({ error: `Please add no more than ${MAX_PHOTO_BATCH_SIZE} photos` }, { status: 400 })
  }
  if (files.some(file => !IMAGE_TYPES.has(file.type))) {
    return NextResponse.json({ error: 'Photos must be JPEG, PNG, or WebP images' }, { status: 400 })
  }
  if (files.some(file => file.size > MAX_IMAGE_BYTES)) {
    return NextResponse.json({ error: 'Each photo must be 10 MB or smaller' }, { status: 400 })
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_BATCH_BYTES) {
    return NextResponse.json({ error: 'The complete photo batch must be 40 MB or smaller' }, { status: 400 })
  }
  const uploaded = await Promise.all(files.map(async file => {
    const path = createUploadPath(file)
    await saveUpload(path, file)
    return { path, size: file.size, mime: file.type }
  }))
  const data = await createSubmission(session.user.id, uploaded)
  let processing: 'complete' | 'in_review' = 'in_review'
  try {
    await analyzeAndSaveSubmission({ submissionId: data.id, userId: session.user.id, files })
    processing = 'complete'
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError'
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Product image analysis failed:', errorName, message)
  }
  await notifyProcessing(session.user.id, data.id, processing)
  return NextResponse.json({ data, processing }, { status: 201 })
}

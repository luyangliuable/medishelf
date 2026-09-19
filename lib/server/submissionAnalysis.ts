import { basename } from 'path'
import {
  getSubmissionImagesForAnalysis,
  updateSubmissionAnalysis
} from '@/lib/database/submissions'
import { readUpload } from '@/lib/server/files'
import { analyzeProductImages } from '@/lib/server/productAnalysis'
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PHOTO_BATCH_SIZE,
  PHOTO_BATCH_SIZE
} from '@/lib/types'

const imageTypes = new Set<string>(ACCEPTED_IMAGE_TYPES)

export async function analyzeAndSaveSubmission(args: {
  submissionId: number
  userId: string
  files: File[]
}) {
  const analysis = await analyzeProductImages(args.files)
  const updated = await updateSubmissionAnalysis(args.submissionId, args.userId, analysis)
  if (!updated) throw new Error('Submission is no longer available')
}

export async function retrySubmissionAnalysis(submissionId: number, userId: string) {
  const images = await getSubmissionImagesForAnalysis(userId, submissionId)
  if (!images) return false
  if (images.length < PHOTO_BATCH_SIZE || images.length > MAX_PHOTO_BATCH_SIZE) {
    throw new Error('Submission has an invalid image count')
  }
  const files = await Promise.all(images.map(async image => {
    if (!image.mimeType || !imageTypes.has(image.mimeType)) {
      throw new Error('Submission contains an unsupported image type')
    }
    return new File(
      [await readUpload(image.storagePath)],
      basename(image.storagePath),
      { type: image.mimeType }
    )
  }))
  await analyzeAndSaveSubmission({ submissionId, userId, files })
  return true
}

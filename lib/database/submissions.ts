import { randomUUID } from 'crypto'
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/database/client'
import { photoSubmissionImages, photoSubmissions } from '@/lib/database/schema'
import { publicFileUrl } from '@/lib/server/files'
import type { ProductAnalysis } from '@/lib/server/productAnalysis'
import { MAX_PHOTO_BATCH_SIZE, PHOTO_BATCH_SIZE, type Submission } from '@/lib/types'

export type UploadedFile = { path: string; size: number; mime: string }

function toSubmission(row: typeof photoSubmissions.$inferSelect): Submission {
  return {
    id: row.id,
    name: row.name,
    manufacturer: row.manufacturer,
    barcode: row.barcode,
    size: row.size,
    manufactured_on: row.manufacturedOn,
    expires_on: row.expiresOn,
    lot: row.lot,
    reference: row.reference,
    manufacturer_address: row.manufacturerAddress,
    manufacturer_site: row.manufacturerSite,
    status: row.status,
    created_at: row.createdAt.toISOString()
  }
}

async function setCurrentUser(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string) {
  await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`)
}

export async function countSubmissions(userId: string) {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const rows = await tx.select({ value: count() }).from(photoSubmissions)
      .where(eq(photoSubmissions.createdBy, userId))
    return rows[0]?.value ?? 0
  })
}

export async function listSubmissions(userId: string) {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const rows = await tx.select().from(photoSubmissions)
      .where(eq(photoSubmissions.createdBy, userId))
      .orderBy(desc(photoSubmissions.createdAt))
    return rows.map(toSubmission)
  })
}

export async function getSubmissionById(userId: string, submissionId: number) {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const submissions = await tx.select().from(photoSubmissions)
      .where(and(eq(photoSubmissions.id, submissionId), eq(photoSubmissions.createdBy, userId)))
      .limit(1)
    const submission = submissions[0]
    if (!submission) return null
    const images = await tx.select({
      id: photoSubmissionImages.id,
      storagePath: photoSubmissionImages.storagePath
    }).from(photoSubmissionImages)
      .where(eq(photoSubmissionImages.submissionId, submissionId))
    return {
      submission: toSubmission(submission),
      images: images.map(row => ({
        id: row.id,
        storage_path: row.storagePath,
        publicUrl: publicFileUrl(row.storagePath)
      }))
    }
  })
}

export async function getSubmissionImagesForAnalysis(userId: string, submissionId: number) {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const submissions = await tx.select({ id: photoSubmissions.id }).from(photoSubmissions)
      .where(and(eq(photoSubmissions.id, submissionId), eq(photoSubmissions.createdBy, userId)))
      .limit(1)
    if (!submissions[0]) return null
    return tx.select({
      storagePath: photoSubmissionImages.storagePath,
      mimeType: photoSubmissionImages.mimeType
    }).from(photoSubmissionImages)
      .where(and(
        eq(photoSubmissionImages.submissionId, submissionId),
        eq(photoSubmissionImages.status, 'active')
      ))
  })
}

export async function createSubmission(userId: string, files: UploadedFile[]) {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const submissions = await tx.insert(photoSubmissions).values({
      createdBy: userId,
      status: 'in_review',
      reviewed: false
    }).returning({ id: photoSubmissions.id })
    const submission = submissions[0]
    if (files.length) {
      await tx.insert(photoSubmissionImages).values(files.map(file => ({
        id: randomUUID(),
        submissionId: submission.id,
        storagePath: file.path,
        sizeBytes: file.size,
        mimeType: file.mime
      })))
    }
    return submission
  })
}

/**
 * Applies a validated product analysis to an owned submission.
 *
 * @param submissionId - Submission to update.
 * @param userId - Owner of the submission.
 * @param analysis - Validated product details.
 * @returns Whether the owned submission was updated.
 */
export async function updateSubmissionAnalysis(
  submissionId: number,
  userId: string,
  analysis: ProductAnalysis
) {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const rows = await tx.update(photoSubmissions).set({
      name: analysis.name,
      manufacturer: analysis.manufacturer,
      barcode: analysis.barcode,
      size: analysis.size,
      manufacturedOn: analysis.manufacturedOn,
      expiresOn: analysis.expiresOn,
      lot: analysis.lot,
      reference: analysis.reference,
      manufacturerAddress: analysis.manufacturerAddress,
      manufacturerSite: analysis.manufacturerSite,
      status: 'complete',
      reviewed: true,
      updatedAt: new Date()
    }).where(and(
      eq(photoSubmissions.id, submissionId),
      eq(photoSubmissions.createdBy, userId)
    )).returning({ id: photoSubmissions.id })
    return rows.length === 1
  })
}

/**
 * Deletes an owned submission and returns its stored image paths.
 *
 * @param submissionId - Submission to delete.
 * @param userId - Owner of the submission.
 * @returns Stored paths to remove, or null when the submission is unavailable.
 */
export async function deleteSubmission(submissionId: number, userId: string) {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const owned = await tx.select({ id: photoSubmissions.id }).from(photoSubmissions)
      .where(and(eq(photoSubmissions.id, submissionId), eq(photoSubmissions.createdBy, userId)))
      .limit(1)
    if (!owned[0]) return null
    const images = await tx.select({ storagePath: photoSubmissionImages.storagePath })
      .from(photoSubmissionImages)
      .where(eq(photoSubmissionImages.submissionId, submissionId))
    const deleted = await tx.delete(photoSubmissions).where(and(
      eq(photoSubmissions.id, submissionId),
      eq(photoSubmissions.createdBy, userId)
    )).returning({ id: photoSubmissions.id })
    if (!deleted[0]) return null
    return images.map(image => image.storagePath)
  })
}

export type UpdateSubmissionImagesResult =
  | { state: 'not_found' }
  | { state: 'below_minimum' }
  | { state: 'above_maximum' }
  | { state: 'updated'; removedPaths: string[] }

export async function updateSubmissionImages(
  submissionId: number,
  userId: string,
  files: UploadedFile[],
  removeIds: string[]
): Promise<UpdateSubmissionImagesResult> {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const owned = await tx.execute<{ id: number }>(sql`
      select id
      from public.photo_submissions
      where id = ${submissionId} and created_by = ${userId}
      for update
    `)
    if (!owned.rows[0]) return { state: 'not_found' }
    const currentImages = await tx.select({
      id: photoSubmissionImages.id,
      storagePath: photoSubmissionImages.storagePath
    }).from(photoSubmissionImages)
      .where(eq(photoSubmissionImages.submissionId, submissionId))
    const imagesToRemove = currentImages.filter(image => removeIds.includes(image.id))
    if (currentImages.length - imagesToRemove.length + files.length < PHOTO_BATCH_SIZE) {
      return { state: 'below_minimum' }
    }
    if (currentImages.length - imagesToRemove.length + files.length > MAX_PHOTO_BATCH_SIZE) {
      return { state: 'above_maximum' }
    }
    const deleted = imagesToRemove.length ? await tx.delete(photoSubmissionImages)
      .where(and(
        eq(photoSubmissionImages.submissionId, submissionId),
        inArray(photoSubmissionImages.id, imagesToRemove.map(image => image.id))
      ))
      .returning({ storagePath: photoSubmissionImages.storagePath }) : []
    if (files.length) {
      await tx.insert(photoSubmissionImages).values(files.map(file => ({
        id: randomUUID(),
        submissionId,
        storagePath: file.path,
        sizeBytes: file.size,
        mimeType: file.mime
      })))
    }
    const changedImages = files.length > 0 || deleted.length > 0
    await tx.update(photoSubmissions).set({
      ...(changedImages
        ? {
            name: null,
            manufacturer: null,
            barcode: null,
            size: null,
            manufacturedOn: null,
            expiresOn: null,
            lot: null,
            reference: null,
            manufacturerAddress: null,
            manufacturerSite: null,
            status: 'in_review',
            reviewed: false
          }
        : {}),
      updatedAt: new Date()
    }).where(and(eq(photoSubmissions.id, submissionId), eq(photoSubmissions.createdBy, userId)))
    return { state: 'updated', removedPaths: deleted.map(row => row.storagePath) }
  })
}

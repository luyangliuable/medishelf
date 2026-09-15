import { randomUUID } from 'crypto'
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/database/client'
import { photoSubmissionImages, photoSubmissions } from '@/lib/database/schema'
import { publicFileUrl } from '@/lib/server/files'
import type { ProductAnalysis } from '@/lib/server/productAnalysis'
import type { Submission } from '@/lib/types'

export type UploadedFile = { path: string; size: number; mime: string }

function toSubmission(row: typeof photoSubmissions.$inferSelect): Submission {
  return {
    id: row.id,
    name: row.name,
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

export async function createSubmission(userId: string, files: UploadedFile[]) {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const submissions = await tx.insert(photoSubmissions).values({
      createdBy: userId,
      name: 'Product upload',
      manufacturer: 'Unknown',
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

export async function updateSubmissionImages(submissionId: number, userId: string, files: UploadedFile[], removeIds: string[]) {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const owned = await tx.select({ id: photoSubmissions.id }).from(photoSubmissions)
      .where(and(eq(photoSubmissions.id, submissionId), eq(photoSubmissions.createdBy, userId)))
      .limit(1)
    if (!owned[0]) return null
    const deleted = removeIds.length ? await tx.delete(photoSubmissionImages)
      .where(and(eq(photoSubmissionImages.submissionId, submissionId), inArray(photoSubmissionImages.id, removeIds)))
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
    await tx.update(photoSubmissions).set({ updatedAt: new Date() })
      .where(eq(photoSubmissions.id, submissionId))
    return deleted.map(row => row.storagePath)
  })
}

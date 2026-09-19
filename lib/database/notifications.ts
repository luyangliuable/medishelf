/**
 * @fileoverview Persists and retrieves user-scoped application notifications.
 */
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/database/client'
import { notifications } from '@/lib/database/schema'
import type { Notification } from '@/lib/types'

type NotificationInput = {
  type: 'analysis_complete' | 'analysis_pending'
  title: string
  message: string
  submissionId?: number
}

/**
 * Sets the current application user for row-level security.
 *
 * @param tx - Database transaction used for notification access.
 * @param userId - Authenticated application user identifier.
 */
async function setCurrentUser(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string) {
  await tx.execute(sql`select set_config('app.current_user_id', ${userId}, true)`)
}

/**
 * Converts a database notification row to the client response shape.
 *
 * @param row - Persisted notification row.
 * @returns Serializable notification.
 */
function toNotification(row: typeof notifications.$inferSelect): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    created_at: row.createdAt.toISOString()
  }
}

/**
 * Lists notifications owned by one application user, newest first.
 *
 * @param userId - Authenticated application user identifier.
 * @returns Persisted notifications for the user.
 */
export async function listNotifications(userId: string): Promise<Notification[]> {
  return db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    const rows = await tx.select().from(notifications)
      .where(eq(notifications.createdBy, userId))
      .orderBy(desc(notifications.createdAt))
    return rows.map(toNotification)
  })
}

/**
 * Creates a notification for one application user.
 *
 * @param userId - Authenticated application user identifier.
 * @param input - Notification content and optional submission reference.
 */
export async function createNotification(userId: string, input: NotificationInput): Promise<void> {
  await db.transaction(async tx => {
    await setCurrentUser(tx, userId)
    await tx.insert(notifications).values({ createdBy: userId, ...input })
  })
}

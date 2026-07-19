import { bigserial, bigint, boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'

export const photoSubmissions = pgTable('photo_submissions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull().default('Product upload'),
  manufacturer: text('manufacturer').notNull().default('Unknown'),
  status: text('status').notNull().default('in_review'),
  reviewed: boolean('reviewed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

export const photoSubmissionImages = pgTable('photo_submission_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  submissionId: bigint('submission_id', { mode: 'number' }).notNull()
    .references(() => photoSubmissions.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  status: text('status').notNull().default('active'),
  sizeBytes: bigint('size_bytes', { mode: 'number' }),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

export type SubmissionRow = typeof photoSubmissions.$inferSelect
export type SubmissionImageRow = typeof photoSubmissionImages.$inferSelect

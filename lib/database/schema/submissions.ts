import { bigserial, bigint, boolean, date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'

export const photoSubmissions = pgTable('photo_submissions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name'),
  manufacturer: text('manufacturer'),
  barcode: text('barcode'),
  size: text('size'),
  manufacturedOn: date('manufactured_on'),
  expiresOn: date('expires_on'),
  lot: text('lot'),
  reference: text('reference'),
  manufacturerAddress: text('manufacturer_address'),
  manufacturerSite: text('manufacturer_site'),
  status: text('status').notNull().default('in_review'),
  reviewed: boolean('reviewed').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  submissionId: bigint('submission_id', { mode: 'number' })
    .references(() => photoSubmissions.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
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

export type NotificationRow = typeof notifications.$inferSelect
export type SubmissionRow = typeof photoSubmissions.$inferSelect
export type SubmissionImageRow = typeof photoSubmissionImages.$inferSelect

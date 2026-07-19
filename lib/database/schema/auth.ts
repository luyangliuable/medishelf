import { jsonb, pgSchema, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export type UserMetadata = {
  name?: string
  staffEmail?: string
  phone?: string
}

export const authSchema = pgSchema('auth')

export const users = authSchema.table('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  encryptedPassword: text('encrypted_password').notNull(),
  rawUserMetaData: jsonb('raw_user_meta_data').$type<UserMetadata>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

export type NewUser = typeof users.$inferInsert
export type UserRow = typeof users.$inferSelect

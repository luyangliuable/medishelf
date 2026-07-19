import { boolean, pgSchema, text } from 'drizzle-orm/pg-core'

export const storageSchema = pgSchema('storage')

export const buckets = storageSchema.table('buckets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  public: boolean('public').notNull().default(false)
})

import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/database/client'
import { users, type UserMetadata, type UserRow } from '@/lib/database/schema'
import { hashPassword } from '@/lib/server/password'
import type { Profile, User } from '@/lib/types'

export type RegisterInput = Profile & { email: string; password: string }

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function toAppUser(user: UserRow): User {
  const metadata = user.rawUserMetaData ?? {}
  return {
    id: user.id,
    email: user.email,
    name: metadata.name ?? user.email.split('@')[0] ?? '',
    phone: metadata.phone ?? '',
    user_metadata: metadata
  }
}

export async function findUserByEmail(email: string) {
  const result = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1)
  return result[0] ?? null
}

export async function findUserById(id: string) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return result[0] ?? null
}

export async function createUser(input: RegisterInput) {
  const email = normalizeEmail(input.email)
  const metadata: UserMetadata = {
    name: input.name.trim(),
    staffEmail: email,
    phone: input.phone.trim()
  }
  const result = await db.insert(users).values({
    id: randomUUID(),
    email,
    encryptedPassword: await hashPassword(input.password),
    rawUserMetaData: metadata
  }).returning()
  return result[0]
}

export async function updateUserProfile(userId: string, profile: Profile) {
  const email = normalizeEmail(profile.staffEmail)
  const metadata: UserMetadata = {
    name: profile.name.trim(),
    staffEmail: email,
    phone: profile.phone.trim()
  }
  const result = await db.update(users).set({
    email,
    rawUserMetaData: metadata,
    updatedAt: new Date()
  }).where(eq(users.id, userId)).returning()
  return result[0] ?? null
}

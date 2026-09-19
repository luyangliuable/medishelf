/**
 * @fileoverview Returns persisted notifications for the authenticated user.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { listNotifications } from '@/lib/database/notifications'
import { authOptions } from '@/lib/server/auth'

/** Returns notifications owned by the authenticated user. */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  return NextResponse.json({ notifications: await listNotifications(session.user.id) })
}

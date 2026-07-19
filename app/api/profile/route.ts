import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { updateUserProfile } from '@/lib/database/users'
import { authOptions } from '@/lib/server/auth'
import type { Profile } from '@/lib/types'

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
  }

  const profile = await request.json() as Profile
  const name = profile.name?.trim() ?? ''
  const staffEmail = profile.staffEmail?.trim() ?? ''
  if (!name || !staffEmail) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  try {
    const user = await updateUserProfile(session.user.id, { ...profile, name, staffEmail })
    if (!user) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Profile update failed:', error)
    return NextResponse.json({ error: 'Unable to save profile' }, { status: 500 })
  }
}

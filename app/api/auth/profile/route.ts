import { NextResponse } from 'next/server'
import { query } from '@/lib/server/db'
import { currentUser, unauthorized } from '@/lib/server/session'
import type { Profile } from '@/lib/types'

export async function PUT(request: Request) {
  const user = await currentUser()
  if (!user) return unauthorized()
  const profile = await request.json() as Profile
  const email = profile.staffEmail.trim().toLowerCase()
  if (!profile.name.trim() || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }
  const meta = { name: profile.name.trim(), staffEmail: email, phone: profile.phone.trim() }
  try {
    await query(
      `update auth.users set email = $1, raw_user_meta_data = $2::jsonb,
       updated_at = now() where id = $3`,
      [email, JSON.stringify(meta), user.id]
    )
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Unable to save profile' }, { status: 400 })
  }
}

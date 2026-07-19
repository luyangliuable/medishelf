import { NextResponse } from 'next/server'
import { currentUser, unauthorized } from '@/lib/server/session'
import { withUserDb } from '@/lib/server/db'

export async function GET() {
  const user = await currentUser()
  if (!user) return unauthorized()
  const count = await withUserDb(user.id, async client => {
    const { rows } = await client.query<{ count: number }>(
      `select count(*)::int as count from public.photo_submissions
       where created_by = $1`,
      [user.id]
    )
    return rows[0]?.count ?? 0
  })
  return NextResponse.json({ count })
}

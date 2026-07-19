import { NextResponse } from 'next/server'
import { query } from '@/lib/server/db'
import { verifyPassword } from '@/lib/server/password'
import { setSession } from '@/lib/server/session'

type Body = { email?: string; password?: string }
type UserRow = { id: string; encrypted_password: string }

export async function POST(request: Request) {
  const body = await request.json() as Body
  const email = body.email?.trim().toLowerCase()
  if (!email || !body.password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  const { rows } = await query<UserRow>(
    'select id, encrypted_password from auth.users where email = $1',
    [email]
  )
  const user = rows[0]
  if (!user || !(await verifyPassword(body.password, user.encrypted_password))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
  const response = NextResponse.json({ ok: true })
  setSession(response, user.id)
  return response
}

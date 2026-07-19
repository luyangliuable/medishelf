import { NextResponse } from 'next/server'
import { query } from '@/lib/server/db'
import { hashPassword } from '@/lib/server/password'
import { setSession } from '@/lib/server/session'

type Body = { name?: string; email?: string; phone?: string; password?: string }

export async function POST(request: Request) {
  const body = await request.json() as Body
  const email = body.email?.trim().toLowerCase()
  if (!email || !body.password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
  }
  const meta = {
    name: body.name?.trim() ?? '',
    staffEmail: email,
    phone: body.phone?.trim() ?? ''
  }
  try {
    const passwordHash = await hashPassword(body.password)
    const { rows } = await query<{ id: string }>(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data)
       values ($1, $2, $3::jsonb) returning id`,
      [email, passwordHash, JSON.stringify(meta)]
    )
    const response = NextResponse.json({ ok: true })
    setSession(response, rows[0].id)
    return response
  } catch {
    return NextResponse.json({ error: 'Unable to create account' }, { status: 400 })
  }
}

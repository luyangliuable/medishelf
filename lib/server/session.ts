import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { query } from '@/lib/server/db'
import type { User } from '@/lib/types'

const cookieName = 'medishelf_session'
const maxAge = 60 * 60 * 24 * 30
const secret = process.env.SESSION_SECRET ?? 'local-dev-session-secret'

type Payload = { sub: string; exp: number }

type UserRow = {
  id: string
  email: string
  raw_user_meta_data: Record<string, string>
}

function sign(value: string) {
  return createHmac('sha256', secret).update(value).digest('base64url')
}

function encode(payload: Payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

function decode(value: string | undefined): Payload | null {
  if (!value) return null
  const [body, signature] = value.split('.')
  if (!body || !signature) return null
  const expected = Buffer.from(sign(body))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload
    return payload.exp > Date.now() ? payload : null
  } catch {
    return null
  }
}

export function setSession(response: NextResponse, userId: string) {
  response.cookies.set(cookieName, encode({ sub: userId, exp: Date.now() + maxAge * 1000 }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge
  })
}

export function clearSession(response: NextResponse) {
  response.cookies.set(cookieName, '', { path: '/', maxAge: 0 })
}

export async function currentUser(): Promise<User | null> {
  const payload = decode((await cookies()).get(cookieName)?.value)
  if (!payload) return null
  const { rows } = await query<UserRow>(
    'select id, email, raw_user_meta_data from auth.users where id = $1',
    [payload.sub]
  )
  const row = rows[0]
  if (!row) return null
  return { id: row.id, email: row.email, user_metadata: row.raw_user_meta_data }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Please sign in' }, { status: 401 })
}

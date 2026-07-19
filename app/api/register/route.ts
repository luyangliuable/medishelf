import { NextResponse } from 'next/server'
import { createUser, findUserByEmail } from '@/lib/database/users'

type RegisterBody = {
  name?: unknown
  email?: unknown
  phone?: unknown
  password?: unknown
}

function valueAsString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as RegisterBody
    const name = valueAsString(body.name)
    const email = valueAsString(body.email)
    const phone = valueAsString(body.phone)
    const password = valueAsString(body.password)

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: 'An account already exists for this email' }, { status: 409 })
    }

    await createUser({ name, email, staffEmail: email, phone, password })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Registration failed:', error)
    return NextResponse.json({ error: 'Unable to create account' }, { status: 500 })
  }
}

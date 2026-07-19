import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/server/session'

export async function GET() {
  return NextResponse.json({ user: await currentUser() })
}

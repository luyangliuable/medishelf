import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/server/auth'
import type { User } from '@/lib/types'

export async function requireCurrentUser(): Promise<User> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    user_metadata: {
      name: session.user.name,
      staffEmail: session.user.email,
      phone: session.user.phone
    }
  }
}

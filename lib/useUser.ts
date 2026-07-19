'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { User } from '@/lib/types'

export function useUser({ requireAuth = true }: { requireAuth?: boolean } = {}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const loading = status === 'loading'
  const user = session?.user ? ({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    phone: session.user.phone,
    user_metadata: {
      name: session.user.name,
      staffEmail: session.user.email,
      phone: session.user.phone
    }
  } satisfies User) : null

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') router.replace('/login')
  }, [requireAuth, router, status])

  return { user, loading }
}

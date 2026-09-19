'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import type { User } from '@/lib/types'

export function useUser({ requireAuth = true }: { requireAuth?: boolean } = {}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const loading = status === 'loading'
  const userId = session?.user?.id
  const email = session?.user?.email ?? ''
  const name = session?.user?.name ?? ''
  const phone = session?.user?.phone ?? ''
  const user = useMemo(() => userId ? ({
    id: userId,
    email,
    name,
    phone,
    user_metadata: {
      name,
      staffEmail: email,
      phone
    }
  } satisfies User) : null, [userId, email, name, phone])

  useEffect(() => {
    if (requireAuth && status === 'unauthenticated') router.replace('/login')
  }, [requireAuth, router, status])

  return { user, loading }
}

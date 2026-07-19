'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authClient'
import type { User } from '@/lib/types'

export function useUser({ requireAuth = true }: { requireAuth?: boolean } = {}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let active = true
    getCurrentUser().then(current => {
      if (!active) return
      setUser(current)
      setLoading(false)
      if (requireAuth && !current) router.replace('/login')
    })
    return () => { active = false }
  }, [requireAuth, router])

  return { user, loading }
}

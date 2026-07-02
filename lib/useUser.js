'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { hasSupabaseConfig, supabase } from '@/lib/supabaseClient'

export function useUser({ requireAuth = true } = {}) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setUser(null)
      setLoading(false)
      if (requireAuth) router.replace('/login')
      return
    }

    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return
      setUser(data.user || null)
      setLoading(false)
      if (requireAuth && !data.user) router.replace('/login')
    })
    return () => { active = false }
  }, [requireAuth, router])
  return { user, loading }
}

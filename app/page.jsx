'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import PhoneFrame from '@/components/PhoneFrame'
import { supabase } from '@/lib/supabaseClient'

export default function SplashPage() {
  const router = useRouter()
  useEffect(() => {
    const timer = setTimeout(async () => {
      const session = await supabase?.auth.getSession()
      router.replace(session?.data.session ? '/dashboard' : '/login')
    }, 1500)
    return () => clearTimeout(timer)
  }, [router])
  return (
    <PhoneFrame>
      <Image className="logo-splash" src="/images/medishelf.png" alt="MediShelf" width={220} height={113} priority />
      <div className="splash-copy">Help us learn what&apos;s<br />on our shelf</div>
      <div className="splash-dots"><span /><span /><span className="on" /></div>
    </PhoneFrame>
  )
}

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
    <PhoneFrame className="px-6">
      <Image
        src="/images/medishelf.png"
        alt="MediShelf"
        width={220}
        height={113}
        priority
        className="mx-auto mt-[205px] mb-7 drop-shadow-[0_8px_18px_rgba(18,26,74,0.08)]"
      />
      <div className="text-center text-[25px] font-extrabold leading-tight tracking-tight">
        Help us learn what&apos;s
        <br />
        on our shelf
      </div>
      <div className="mt-11 flex justify-center gap-2">
        <span className="size-2 rounded-full bg-neutral-300" />
        <span className="size-2 rounded-full bg-neutral-300" />
        <span className="h-2 w-5 rounded-full bg-foreground" />
      </div>
    </PhoneFrame>
  )
}

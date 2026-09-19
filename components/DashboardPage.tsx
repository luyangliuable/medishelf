'use client'

import { Upload } from 'lucide-react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { profileFromUser } from '@/lib/profile'
import type { User } from '@/lib/types'

export default function DashboardPage({ user, count }: { user: User; count: number }) {
  const profile = profileFromUser(user)

  return (
    <AppShell active="/dashboard" user={user}>
      <div className="px-6 pt-8 pb-28 md:pb-10">
        <h1 className="mb-5 text-[28px] font-bold tracking-tight">Hello, {profile.name}!</h1>
        <div className="text-center text-[17px] font-extrabold">Thanks for being a Medi Mate!</div>
        <p className="mx-2 mt-3 mb-9 text-center text-sm leading-relaxed text-[#303653]">
          Please upload at least 4 photos of each medical product - front, back, and both sides. More photos help
          us capture every detail.
        </p>
        <Card className="mb-6 rounded-3xl border-[#eef0f6] px-2 py-2 shadow-[0_12px_30px_rgba(18,26,74,0.06)]">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold">Your insights</h2>
            <strong className="mt-5 mb-2 block text-[22px] tracking-tight">
              {count} products uploaded so far
            </strong>
            <p className="mb-5 text-muted-foreground">Keep up the great work!</p>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/history">View upload history</Link>
            </Button>
          </CardContent>
        </Card>
        <div className="mb-4 text-[17px] font-extrabold">Upload photos</div>
        <Button asChild size="xl" className="w-full h-auto flex-col gap-2 rounded-3xl py-6 text-base shadow-[0_14px_28px_rgba(18,26,74,0.18)]">
          <Link href="/upload">
            <Upload className="!size-6" />
            Upload photos
          </Link>
        </Button>
      </div>
    </AppShell>
  )
}

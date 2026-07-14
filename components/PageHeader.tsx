'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PageHeader({ title, back = '/dashboard' }: { title: string; back?: string }) {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      className="mb-6 -ml-3 h-auto p-0 text-2xl font-extrabold hover:bg-transparent"
      onClick={() => router.push(back)}
    >
      <ChevronLeft className="!size-6" />
      {title}
    </Button>
  )
}

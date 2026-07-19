'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Search, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatDate, statusLabel } from '@/lib/filePaths'
import { getHistory } from '@/lib/submissions'
import type { Submission } from '@/lib/types'
import { useUser } from '@/lib/useUser'

const fallback: Submission[] = [1, 2, 3, 4].map((id, i) => ({
  id,
  name: 'Product name',
  status: i < 2 ? 'in_review' : 'complete',
  created_at: '2026-01-04'
}))

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [items, setItems] = useState<Submission[]>(fallback)
  useEffect(() => {
    if (user) {
      getHistory()
        .then(data => setItems(data.length ? data : fallback))
        .catch(() => setItems(fallback))
    }
  }, [user])
  if (loading) return <AppShell active="/history" />
  return (
    <AppShell active="/history">
      <div className="px-6 pt-8 pb-28 md:pb-10">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-[23px] font-extrabold">Upload History</h1>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={() => toast.info('Search is coming soon')}
            >
              <Search className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Filter"
              onClick={() => toast.info('Filters are coming soon')}
            >
              <SlidersHorizontal className="size-5" />
            </Button>
          </div>
        </div>
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {items.slice(0, 4).map(item => {
            const label = statusLabel(item.status)
            return (
              <Card
                key={item.id}
                className="relative grid grid-cols-[60px_1fr] items-center gap-4 rounded-2xl border-none p-4 shadow-[0_10px_22px_rgba(18,26,74,0.06)]"
              >
                <div className="size-14 rounded-xl bg-[linear-gradient(45deg,#e7ecf5_25%,transparent_25%,transparent_75%,#e7ecf5_75%),linear-gradient(45deg,#e7ecf5_25%,#fff_25%,#fff_75%,#e7ecf5_75%)] bg-[length:12px_12px] bg-[position:0_0,6px_6px]" />
                <div>
                  <strong className="block text-base">{item.name || 'Product name'}</strong>
                  <p className="my-1 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                  <Badge variant={label === 'Reviewed' ? 'reviewed' : 'pending'}>{label}</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 size-8 text-muted-foreground"
                  aria-label="Edit"
                  onClick={() => router.push(`/upload/${item.id}`)}
                >
                  <Pencil className="size-4" />
                </Button>
              </Card>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}

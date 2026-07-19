'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type NotificationType = 'Update' | 'Weekly Recap'
type Filter = 'All' | NotificationType

const notifications: [string, string, NotificationType][] = [
  ['Notification Title', '46 seconds ago', 'Update'],
  ['Notification Title', '2 minutes ago', 'Weekly Recap'],
  ['Notification Title', '1 day ago', 'Update'],
  ['Notification Title', '14 April', 'Weekly Recap'],
  ['Notification Title', '7 April', 'Weekly Recap']
]

const filters: Filter[] = ['All', 'Update', 'Weekly Recap']

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>('All')
  const [showFilters, setShowFilters] = useState(false)

  const visible = filter === 'All' ? notifications : notifications.filter(([, , type]) => type === filter)
  const isActive = filter !== 'All'

  return (
    <AppShell active="/notifications">
      <div className="px-6 pt-8 pb-28 md:pb-10">
        <div className="mb-5 flex items-center justify-between">
          <PageHeader title="Notifications" />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Filter"
            onClick={() => setShowFilters((v) => !v)}
          >
            <span className="relative inline-flex">
              <SlidersHorizontal className="size-5" />
              {isActive && (
                <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent" />
              )}
            </span>
          </Button>
        </div>
        {showFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                className="rounded-full"
                onClick={() => setFilter(f)}
              >
                {f}
              </Button>
            ))}
          </div>
        )}
        <div className="space-y-3">
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications match this filter.</p>
          ) : (
            visible.map(([title, time, type], i) => (
              <Card
                key={`${type}-${time}-${i}`}
                className="grid grid-cols-[52px_1fr_auto] items-center gap-4 rounded-2xl border-none bg-secondary p-3"
              >
                <div className="size-13 rounded-xl bg-[linear-gradient(45deg,#dfe4ee_25%,transparent_25%,transparent_75%,#dfe4ee_75%),linear-gradient(45deg,#dfe4ee_25%,#fff_25%,#fff_75%,#dfe4ee_75%)] bg-[length:12px_12px] bg-[position:0_0,6px_6px]" />
                <div>
                  <strong className="text-[15px]">{title}</strong>
                  <p className="mt-1 text-xs text-muted-foreground">{time}</p>
                </div>
                <Badge variant={type === 'Update' ? 'update' : 'recap'} className="whitespace-nowrap">
                  {type}
                </Badge>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  )
}

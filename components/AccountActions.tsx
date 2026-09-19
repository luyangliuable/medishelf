'use client'

import { Bell } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { profileFromUser } from '@/lib/profile'
import { useUser } from '@/lib/useUser'
import type { User } from '@/lib/types'

type Props = {
  hideProfile?: boolean
  className?: string
  initialUser?: User
}

export default function AccountActions({ hideProfile = false, className, initialUser }: Props) {
  const { user } = useUser()
  const profile = profileFromUser(user ?? initialUser)
  const initial = (profile.name || 'M').trim().charAt(0).toUpperCase()

  return (
    <div className={cn('flex items-center justify-end gap-2', className)}>
      <Button asChild variant="ghost" size="icon">
        <a href="/notifications" aria-label="Notifications">
          <Bell className="size-5" />
        </a>
      </Button>
      {!hideProfile && (
        <a href="/profile" aria-label="Profile">
          <Avatar className="size-9 shadow-[0_6px_14px_rgba(18,26,74,0.08)]">
            <AvatarFallback className="bg-[#d9d6ff] text-foreground">{initial}</AvatarFallback>
          </Avatar>
        </a>
      )}
    </div>
  )
}

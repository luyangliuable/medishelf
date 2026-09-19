import type { ReactNode } from 'react'
import AccountActions from '@/components/AccountActions'
import Navigation from '@/components/Navigation'
import { cn } from '@/lib/utils'
import type { User } from '@/lib/types'

type Props = {
  children?: ReactNode
  active?: string
  className?: string
  user?: User
}

export default function AppShell({ children, active, className, user }: Props) {
  return (
    <div className="min-h-svh md:pl-64">
      <Navigation active={active} />
      <main className={cn('mx-auto w-full md:max-w-3xl', className)}>
        <div className="px-6 pt-6">
          <AccountActions hideProfile={active === '/profile'} initialUser={user} />
        </div>
        {children}
      </main>
    </div>
  )
}

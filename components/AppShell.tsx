import type { ReactNode } from 'react'
import Navigation from '@/components/Navigation'
import { cn } from '@/lib/utils'

type Props = {
  children?: ReactNode
  active?: string
  className?: string
}

export default function AppShell({ children, active, className }: Props) {
  return (
    <div className="min-h-svh md:pl-64">
      <Navigation active={active} />
      <main className={cn('mx-auto w-full max-w-[393px] md:max-w-3xl', className)}>
        {children}
      </main>
    </div>
  )
}

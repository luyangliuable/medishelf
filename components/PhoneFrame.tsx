import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export default function PhoneFrame({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <main
      className={cn(
        'mx-auto relative w-full max-w-[393px] min-h-svh overflow-hidden bg-card shadow-[0_18px_60px_rgba(18,26,74,0.08)]',
        className
      )}
    >
      {children}
    </main>
  )
}

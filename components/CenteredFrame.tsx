import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  children?: ReactNode
  className?: string
  /** Widen the centered card on desktop (used by the upload flow). */
  wide?: boolean
}

export default function CenteredFrame({ children, className, wide = false }: Props) {
  return (
    <div className="flex min-h-svh justify-center md:items-center md:p-8">
      <main
        className={cn(
          'relative flex w-full flex-col bg-card',
          'max-w-[393px] min-h-svh',
          wide ? 'md:max-w-lg' : 'md:max-w-md',
          'md:min-h-0 md:rounded-[2.5rem] md:shadow-[0_18px_60px_rgba(18,26,74,0.12)]',
          className
        )}
      >
        {children}
      </main>
    </div>
  )
}

import Link from 'next/link'
import { History, Home, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/history', label: 'History', Icon: History },
  { href: '/profile', label: 'Profile', Icon: User }
] as const

export default function BottomMenu({ active }: { active?: string }) {
  return (
    <nav
      aria-label="Primary navigation"
      className="absolute inset-x-4 bottom-4 h-[72px] rounded-3xl bg-card shadow-[0_-6px_24px_rgba(18,26,74,0.08),0_12px_30px_rgba(18,26,74,0.06)] grid grid-cols-3 place-items-center px-2"
    >
      {items.map(({ href, label, Icon }) => {
        const isActive = active === href
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            className={cn(
              'grid place-items-center h-13 w-13 rounded-2xl transition-colors',
              isActive ? 'bg-accent text-accent-foreground' : 'text-accent hover:bg-accent/10'
            )}
          >
            <Icon className="size-5" />
          </Link>
        )
      })}
    </nav>
  )
}

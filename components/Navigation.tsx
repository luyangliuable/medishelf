import { History, Home, User } from 'lucide-react'
import Logo from '@/components/Logo'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard', label: 'Home', Icon: Home },
  { href: '/history', label: 'History', Icon: History },
  { href: '/profile', label: 'Profile', Icon: User }
] as const

export default function Navigation({ active }: { active?: string }) {
  return (
    <>
      {/* Mobile: bottom bar */}
      <nav
        aria-label="Primary navigation"
        className="fixed inset-x-4 bottom-4 z-40 mx-auto h-[72px] max-w-[393px] rounded-3xl bg-card shadow-[0_-6px_24px_rgba(18,26,74,0.08),0_12px_30px_rgba(18,26,74,0.06)] grid grid-cols-3 place-items-center px-2 md:hidden"
      >
        {items.map(({ href, label, Icon }) => {
          const isActive = active === href
          return (
            <a
              key={href}
              href={href}
              aria-label={label}
              className={cn(
                'grid place-items-center h-13 w-13 rounded-2xl transition-colors',
                isActive ? 'bg-accent text-accent-foreground' : 'text-accent hover:bg-accent/10'
              )}
            >
              <Icon className="size-5" />
            </a>
          )
        })}
      </nav>

      {/* Desktop: left sidebar */}
      <aside
        aria-label="Primary navigation"
        className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card px-4 py-6 md:flex"
      >
        <div className="mb-8 px-2">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1">
          {items.map(({ href, label, Icon }) => {
            const isActive = active === href
            return (
              <a
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors',
                  isActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/10'
                )}
              >
                <Icon className="size-5" />
                {label}
              </a>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

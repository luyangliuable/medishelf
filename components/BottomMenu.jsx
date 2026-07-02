import Link from 'next/link'

const HomeIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>
)
const HistoryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/><path d="M12 7v5l3 2"/></svg>
)
const UserIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>
)

const items = [
  { href: '/dashboard', label: 'Home', Icon: HomeIcon },
  { href: '/history', label: 'History', Icon: HistoryIcon },
  { href: '/profile', label: 'Profile', Icon: UserIcon }
]

export default function BottomMenu({ active }) {
  return (
    <nav className="bottom-menu" aria-label="Primary navigation">
      {items.map(({ href, label, Icon }) => (
        <Link className={`bottom-menu-item${active === href ? ' active' : ''}`} href={href} key={href} aria-label={label}>
          <Icon />
        </Link>
      ))}
    </nav>
  )
}

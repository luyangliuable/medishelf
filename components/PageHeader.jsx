'use client'

import { useRouter } from 'next/navigation'

export default function PageHeader({ title, back = '/dashboard' }) {
  const router = useRouter()
  return <button className="back-title" onClick={() => router.push(back)}>‹ {title}</button>
}

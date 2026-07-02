'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BottomMenu from '@/components/BottomMenu'
import PhoneFrame from '@/components/PhoneFrame'
import { profileFromUser } from '@/lib/profile'
import { supabase } from '@/lib/supabaseClient'
import { getUploadCount } from '@/lib/submissions'
import { useUser } from '@/lib/useUser'

const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 6 3 8 3 8H3s3-2 3-8z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
)
const UploadIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/></svg>
)

export default function DashboardPage() {
  const { user, loading } = useUser()
  const [count, setCount] = useState(14)
  const profile = profileFromUser(user)
  useEffect(() => { if (user) getUploadCount(supabase, user.id).then(setCount) }, [user])
  if (loading) return <PhoneFrame />
  const initial = (profile.name || 'M').trim().charAt(0).toUpperCase()
  return (
    <PhoneFrame>
      <div className="page">
        <div className="top-actions">
          <Link className="icon-btn" href="/notifications" aria-label="Notifications"><BellIcon /></Link>
          <Link className="avatar" href="/profile" aria-label="Profile">{initial}</Link>
        </div>
        <h1 className="dash-hello">Hello, {profile.name}!</h1>
        <div className="dash-sub">Thanks for being a Medi Mate!</div>
        <div className="dash-copy">Please upload at least 4 photos of each medical product - front, back, and both sides. More photos help us capture every detail.</div>
        <section className="insights">
          <h2>Your insights</h2>
          <strong>{count} products uploaded so far</strong>
          <p>Keep up the great work!</p>
          <Link className="insights-history" href="/history">View upload history</Link>
        </section>
        <div className="dash-upload-label">Upload photos</div>
        <Link className="upload-cta" href="/upload"><UploadIcon />Upload photos</Link>
      </div>
      <BottomMenu active="/dashboard" />
    </PhoneFrame>
  )
}

'use client'

import { useEffect, useState } from 'react'
import BottomMenu from '@/components/BottomMenu'
import PhoneFrame from '@/components/PhoneFrame'
import { formatDate, statusLabel } from '@/lib/filePaths'
import { getHistory } from '@/lib/submissions'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'

const fallback = [1, 2, 3, 4].map((id, i) => ({
  id, name: 'Product name', status: i < 2 ? 'in_review' : 'complete', created_at: '2026-01-04'
}))

const SearchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
)
const FilterIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16"/><path d="M7 12h10"/><path d="M10 19h4"/></svg>
)
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>
)

export default function HistoryPage() {
  const { user, loading } = useUser()
  const [items, setItems] = useState(fallback)
  useEffect(() => {
    if (user) getHistory(supabase, user.id).then(data => setItems(data.length ? data : fallback)).catch(() => setItems(fallback))
  }, [user])
  if (loading) return <PhoneFrame />
  return (
    <PhoneFrame><div className="page">
      <div className="history-title-row">
        <h1>Upload History</h1>
        <div className="icons">
          <button aria-label="Search"><SearchIcon /></button>
          <button aria-label="Filter"><FilterIcon /></button>
        </div>
      </div>
      {items.slice(0, 4).map(item => {
        const label = statusLabel(item.status)
        const pillClass = label === 'Reviewed' ? 'pill reviewed' : 'pill pending'
        return (
          <div className="history-card" key={item.id}>
            <div className="thumb" />
            <div>
              <strong>{item.name || 'Product name'}</strong>
              <p>{formatDate(item.created_at)}</p>
              <span className={pillClass}>{label}</span>
            </div>
            <button className="edit" aria-label="Edit"><EditIcon /></button>
          </div>
        )
      })}
    </div>
    <BottomMenu active="/history" />
    </PhoneFrame>
  )
}

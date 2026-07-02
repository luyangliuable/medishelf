'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import BottomMenu from '@/components/BottomMenu'
import PhoneFrame from '@/components/PhoneFrame'
import { profileFromUser, saveProfile } from '@/lib/profile'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'

export default function ProfilePage() {
  const { user, loading } = useUser()
  const [profile, setProfile] = useState({ name: '', staffEmail: '', phone: '' })
  const router = useRouter()
  useEffect(() => { if (user) setProfile(profileFromUser(user)) }, [user])
  const update = key => event => setProfile({ ...profile, [key]: event.target.value })
  const submit = async () => {
    if (!supabase || !user?.id) return
    await saveProfile(supabase, profile)
  }
  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    router.replace('/login')
  }
  if (loading) return <PhoneFrame />
  const initial = (profile.name || 'M').trim().charAt(0).toUpperCase()
  return (
    <PhoneFrame><div className="page">
      <h1 className="page-title">Your Profile</h1>
      <div className="profile-avatar">
        <div className="circle">{initial}</div>
        <div className="edit">Edit</div>
      </div>
      <Field label="Name" value={profile.name} onChange={update('name')} onBlur={submit} />
      <Field label="Staff Email" value={profile.staffEmail} onChange={update('staffEmail')} onBlur={submit} />
      <Field label="Phone Number" value={profile.phone} onChange={update('phone')} onBlur={submit} />
      <button className="hidden-link" onClick={signOut}>Sign out</button>
    </div>
    <BottomMenu active="/profile" />
    </PhoneFrame>
  )
}

function Field({ label, value, onChange, onBlur }) {
  return <div className="profile-field"><label>{label}</label><input value={value} placeholder="Placeholder text" onChange={onChange} onBlur={onBlur} /></div>
}

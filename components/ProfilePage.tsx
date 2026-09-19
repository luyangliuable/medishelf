'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import AppShell from '@/components/AppShell'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { profileFromUser, saveProfile } from '@/lib/profile'
import type { Profile, User } from '@/lib/types'

export default function ProfilePage({ user }: { user: User }) {
  const [profile, setProfile] = useState<Profile>(() => profileFromUser(user))
  const [saving, setSaving] = useState(false)

  const update = (key: keyof Profile) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setProfile({ ...profile, [key]: event.target.value })

  const submit = async () => {
    setSaving(true)
    try {
      const { error } = await saveProfile(profile)
      if (error) toast.error(error.message)
      else toast.success('Profile saved')
    } finally {
      setSaving(false)
    }
  }

  const logOut = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  const initial = (profile.name || 'M').trim().charAt(0).toUpperCase()

  return (
    <AppShell active="/profile" user={user}>
      <div className="px-6 pt-8 pb-28 md:pb-10">
        <h1 className="mb-7 text-[26px] font-bold">Your Profile</h1>
        <div className="mb-9 flex flex-col items-center">
          <Avatar className="size-28 shadow-[0_12px_24px_rgba(18,26,74,0.1)]">
            <AvatarFallback className="bg-[#d9d6ff] text-3xl font-extrabold text-accent">
              {initial}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="space-y-5">
          <Field label="Name" value={profile.name} onChange={update('name')} />
          <Field label="Staff Email" value={profile.staffEmail} onChange={update('staffEmail')} />
          <Field label="Phone Number" value={profile.phone} onChange={update('phone')} />
        </div>
        <Button
          size="xl"
          className="mt-8 w-full rounded-2xl"
          onClick={submit}
          disabled={saving}
        >
          Save
        </Button>
        <Button
          variant="outline"
          size="xl"
          className="mt-3 w-full rounded-2xl text-muted-foreground"
          onClick={logOut}
        >
          Log out
        </Button>
      </div>
    </AppShell>
  )
}

type FieldProps = {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

function Field({ label, value, onChange }: FieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} placeholder="Placeholder text" onChange={onChange} />
    </div>
  )
}

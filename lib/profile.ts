import type { Profile, User } from '@/lib/types'

export function profileFromUser(user: User | null | undefined): Profile {
  const email = user?.email ?? ''
  return {
    name: user?.name?.trim() ? user.name : (email.split('@')[0] || 'Christie'),
    staffEmail: email,
    phone: user?.phone ?? ''
  }
}

export async function saveProfile(profile: Profile) {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(profile)
  })
  const data = await response.json().catch(() => ({}))
  return response.ok ? { error: null } : { error: new Error(data.error ?? 'Unable to save profile') }
}

import type { Profile, User } from '@/lib/types'

export function profileFromUser(user: User | null | undefined): Profile {
  const data = user?.user_metadata ?? {}
  const email = user?.email ?? ''
  const fallbackName = email.split('@')[0]
  return {
    name: data.name?.trim() ? data.name : (fallbackName ? fallbackName : 'Christie'),
    staffEmail: data.staffEmail?.trim() ? data.staffEmail : email,
    phone: data.phone ?? ''
  }
}

export async function saveProfile(profile: Profile) {
  const response = await fetch('/api/auth/profile', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(profile)
  })
  const data = await response.json().catch(() => ({}))
  return response.ok ? { error: null } : { error: new Error(data.error ?? 'Unable to save profile') }
}

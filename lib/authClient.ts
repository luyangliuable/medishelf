import type { Profile, User } from '@/lib/types'

type AuthResult = { error: Error | null }

async function jsonRequest(path: string, body?: unknown): Promise<AuthResult> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await response.json().catch(() => ({}))
  return response.ok ? { error: null } : { error: new Error(data.error ?? 'Request failed') }
}

export function signUp(profile: Profile & { password: string }) {
  return jsonRequest('/api/auth/signup', profile)
}

export function signIn(email: string, password: string) {
  return jsonRequest('/api/auth/signin', { email, password })
}

export function signOut() {
  return jsonRequest('/api/auth/signout')
}

export async function getCurrentUser(): Promise<User | null> {
  const response = await fetch('/api/auth/me')
  if (!response.ok) return null
  const data = await response.json()
  return data.user ?? null
}

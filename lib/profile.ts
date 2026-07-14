import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Profile, User } from '@/lib/types'

export function profileFromUser(user: User | null | undefined): Profile {
  const data = (user?.user_metadata as Record<string, string> | undefined) ?? {}
  const email = user?.email ?? ''
  return {
    name: data.name || email.split('@')[0] || 'Christie',
    staffEmail: data.staffEmail || email || '',
    phone: data.phone || ''
  }
}

export async function saveProfile(supabase: SupabaseClient<Database> | null, profile: Profile) {
  if (!supabase) return { error: new Error('Supabase is not configured') }
  return supabase.auth.updateUser({
    data: {
      name: profile.name,
      staffEmail: profile.staffEmail,
      phone: profile.phone
    }
  })
}

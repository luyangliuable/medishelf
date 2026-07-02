export function profileFromUser(user) {
  const data = user?.user_metadata || {}
  const email = user?.email || ''
  return {
    name: data.name || email.split('@')[0] || 'Christie',
    staffEmail: data.staffEmail || email || '',
    phone: data.phone || ''
  }
}

export async function saveProfile(supabase, profile) {
  if (!supabase) return { error: new Error('Supabase is not configured') }
  return supabase.auth.updateUser({
    data: {
      name: profile.name,
      staffEmail: profile.staffEmail,
      phone: profile.phone
    }
  })
}

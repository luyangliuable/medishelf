import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(url && key)

export const supabase: SupabaseClient<Database> | null = hasSupabaseConfig
  ? createClient<Database>(url as string, key as string)
  : null

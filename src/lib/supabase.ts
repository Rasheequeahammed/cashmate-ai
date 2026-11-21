import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Validate environment variables at import time so a missing or blank
// value fails fast with a clear message. Only variable NAMES are included
// in the error, never their values.
const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

const missing: string[] = []
if (!url) missing.push('VITE_SUPABASE_URL')
if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY')

if (missing.length > 0) {
  throw new Error(
    `Missing Supabase environment variable(s): ${missing.join(', ')}. ` +
      'Copy .env.example to .env and fill in the values.',
  )
}

export const supabase: SupabaseClient = createClient(url, anonKey)

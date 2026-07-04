import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase connection. Credentials come from Vite env vars (see `.env.example`):
 *   VITE_SUPABASE_URL       — your project URL
 *   VITE_SUPABASE_ANON_KEY  — the public "anon" key (safe for the browser)
 *
 * These are only public keys; row-level security on the `words` table is what
 * actually protects the data. If they're missing we export `null` rather than
 * throwing at import time, so the app still boots and can show a helpful
 * "not configured" state instead of a blank crash.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!)
  : null

/** Name of the table holding vocabulary rows. */
export const WORDS_TABLE = 'words'

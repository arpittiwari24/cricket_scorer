import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton client instances - only create ONCE
let browserClient: SupabaseClient | null = null
let realtimeClient: SupabaseClient | null = null

export function createClient(enableRealtime = false) {
  // Return singleton instance - reuse the same client everywhere
  if (enableRealtime) {
    if (!realtimeClient) {
      realtimeClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    return realtimeClient
  } else {
    if (!browserClient) {
      browserClient = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
    }
    return browserClient
  }
}

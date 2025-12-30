import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient(enableRealtime = false) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      realtime: enableRealtime ? undefined : {
        transport: WebSocket
      }
    }
  )
}

import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase "service_role" : ignore les règles RLS.
 * À n'utiliser QUE côté serveur, après avoir vérifié les droits.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

import { createBrowserClient } from "@supabase/ssr";

/** Client Supabase côté navigateur (envoi direct du CV vers le stockage privé). */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

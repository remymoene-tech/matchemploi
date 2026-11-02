import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export function estAdmin(email: string | null | undefined) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** Renvoie l'utilisateur connecté, ou redirige vers la page de connexion. */
export async function exigerUtilisateur() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return { user, supabase };
}

export async function exigerAdmin() {
  const { user, supabase } = await exigerUtilisateur();
  if (!estAdmin(user.email)) redirect("/espace");
  return { user, supabase };
}

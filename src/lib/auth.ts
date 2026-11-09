import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { droitsDe, estSuperAdmin, peut, type Acces } from "@/lib/equipe";

/** Administrateur du site (ADMIN_EMAILS) : tous les droits, dont le ⚙️. */
export function estAdmin(email: string | null | undefined) {
  return estSuperAdmin(email);
}

/** Membre de l'équipe du tableau de bord : administrateur, chargé(e) d'admission ou de relations entreprises. */
export async function estEquipe(email: string | null | undefined) {
  return !!(await droitsDe(email));
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

/** Tableau de bord : toute l'équipe (administrateur et chargé(e)s dont l'accès est actif). */
export async function exigerAdmin() {
  const { user, supabase } = await exigerUtilisateur();
  const droits = await droitsDe(user.email);
  if (!droits) redirect("/espace");
  return { user, supabase, droits, role: droits.admin ? ("admin" as const) : ("equipe" as const) };
}

/** Page ou action de l'équipe qui demande l'un de ces accès (l'administrateur a tout). */
export async function exigerAcces(...acces: Acces[]) {
  const r = await exigerAdmin();
  if (!peut(r.droits, ...acces)) redirect("/admin?refuse=1");
  return r;
}

/** Réglages du site (⚙️) : administrateur uniquement. */
export async function exigerSuperAdmin() {
  const { user, supabase } = await exigerUtilisateur();
  if (!estSuperAdmin(user.email)) redirect("/admin");
  return { user, supabase, role: "admin" as const };
}

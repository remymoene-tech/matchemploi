import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Équipe du tableau de bord.
 * - L'administrateur (ADMIN_EMAILS dans Vercel) a tous les droits, dont le ⚙️.
 * - Les chargé(e)s d'admission et de relations entreprises, ajoutés par l'administrateur,
 *   ont accès à tout le tableau de bord sauf aux réglages du site (⚙️).
 */
export const ROLES_EQUIPE = [
  { id: "admission", label: "Chargé(e) d'admission", icone: "🎓" },
  { id: "entreprises", label: "Chargé(e) relations entreprises", icone: "🏢" },
] as const;

export type RoleEquipe = "admin" | (typeof ROLES_EQUIPE)[number]["id"];
export type Membre = { id: string; email: string; nom: string; role: string; actif: boolean; created_at: string; retire_le: string | null };

export const roleEquipe = (id: string) => ROLES_EQUIPE.find((r) => r.id === id);

export function emailsAdmins() {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function estSuperAdmin(email: string | null | undefined) {
  return !!email && emailsAdmins().includes(email.toLowerCase());
}

/** Rôle de la personne dans l'équipe (null si elle n'en fait pas partie ou si son accès est coupé). */
export const roleDe = cache(async (email: string | null | undefined): Promise<RoleEquipe | null> => {
  if (!email) return null;
  if (estSuperAdmin(email)) return "admin";
  try {
    const { data } = await createAdminClient().from("equipe").select("role, actif").eq("email", email.trim().toLowerCase()).limit(1);
    const m = data?.[0];
    return m?.actif ? (m.role as RoleEquipe) : null;
  } catch {
    return null;
  }
});

export async function listeEquipe(): Promise<Membre[] | null> {
  const { data, error } = await createAdminClient().from("equipe").select("*").order("actif", { ascending: false }).order("nom");
  return error ? null : ((data ?? []) as Membre[]);
}

/**
 * Qui reçoit les notifications 🔔 : l'administrateur, et les membres actifs des rôles concernés
 * (tous les rôles si aucun n'est précisé).
 */
export async function emailsEquipe(roles?: string[]): Promise<string[]> {
  const admins = emailsAdmins();
  try {
    let q = createAdminClient().from("equipe").select("email, role").eq("actif", true);
    if (roles?.length) q = q.in("role", roles);
    const { data } = await q;
    return [...new Set([...admins, ...(data ?? []).map((m) => (m.email as string).toLowerCase())])];
  } catch {
    return admins;
  }
}

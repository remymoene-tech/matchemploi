import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigerUtilisateur, estAdmin } from "@/lib/auth";
import { ecoleDuResponsable } from "@/lib/ecoles";

/** Qui peut voir la fiche : le candidat lui-même, l'admin, ou le responsable de son école. */
export async function accesFiche(candidatId: string) {
  const { user } = await exigerUtilisateur();
  if (user.id === candidatId) return { role: "candidat" as const, retour: "/espace" };
  if (estAdmin(user.email)) return { role: "equipe" as const, retour: "/admin" };
  const ecole = await ecoleDuResponsable(user.email);
  if (ecole) {
    const { data } = await createAdminClient().from("candidats").select("user_id").eq("user_id", candidatId).eq("ecole_id", ecole.id).maybeSingle();
    if (data) return { role: "equipe" as const, retour: "/ecole" };
  }
  return null;
}

import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { exigerUtilisateur } from "@/lib/auth";

export type Ecole = { id: string; nom: string; code: string };

/** École dont la personne est responsable (ou null). Ne plante pas si la table n'existe pas encore. */
export async function ecoleDuResponsable(email: string | null | undefined): Promise<Ecole | null> {
  if (!email) return null;
  const { data, error } = await createAdminClient()
    .from("responsables")
    .select("ecoles(id, nom, code)")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return (data.ecoles as unknown as Ecole) ?? null;
}

export async function exigerResponsable() {
  const { user, supabase } = await exigerUtilisateur();
  const ecole = await ecoleDuResponsable(user.email);
  if (!ecole) redirect("/espace");
  return { user, supabase, ecole };
}

/** Retrouve une école par son code d'inscription (insensible à la casse et aux espaces). */
export async function ecoleParCode(code: string): Promise<Ecole | null> {
  const propre = code.trim().toUpperCase().replace(/\s+/g, "");
  if (!propre) return null;
  const { data } = await createAdminClient().from("ecoles").select("id, nom, code").eq("code", propre).maybeSingle();
  return (data as Ecole) ?? null;
}

/** Code lisible à partir du nom : « IFP Salon » → « IFP-SALON-4821 ». */
export function genererCode(nom: string) {
  const base = nom
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 16);
  return `${base || "ECOLE"}-${Math.floor(1000 + Math.random() * 9000)}`;
}

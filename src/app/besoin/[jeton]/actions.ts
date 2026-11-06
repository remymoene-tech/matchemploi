"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { entrepriseRecrute, lancerRechercheCandidats } from "@/lib/recherche-entreprise";
import { createAdminClient } from "@/lib/supabase/admin";
import { lireAttentes } from "@/lib/attentes";
import { entrepriseParJeton, notifierBesoinRempli } from "@/lib/fiche-besoin";

/** L'entreprise envoie sa fiche besoin (lien personnel, sans compte). */
export async function enregistrerBesoinEntreprise(f: FormData) {
  const jeton = String(f.get("jeton") ?? "");
  const e = await entrepriseParJeton(jeton);
  if (!e) redirect(`/besoin/${encodeURIComponent(jeton)}`);
  await createAdminClient().from("entreprises")
    .update({ attentes: lireAttentes(f), besoin_rempli_le: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", e.id);
  try { await notifierBesoinRempli(e); } catch { /* la notification ne bloque jamais l'entreprise */ }
  // L'entreprise recrute : MagnusMatch cherche les candidats avec ses réponses
  if (await entrepriseRecrute(e).catch(() => false)) after(() => lancerRechercheCandidats(e.id).then(() => undefined));
  redirect(`/besoin/${encodeURIComponent(jeton)}?merci=1`);
}

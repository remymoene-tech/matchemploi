"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigerUtilisateur } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { localVersISO } from "@/lib/echanges";
import { RECRUTE, TYPES_PROSPECTION } from "@/lib/prospections";

export type EtatProspection = { erreur?: string; ok?: boolean };
const txt = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const ERREUR_BASE = "Cette fonction n'est pas encore activée : ton conseiller doit faire une mise à jour du site.";

/** Échange (visite, appel, email…) + relance facultative. */
function lireEchange(f: FormData) {
  const tz = Number(f.get("tz") ?? -60);
  const type = txt(f, "type", 20);
  const relance = localVersISO(txt(f, "action_a", 30), tz);
  return {
    type: TYPES_PROSPECTION.some((t) => t.id === type) ? type : "autre",
    date_echange: localVersISO(txt(f, "date_echange", 30), tz) ?? new Date().toISOString(),
    resume: txt(f, "resume", 3000),
    action: relance ? txt(f, "action", 300) : "",
    action_a: relance,
  };
}

/** Entretien prévu : case cochée + date et heure. */
function lireEntretien(f: FormData) {
  if (f.get("entretien") !== "on") return { entretien_a: null };
  return { entretien_a: localVersISO(txt(f, "entretien_a", 30), Number(f.get("tz") ?? -60)) };
}

async function maProspection(id: string, userId: string) {
  const { data } = await createAdminClient().from("prospections").select("id").eq("id", id).eq("candidat_id", userId).maybeSingle();
  return !!data;
}

export async function creerProspection(_: EtatProspection, f: FormData): Promise<EtatProspection> {
  const { user } = await exigerUtilisateur();
  const recrute = txt(f, "recrute", 10);
  const p = {
    candidat_id: user.id,
    entreprise: txt(f, "entreprise", 150),
    ville: txt(f, "ville", 120),
    contact_nom: txt(f, "contact_nom", 150),
    contact_tel: txt(f, "contact_tel", 30),
    contact_email: txt(f, "contact_email", 150),
    recrute: RECRUTE.some((r) => r.id === recrute) ? recrute : "",
    justification: txt(f, "justification", 1500),
  };
  if (!p.entreprise) return { erreur: "Indique le nom de l'entreprise." };
  if (!p.recrute) return { erreur: "Indique si l'entreprise recrute : oui ou non." };
  if (p.justification.length < 5) return { erreur: "Explique pourquoi elle recrute ou pas (ce qu'on t'a dit)." };
  const ent = lireEntretien(f);
  if (f.get("entretien") === "on" && !ent.entretien_a) return { erreur: "Indique la date et l'heure de l'entretien." };
  const db = createAdminClient();
  let { data, error } = await db.from("prospections").insert({ ...p, ...ent }).select("id").single();
  if (error && /entretien/.test(error.message)) ({ data, error } = await db.from("prospections").insert(p).select("id").single());
  if (error || !data) return { erreur: ERREUR_BASE };
  const e = lireEchange(f);
  await db.from("prospection_echanges").insert({
    ...e, prospection_id: data.id, candidat_id: user.id,
    resume: e.resume || `Premier contact. ${p.recrute === "oui" ? "Recrute" : "Ne recrute pas"} : ${p.justification}`,
  });
  redirect(`/espace/prospections/${data.id}?nouveau=1`);
}

export async function majProspection(_: EtatProspection, f: FormData): Promise<EtatProspection> {
  const { user } = await exigerUtilisateur();
  const id = txt(f, "id", 60);
  const recrute = txt(f, "recrute", 10);
  const justification = txt(f, "justification", 1500);
  if (!RECRUTE.some((r) => r.id === recrute)) return { erreur: "Indique si l'entreprise recrute : oui ou non." };
  if (justification.length < 5) return { erreur: "Explique pourquoi elle recrute ou pas." };
  const ent = lireEntretien(f);
  if (f.get("entretien") === "on" && !ent.entretien_a) return { erreur: "Indique la date et l'heure de l'entretien." };
  const db = createAdminClient();
  const { data: avant } = await db.from("prospections").select("*").eq("id", id).eq("candidat_id", user.id).maybeSingle();
  const entretienChange = avant && "entretien_a" in avant && avant.entretien_a !== ent.entretien_a;
  const { error } = await db.from("prospections").update({
    ...(avant && "entretien_a" in avant ? { ...ent, ...(entretienChange ? { entretien_vu: false } : {}) } : {}),
    entreprise: txt(f, "entreprise", 150) || undefined,
    ville: txt(f, "ville", 120),
    contact_nom: txt(f, "contact_nom", 150),
    contact_tel: txt(f, "contact_tel", 30),
    contact_email: txt(f, "contact_email", 150),
    recrute, justification, updated_at: new Date().toISOString(),
  }).eq("id", id).eq("candidat_id", user.id);
  if (error) return { erreur: "L'enregistrement a échoué." };
  revalidatePath(`/espace/prospections/${id}`);
  return { ok: true };
}

export async function ajouterEchangeProspection(_: EtatProspection, f: FormData): Promise<EtatProspection> {
  const { user } = await exigerUtilisateur();
  const id = txt(f, "prospection_id", 60);
  if (!(await maProspection(id, user.id))) return { erreur: "Entreprise introuvable." };
  const e = lireEchange(f);
  if (!e.resume) return { erreur: "Écris ce qui s'est dit." };
  const db = createAdminClient();
  const { error } = await db.from("prospection_echanges").insert({ ...e, prospection_id: id, candidat_id: user.id });
  if (error) return { erreur: "L'enregistrement a échoué." };
  await db.from("prospections").update({ updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/espace/prospections/${id}`);
  return { ok: true };
}

export async function relanceFaiteProspection(f: FormData) {
  const { user } = await exigerUtilisateur();
  await createAdminClient().from("prospection_echanges").update({ action_faite: true }).eq("id", txt(f, "id", 60)).eq("candidat_id", user.id);
  revalidatePath(`/espace/prospections/${txt(f, "prospection_id", 60)}`);
}

export async function supprimerEchangeProspection(f: FormData) {
  const { user } = await exigerUtilisateur();
  await createAdminClient().from("prospection_echanges").delete().eq("id", txt(f, "id", 60)).eq("candidat_id", user.id);
  revalidatePath(`/espace/prospections/${txt(f, "prospection_id", 60)}`);
}

export async function supprimerProspection(f: FormData) {
  const { user } = await exigerUtilisateur();
  await createAdminClient().from("prospections").delete().eq("id", txt(f, "id", 60)).eq("candidat_id", user.id);
  redirect("/espace/prospections");
}

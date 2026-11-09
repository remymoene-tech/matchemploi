"use server";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifierContact, type Lead } from "@/lib/leads";

const txt = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

/** Lien d'envoi direct du CV (PDF) vers le stockage privé, sans passer par le serveur du site. */
export async function preparerDepotIntervenant(): Promise<{ chemin: string; jeton: string } | { erreur: string }> {
  const chemin = `intervenants/${randomBytes(12).toString("hex")}.pdf`;
  const { data, error } = await createAdminClient().storage.from("cv").createSignedUploadUrl(chemin);
  return error || !data ? { erreur: "L'envoi du CV n'est pas disponible pour le moment. Réessayez dans un instant." } : { chemin, jeton: data.token };
}

/** Questionnaire « Intervenant » : arrive dans le carnet d'adresses des intervenants (hors chiffres du recrutement). */
export async function deposerIntervenant(f: FormData): Promise<{ ok?: boolean; erreur?: string }> {
  if (txt(f, "site_web")) return { ok: true }; // robot
  const email = txt(f, "email", 150).toLowerCase();
  const cv = txt(f, "cv_chemin", 120);
  const ligne = {
    prenom: txt(f, "prenom", 80),
    nom: txt(f, "nom", 80),
    email,
    telephone: txt(f, "telephone", 30),
    formation: txt(f, "domaine", 200),
    message: [
      txt(f, "presentation", 4000),
      txt(f, "linkedin", 200) && `LinkedIn : ${txt(f, "linkedin", 200)}`,
      txt(f, "disponibilites", 300) && `Disponibilités : ${txt(f, "disponibilites", 300)}`,
    ].filter(Boolean).join("\n\n"),
    cv_chemin: /^intervenants\/[a-f0-9]{24}\.pdf$/.test(cv) ? cv : null,
    consentement: f.get("consentement") === "on",
    categorie: "intervenant",
    origine: "Intervenant (formulaire)",
    annee_rentree: null,
  };
  if (!ligne.prenom || !ligne.nom || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !ligne.formation || txt(f, "presentation", 4000).length < 20)
    return { erreur: "Merci de remplir votre prénom, votre nom, un email valide, la ou les matières que vous enseignez et quelques lignes de présentation." };
  if (!ligne.consentement) return { erreur: "Merci de cocher la case d'accord pour que nous puissions conserver votre candidature." };
  const db = createAdminClient();
  const { data: deja } = await db.from("leads").select("id, cv_chemin").eq("email", email).eq("categorie", "intervenant").limit(1);
  const { data, error } = deja?.[0]
    ? await db.from("leads").update({ ...ligne, cv_chemin: ligne.cv_chemin ?? deja[0].cv_chemin, updated_at: new Date().toISOString() }).eq("id", deja[0].id).select("*").single()
    : await db.from("leads").insert(ligne).select("*").single();
  if (error || !data) return { erreur: "Le service est momentanément indisponible. Merci de réessayer dans quelques minutes." };
  await notifierContact(data as Lead).catch(() => undefined);
  return { ok: true };
}

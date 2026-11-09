"use server";

import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifierContact, type Lead } from "@/lib/leads";
import { memeEntreprise } from "@/lib/prospections";
import { emailsEquipe } from "@/lib/equipe";
import { lienBesoinEntreprise } from "@/lib/alumni-serveur";
import { SITUATIONS_INTERVENANT, SPECIALITES } from "@/lib/intervenants";

const txt = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);


/** Lien d'envoi direct du CV (PDF) vers le stockage privé, sans passer par le serveur du site. */
export async function preparerDepotIntervenant(): Promise<{ chemin: string; jeton: string } | { erreur: string }> {
  const chemin = `intervenants/${randomBytes(12).toString("hex")}.pdf`;
  const { data, error } = await createAdminClient().storage.from("cv").createSignedUploadUrl(chemin);
  return error || !data ? { erreur: "L'envoi du CV n'est pas disponible pour le moment. Réessayez dans un instant." } : { chemin, jeton: data.token };
}

/** L'intervenant recrute : son entreprise arrive dans « Mes entreprises » (statut Recrute) et l'équipe est prévenue. */
async function entrepriseQuiRecrute(l: Lead): Promise<string | null> {
  if (!l.entreprise) return null;
  const db = createAdminClient();
  const { data: toutes } = await db.from("entreprises").select("id, nom, contact_nom, contact_email, statut");
  const existante = (toutes ?? []).find((e) => memeEntreprise(e.nom as string, l.entreprise!));
  const qui = [l.prenom, l.nom].filter(Boolean).join(" ") || l.email;
  let id = existante?.id as string | undefined;
  if (!existante) {
    const { data, error } = await db.from("entreprises").insert({
      nom: l.entreprise.slice(0, 150), statut: "recrute", origine: "Intervenant",
      contact_nom: qui, contact_fonction: "Intervenant au Campus", contact_email: l.email, contact_tel: l.telephone ?? "",
      notes: `Ajoutée automatiquement : ${qui}, intervenant (${l.formation}), recrute.`, auteur: "intervenant",
    }).select("id").single();
    if (error || !data) return null;
    id = data.id as string;
  } else {
    await db.from("entreprises").update({ statut: "recrute", ...(existante.contact_nom || existante.contact_email ? {} : { contact_nom: qui, contact_email: l.email, contact_tel: l.telephone ?? "" }) }).eq("id", id!).in("statut", ["rencontree", "en_discussion", "pas_maintenant"]);
  }
  const maintenant = new Date().toISOString();
  const dest = await emailsEquipe();
  await db.from("echanges").insert(dest.map((auteur) => ({
    entreprise_id: id, type: "autre", date_echange: maintenant, auteur,
    resume: `🎯 ${qui} (intervenant · ${l.formation}) recrute chez ${l.entreprise}. Contact : ${l.email}${l.telephone ? ` · ${l.telephone}` : ""}`,
    action: `🎯 ${l.entreprise} recrute (intervenant ${qui}) : à traiter`, action_le: maintenant.slice(0, 10), action_a: maintenant,
  })));
  return id ?? null;
}

/** Questionnaire « Intervenant » : arrive dans le carnet d'adresses des intervenants (hors chiffres du recrutement). */
export async function deposerIntervenant(f: FormData): Promise<{ ok?: boolean; erreur?: string; besoin?: string }> {
  if (txt(f, "site_web")) return { ok: true }; // robot
  const email = txt(f, "email", 150).toLowerCase();
  const cv = txt(f, "cv_chemin", 120);
  const situation = txt(f, "situation", 20);
  const ligne = {
    prenom: txt(f, "prenom", 80),
    nom: txt(f, "nom", 80),
    email,
    telephone: txt(f, "telephone", 30),
    formation: [...f.getAll("specialites").map(String).filter((x) => (SPECIALITES as readonly string[]).includes(x)), txt(f, "autre_specialite", 80)].filter(Boolean).join(" · "),
    situation: situation in SITUATIONS_INTERVENANT ? situation : "",
    entreprise: txt(f, "entreprise", 150),
    recrute: f.get("recrute") === "on",
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
    return { erreur: "Merci de remplir votre prénom, votre nom, un email valide, au moins une spécialité et quelques lignes de présentation." };
  if (ligne.recrute && !ligne.entreprise) return { erreur: "Vous recrutez : indiquez le nom de votre entreprise." };
  if (!ligne.consentement) return { erreur: "Merci de cocher la case d'accord pour que nous puissions conserver votre candidature." };
  const db = createAdminClient();
  const { data: deja } = await db.from("leads").select("id, cv_chemin").eq("email", email).eq("categorie", "intervenant").limit(1);
  let { data, error } = deja?.[0]
    ? await db.from("leads").update({ ...ligne, cv_chemin: ligne.cv_chemin ?? deja[0].cv_chemin, updated_at: new Date().toISOString() }).eq("id", deja[0].id).select("*").single()
    : await db.from("leads").insert(ligne).select("*").single();
  if (error && /situation|entreprise|recrute/.test(error.message)) {
    // Base pas encore à jour : on garde l'essentiel
    const { situation: _s, entreprise: _e, recrute: _r, ...base } = ligne;
    void _s; void _e; void _r;
    ({ data, error } = await db.from("leads").insert({ ...base, message: [base.message, ligne.entreprise && `Entreprise : ${ligne.entreprise}`, ligne.recrute && "Recrute"].filter(Boolean).join("\n\n") }).select("*").single());
  }
  if (error || !data) return { erreur: "Le service est momentanément indisponible. Merci de réessayer dans quelques minutes." };
  const l = data as Lead;
  await notifierContact(l).catch(() => undefined);
  if (!ligne.recrute) return { ok: true };
  const entrepriseId = await entrepriseQuiRecrute(l).catch(() => null);
  if (!entrepriseId) return { ok: true };
  await db.from("leads").update({ entreprise_id: entrepriseId }).eq("id", l.id);
  const besoin = await lienBesoinEntreprise(entrepriseId).catch(() => null);
  return { ok: true, besoin: besoin ?? undefined };
}

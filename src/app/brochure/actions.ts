"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { brochurePour, envoyerBrochure, estProspect, notifierContact, notifierNouveauLead, notifierSuiviLead, type Lead } from "@/lib/leads";
import { ecoleParCode } from "@/lib/ecoles";
import { evenementParCode } from "@/lib/evenements";

const txt = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

/** Valeur du rectangle « Alumni » dans « Diplôme visé ». */
const ALUMNI = "alumni-ancien";

async function alumniARecontacter(f: FormData, d: { prenom: string; nom: string; email: string; telephone: string; consentement: boolean }, retour: URLSearchParams) {
  const diplome = txt(f, "diplome_alumni", 60);
  const promo = Number(f.get("promo_alumni"));
  if (!d.prenom || !d.nom || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) || !diplome) {
    retour.set("erreur", "alumni");
    retour.set("formation", ALUMNI);
    redirect(`/brochure?${retour}`);
  }
  if (!d.consentement) { retour.set("erreur", "rgpd"); redirect(`/brochure?${retour}`); }
  const db = createAdminClient();
  const ligne = {
    prenom: d.prenom, nom: d.nom, email: d.email, telephone: d.telephone, consentement: true,
    formation: diplome, annee_rentree: null, categorie: "alumni", origine: "Alumni (formulaire brochure)",
    message: Number.isInteger(promo) && promo > 1990 && promo < 2100 ? `Promo ${promo}` : "",
  };
  const { data: deja } = await db.from("leads").select("id").eq("email", d.email).eq("categorie", "alumni").limit(1);
  const { data, error } = deja?.[0]
    ? await db.from("leads").update({ ...ligne, updated_at: new Date().toISOString() }).eq("id", deja[0].id).select("*").single()
    : await db.from("leads").insert(ligne).select("*").single();
  if (error || !data) { retour.set("erreur", "base"); redirect(`/brochure?${retour}`); }
  await notifierContact(data as Lead).catch(() => undefined);
  redirect(`/brochure?${new URLSearchParams({ merci: "1", prenom: d.prenom, alumni: "1" })}`);
}

/** Formulaire public « Recevoir la brochure » : crée (ou met à jour) le lead, envoie la brochure, prévient l'équipe. */
export async function demanderBrochure(f: FormData) {
  const retour = new URLSearchParams({ formation: txt(f, "formation", 120), ecole: txt(f, "ecole", 40), origine: txt(f, "origine", 60), evenement: txt(f, "evenement", 16) });
  if (txt(f, "site_web")) redirect("/brochure?merci=1"); // robot : champ caché rempli
  const email = txt(f, "email", 150).toLowerCase();
  const donnees = {
    prenom: txt(f, "prenom", 80),
    nom: txt(f, "nom", 80),
    email,
    telephone: txt(f, "telephone", 30),
    formation: txt(f, "formation", 120),
    annee_rentree: (() => { const a = Number(f.get("annee_rentree")); return Number.isInteger(a) && a >= 2020 && a <= 2100 ? a : null; })(),
    consentement: f.get("consentement") === "on",
  };
  // Alumni : pas de brochure, l'équipe le recontacte (ne compte dans aucun chiffre du recrutement)
  if (donnees.formation === ALUMNI) return alumniARecontacter(f, donnees, retour);
  if (!donnees.prenom || !donnees.nom || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !donnees.formation || !donnees.annee_rentree) {
    retour.set("erreur", "champs");
    redirect(`/brochure?${retour}`);
  }
  if (!donnees.consentement) {
    retour.set("erreur", "rgpd");
    redirect(`/brochure?${retour}`);
  }
  const db = createAdminClient();
  const ecole = txt(f, "ecole", 40) ? await ecoleParCode(txt(f, "ecole", 40)).catch(() => null) : null;
  // Venu par le QR code d'un événement : l'origine est le nom de l'événement
  const evenement = txt(f, "evenement", 16) ? await evenementParCode(txt(f, "evenement", 16)).catch(() => null) : null;
  const origine = evenement?.nom || txt(f, "origine", 60) || "Brochure (site de l'école)";

  // Même email déjà connu : on met la fiche à jour au lieu de créer un doublon
  const { data: memes } = await db.from("leads").select("*").eq("email", email).order("created_at", { ascending: false }).limit(10);
  const existant = ((memes ?? []) as Lead[]).find(estProspect) ?? null;
  let lead: Lead | null = null;
  if (existant) {
    const { data } = await db.from("leads").update({ ...donnees, updated_at: new Date().toISOString() }).eq("id", existant.id).select("*").single();
    lead = data as Lead;
    const quoi = evenement ? `Rencontré à l'événement « ${evenement.nom} » (${donnees.formation}, rentrée ${donnees.annee_rentree}).` : `A redemandé la brochure (${donnees.formation}, rentrée ${donnees.annee_rentree}).`;
    await db.from("echanges").insert({ lead_id: existant.id, type: "autre", resume: quoi, auteur: "" });
    // Le lead revient : on prévient la personne qui le suit (ou toute l'équipe s'il n'est attribué à personne)
    await notifierSuiviLead(existant, `🧲 ${donnees.prenom} ${donnees.nom} : ${quoi}`, `🧲 ${donnees.prenom} ${donnees.nom} est revenu(e) : ${evenement ? evenement.nom : "brochure redemandée"} → à recontacter`).catch(() => undefined);
  } else {
    let { data, error } = await db.from("leads").insert({ ...donnees, origine, ecole_id: ecole?.id ?? null, ...(evenement ? { evenement_id: evenement.id } : {}) }).select("*").single();
    if (error && evenement) ({ data, error } = await db.from("leads").insert({ ...donnees, origine, ecole_id: ecole?.id ?? null }).select("*").single());
    if (error || !data) {
      retour.set("erreur", "base");
      redirect(`/brochure?${retour}`);
    }
    lead = data as Lead;
    try { await notifierNouveauLead(lead); } catch { /* jamais bloquant */ }
  }
  const lien = await brochurePour(donnees.formation, lead?.ecole_id ?? ecole?.id);
  const envoye = lead && lien ? await envoyerBrochure(lead, lien).catch(() => false) : false;
  const merci = new URLSearchParams({ merci: "1", prenom: donnees.prenom, ...(envoye ? { envoye: "1" } : {}), ...(lien && !envoye ? { lien } : {}) });
  redirect(`/brochure?${merci}`);
}

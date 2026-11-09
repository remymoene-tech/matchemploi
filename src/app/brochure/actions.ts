"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { brochurePour, envoyerBrochure, notifierNouveauLead, type Lead } from "@/lib/leads";
import { ecoleParCode } from "@/lib/ecoles";

const txt = (f: FormData, k: string, max = 200) => String(f.get(k) ?? "").trim().slice(0, max);

/** Formulaire public « Recevoir la brochure » : crée (ou met à jour) le lead, envoie la brochure, prévient l'équipe. */
export async function demanderBrochure(f: FormData) {
  const retour = new URLSearchParams({ formation: txt(f, "formation", 120), ecole: txt(f, "ecole", 40), origine: txt(f, "origine", 60) });
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
  const origine = txt(f, "origine", 60) || "Brochure (site de l'école)";

  // Même email déjà connu : on met la fiche à jour au lieu de créer un doublon
  const { data: existant } = await db.from("leads").select("*").eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let lead: Lead | null = null;
  if (existant) {
    const { data } = await db.from("leads").update({ ...donnees, updated_at: new Date().toISOString() }).eq("id", existant.id).select("*").single();
    lead = data as Lead;
    await db.from("echanges").insert({ lead_id: existant.id, type: "autre", resume: `A redemandé la brochure (${donnees.formation}, rentrée ${donnees.annee_rentree}).`, auteur: "" });
  } else {
    const { data, error } = await db.from("leads").insert({ ...donnees, origine, ecole_id: ecole?.id ?? null }).select("*").single();
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

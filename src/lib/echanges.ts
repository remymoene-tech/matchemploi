import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const TYPES_ECHANGE = [
  { id: "telephone", label: "Téléphone", icone: "📞" },
  { id: "email", label: "Email", icone: "✉️" },
  { id: "sms", label: "SMS", icone: "💬" },
  { id: "rdv", label: "Rendez-vous", icone: "🤝" },
  { id: "autre", label: "Autre", icone: "📝" },
] as const;

export type Echange = {
  id: string;
  candidat_id: string | null;
  entreprise_id?: string | null;
  type: string;
  date_echange: string;
  resume: string;
  action: string;
  action_le: string | null;
  action_a?: string | null;
  action_faite: boolean;
  auteur: string;
};

const txt = (f: FormData, k: string, max = 4000) => String(f.get(k) ?? "").trim().slice(0, max);

/**
 * « 2026-11-05T14:30 » saisi dans le navigateur → instant exact, en tenant compte du fuseau
 * de la personne (tz = getTimezoneOffset() du navigateur, en minutes).
 */
export function localVersISO(local: string, tz: number): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 9), +(m[5] ?? 0));
  return new Date(utc + (Number.isFinite(tz) ? tz : -60) * 60000).toISOString();
}

/** Ajoute un échange pour un candidat, ou pour une entreprise ({ entreprise: id }). */
export async function ajouterEchange(cible: string | { entreprise: string } | { lead: string }, f: FormData, auteur: string): Promise<{ erreur?: string }> {
  const type = txt(f, "type", 20);
  let resume = txt(f, "resume");
  if (!resume) return { erreur: "Écris ce qui s'est dit." };
  // Email écrit dans « Noter un échange » (souvent depuis un modèle) : il part depuis le site
  if (type === "email" && f.get("envoyer") === "1") {
    const r = await envoyerEmailEchange(cible, txt(f, "sujet", 200), resume, auteur);
    if (r.erreur) return r;
    resume = r.resume!;
  }
  const tz = Number(f.get("tz") ?? -60);
  const quand = localVersISO(txt(f, "date_echange", 30), tz);
  const relanceA = localVersISO(txt(f, "action_a", 30), tz);
  const { error } = await createAdminClient().from("echanges").insert({
    ...(typeof cible === "string" ? { candidat_id: cible } : "lead" in cible ? { lead_id: cible.lead } : { entreprise_id: cible.entreprise }),
    type: TYPES_ECHANGE.some((t) => t.id === type) ? type : "autre",
    date_echange: quand ?? new Date().toISOString(),
    resume,
    action: txt(f, "action", 500),
    action_le: relanceA ? relanceA.slice(0, 10) : null,
    action_a: relanceA,
    auteur,
  });
  if (error) return { erreur: /echanges|entreprise|candidat_id|lead_id/.test(error.message) ? "La base n'est pas à jour : exécute la mise à jour SQL de la page /diagnostic." : "L'enregistrement a échoué." };
  return {};
}

async function envoyerEmailEchange(cible: string | { entreprise: string } | { lead: string }, sujet: string, texte: string, auteur: string): Promise<{ erreur?: string; resume?: string }> {
  if (!sujet) return { erreur: "Indique l'objet de l'email." };
  const base = createAdminClient();
  const { data } = typeof cible === "string"
    ? await base.from("candidats").select("email").eq("user_id", cible).maybeSingle()
    : "lead" in cible
      ? await base.from("leads").select("email").eq("id", cible.lead).maybeSingle()
      : await base.from("entreprises").select("email:contact_email").eq("id", cible.entreprise).maybeSingle();
  const dest = String((data as { email?: string } | null)?.email ?? "").trim();
  if (!dest) return { erreur: "Pas d'adresse email sur la fiche : l'email ne peut pas partir." };
  const { envoyerEmail, moyenEnvoi } = await import("@/lib/email");
  const { emailPro } = await import("@/lib/email-pro");
  if (!moyenEnvoi()) return { erreur: "L'envoi d'emails n'est pas configuré (voir /diagnostic)." };
  const { nomPersonne, personnesEquipe } = await import("@/lib/equipe");
  const moi = (await personnesEquipe().catch(() => [])).find((p) => p.email === auteur.toLowerCase());
  const ok = await envoyerEmail(dest, sujet, emailPro(texte, { vous: typeof cible === "object" && "entreprise" in cible }), {
    nomExpediteur: `${nomPersonne(moi, auteur) || "L'équipe"} · Campus Magnus`, repondreA: auteur || undefined, texte,
  });
  if (!ok) return { erreur: "L'email n'a pas pu partir : vérifie l'envoi d'emails dans /diagnostic. Rien n'a été enregistré." };
  return { resume: `✉️ Email envoyé à ${dest} · Objet : ${sujet}\n\n${texte}`.slice(0, 5000) };
}

/** Note automatiquement un email envoyé depuis MagnusMatch (n'échoue jamais). */
export async function noterEmailEnvoye(candidatId: string, auteur: string, destinataire: string, objet: string, cible: string) {
  try {
    await createAdminClient().from("echanges").insert({
      candidat_id: candidatId,
      type: "email",
      resume: `Email envoyé depuis MagnusMatch ${cible === "entreprise" ? "à l'entreprise" : "à l'étudiant"} (${destinataire}) : « ${objet} »`,
      auteur,
    });
  } catch {
    /* le journal ne doit jamais bloquer l'envoi */
  }
}

export async function echangesDuCandidat(candidatId: string): Promise<Echange[]> {
  const { data } = await createAdminClient().from("echanges").select("*").eq("candidat_id", candidatId).order("date_echange", { ascending: false }).limit(200);
  return (data ?? []) as Echange[];
}

export async function echangesDuLead(leadId: string): Promise<Echange[]> {
  const { data } = await createAdminClient().from("echanges").select("*").eq("lead_id", leadId).order("date_echange", { ascending: false }).limit(200);
  return (data ?? []) as Echange[];
}

export async function echangesDeLEntreprise(entrepriseId: string): Promise<Echange[]> {
  const { data } = await createAdminClient().from("echanges").select("*").eq("entreprise_id", entrepriseId).order("date_echange", { ascending: false }).limit(200);
  return (data ?? []) as Echange[];
}

export type Relance = { id: string; candidat_id: string | null; entreprise_id: string | null; lead_id?: string | null; nom: string; action: string; action_a: string | null; action_le: string | null; type: string; auteur: string };

/** Lien vers la fiche concernée (onglet Échanges). */
export const lienRelance = (r: Pick<Relance, "candidat_id" | "entreprise_id"> & { lead_id?: string | null; action?: string }, baseCandidats = "/admin/candidats") =>
  r.lead_id ? `/admin/leads/${r.lead_id}?onglet=echanges` : r.entreprise_id ? (r.action?.startsWith("📋") ? `/admin/entreprises/${r.entreprise_id}#besoins` : `/admin/entreprises/${r.entreprise_id}?onglet=echanges`)
    : `${baseCandidats}/${r.candidat_id}?onglet=${r.action?.startsWith("🎯") ? "prospections" : "echanges"}`;

/** Relances non faites d'un recruteur (les siennes), ou de toute l'équipe si auteur = null. */
export async function relancesDe(auteur: string | null): Promise<Relance[]> {
  const lire = async (champs: string) => {
    let q = createAdminClient().from("echanges").select(champs).eq("action_faite", false);
    if (auteur) q = q.eq("auteur", auteur);
    return q.neq("action", "").order("action_a", { ascending: true, nullsFirst: false }).limit(300);
  };
  // Avec les entreprises si la base est à jour, sinon seulement les candidats
  let { data, error } = await lire("id, candidat_id, entreprise_id, lead_id, action, action_a, action_le, type, auteur, candidats(nom, email), entreprises(nom), leads(prenom, nom, email)");
  if (error) ({ data, error } = await lire("id, candidat_id, entreprise_id, action, action_a, action_le, type, auteur, candidats(nom, email), entreprises(nom)"));
  if (error) ({ data, error } = await lire("id, candidat_id, action, action_a, action_le, type, auteur, candidats(nom, email)"));
  if (error) return [];
  return ((data ?? []) as unknown as Record<string, unknown>[]).filter((r) => r.action).map((r) => {
    const c = r.candidats as { nom: string; email: string } | null;
    const e = r.entreprises as { nom: string } | null | undefined;
    const entreprise_id = (r.entreprise_id as string | null | undefined) ?? null;
    const lead_id = (r.lead_id as string | null | undefined) ?? null;
    const l = r.leads as { prenom: string; nom: string; email: string } | null | undefined;
    return {
      id: r.id as string, candidat_id: (r.candidat_id as string | null) ?? null, entreprise_id, lead_id,
      nom: lead_id ? `🧲 ${[l?.prenom, l?.nom].filter(Boolean).join(" ") || l?.email || "Lead"}` : entreprise_id ? `🏢 ${e?.nom || "Entreprise"}` : c?.nom || c?.email || "Candidat",
      action: r.action as string, action_a: r.action_a as string | null, action_le: r.action_le as string | null, type: r.type as string, auteur: (r.auteur as string) ?? "",
    };
  });
}

/** Moment d'échéance d'une relance (date + heure, ou la date à 9 h). */
export const echeance = (r: { action_a?: string | null; action_le?: string | null }) =>
  r.action_a ? new Date(r.action_a) : r.action_le ? new Date(`${r.action_le}T08:00:00Z`) : null;

/** Heure actuelle en millisecondes (isolée pour les composants serveur). */
export const maintenantMs = () => Date.now();

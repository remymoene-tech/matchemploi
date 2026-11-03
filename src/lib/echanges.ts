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
  candidat_id: string;
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

export async function ajouterEchange(candidatId: string, f: FormData, auteur: string): Promise<{ erreur?: string }> {
  const type = txt(f, "type", 20);
  const resume = txt(f, "resume");
  if (!resume) return { erreur: "Écris ce qui s'est dit." };
  const tz = Number(f.get("tz") ?? -60);
  const quand = localVersISO(txt(f, "date_echange", 30), tz);
  const relanceA = localVersISO(txt(f, "action_a", 30), tz);
  const { error } = await createAdminClient().from("echanges").insert({
    candidat_id: candidatId,
    type: TYPES_ECHANGE.some((t) => t.id === type) ? type : "autre",
    date_echange: quand ?? new Date().toISOString(),
    resume,
    action: txt(f, "action", 500),
    action_le: relanceA ? relanceA.slice(0, 10) : null,
    action_a: relanceA,
    auteur,
  });
  if (error) return { erreur: /echanges/.test(error.message) ? "La base n'est pas à jour : exécute la mise à jour SQL de la page /diagnostic." : "L'enregistrement a échoué." };
  return {};
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

export type Relance = { id: string; candidat_id: string; nom: string; action: string; action_a: string | null; action_le: string | null; type: string; auteur: string };

/** Relances non faites d'un recruteur (les siennes), ou de toute l'équipe si auteur = null. */
export async function relancesDe(auteur: string | null): Promise<Relance[]> {
  let q = createAdminClient()
    .from("echanges")
    .select("id, candidat_id, action, action_a, action_le, type, auteur, candidats(nom, email)")
    .eq("action_faite", false);
  if (auteur) q = q.eq("auteur", auteur);
  const { data, error } = await q
    .neq("action", "")
    .order("action_a", { ascending: true, nullsFirst: false })
    .limit(300);
  if (error) return [];
  return (data ?? []).filter((r) => r.action).map((r) => {
    const c = r.candidats as unknown as { nom: string; email: string } | null;
    return { id: r.id, candidat_id: r.candidat_id, nom: c?.nom || c?.email || "Candidat", action: r.action, action_a: r.action_a, action_le: r.action_le, type: r.type, auteur: r.auteur ?? "" };
  });
}

/** Moment d'échéance d'une relance (date + heure, ou la date à 9 h). */
export const echeance = (r: { action_a?: string | null; action_le?: string | null }) =>
  r.action_a ? new Date(r.action_a) : r.action_le ? new Date(`${r.action_le}T08:00:00Z`) : null;

/** Heure actuelle en millisecondes (isolée pour les composants serveur). */
export const maintenantMs = () => Date.now();

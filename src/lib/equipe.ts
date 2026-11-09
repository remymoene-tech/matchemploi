import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Équipe du tableau de bord.
 * - L'administrateur (ADMIN_EMAILS dans Vercel) a tous les droits, dont le ⚙️.
 * - Les chargé(e)s d'admission et de relations entreprises, ajoutés par l'administrateur,
 *   ont accès à tout le tableau de bord sauf aux réglages du site (⚙️).
 */
/** Anciens rôles (avant les accès à la carte) : servent seulement à donner des accès par défaut. */
export const ROLES_EQUIPE = [
  { id: "admission", label: "Chargé(e) d'admission", icone: "🎓" },
  { id: "entreprises", label: "Chargé(e) relations entreprises", icone: "🏢" },
] as const;

/** Postes proposés dans ⚙️ (« Autre » : l'administrateur écrit l'intitulé). */
export const POSTES = [
  "Chargé(e) admissions et relations entreprises",
  "Responsable admissions et relations entreprises",
  "Chargé(e) pédagogie",
  "Responsable pédagogie",
  "Directrice marketing et communication",
  "Chargé(e) marketing et communication",
] as const;

/** Intitulé de l'administrateur. */
export const POSTE_ADMIN = "Directeur campus";

/** Accès qu'on peut donner à chaque membre de l'équipe (cases à cocher dans ⚙️). */
export const ACCES = [
  { id: "accueil", label: "Chiffres et statistiques", icone: "🏠", aide: "Chiffres clés et graphiques de l'Accueil (l'activité de l'équipe est visible par tous)" },
  { id: "leads", label: "Leads", icone: "🧲", aide: "Demandes de brochure, entretiens d'admission, attribution des leads" },
  { id: "candidats", label: "Candidats", icone: "👥", aide: "Fiches, admissions, CV, tests, briefing, entretiens" },
  { id: "alumni", label: "Alumni", icone: "🎓", aide: "Parcours des alumni et leurs propositions d'aide" },
  { id: "entreprises", label: "Entreprises et offres", icone: "🏢", aide: "Fiches entreprises, offres, annonces d'alumni à valider" },
  { id: "planning", label: "Planning", icone: "📅", aide: "Entretiens programmés" },
  { id: "evenements", label: "Événements", icone: "🎪", aide: "JPO, salons, QR codes" },
  { id: "intervenants", label: "Intervenants", icone: "🧑‍🏫", aide: "Carnet d'adresses des intervenants et leurs CV · réservé aux postes de pédagogie" },
] as const;

export type Acces = (typeof ACCES)[number]["id"];
export const TOUS_ACCES = ACCES.map((a) => a.id) as Acces[];

const PAR_DEFAUT: Record<string, Acces[]> = {
  admission: ["accueil", "leads", "candidats", "alumni", "planning", "evenements"],
  entreprises: ["accueil", "entreprises", "candidats", "alumni", "planning", "evenements"],
};

export type Membre = { id: string; email: string; nom: string; role: string; poste?: string | null; acces?: unknown; actif: boolean; created_at: string; retire_le: string | null };
export type Droits = { admin: boolean; acces: Acces[]; poste: string };

/** Accès réels d'un membre (ses cases cochées, ou ceux de son ancien rôle). */
/** Le CRM intervenants est réservé à la pédagogie (et à l'administrateur, directeur campus). */
export const estPedagogie = (poste?: string | null) => /p[ée]dagog/i.test(poste ?? "");

export function accesDe(m: Pick<Membre, "role" | "acces"> & { poste?: string | null }): Acces[] {
  const liste = Array.isArray(m.acces) ? m.acces.filter((a): a is Acces => TOUS_ACCES.includes(a as Acces)) : PAR_DEFAUT[m.role] ?? ["accueil"];
  return liste.filter((a) => a !== "intervenants" || estPedagogie(m.poste));
}

export const roleEquipe = (id: string) => ROLES_EQUIPE.find((r) => r.id === id);

export function emailsAdmins() {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
}

export function estSuperAdmin(email: string | null | undefined) {
  return !!email && emailsAdmins().includes(email.toLowerCase());
}

/** Droits de la personne dans l'équipe (null si elle n'en fait pas partie ou si son accès est coupé). */
export const droitsDe = cache(async (email: string | null | undefined): Promise<Droits | null> => {
  if (!email) return null;
  if (estSuperAdmin(email)) return { admin: true, acces: TOUS_ACCES, poste: POSTE_ADMIN };
  try {
    const db = createAdminClient();
    const cle = email.trim().toLowerCase();
    const r1 = await db.from("equipe").select("role, actif, poste, acces").eq("email", cle).limit(1);
    const lignes = r1.error ? (await db.from("equipe").select("role, actif").eq("email", cle).limit(1)).data : r1.data;
    const m = lignes?.[0] as Membre | undefined;
    return m?.actif ? { admin: false, acces: accesDe(m), poste: m.poste || roleEquipe(m.role)?.label || "" } : null;
  } catch {
    return null;
  }
});

/** « admin », « equipe » ou null. */
export async function roleDe(email: string | null | undefined): Promise<"admin" | "equipe" | null> {
  const d = await droitsDe(email);
  return d ? (d.admin ? "admin" : "equipe") : null;
}

export const peut = (d: Droits | null, ...acces: Acces[]) => !!d && (d.admin || acces.some((a) => d.acces.includes(a)));

export async function listeEquipe(): Promise<Membre[] | null> {
  const { data, error } = await createAdminClient().from("equipe").select("*").order("actif", { ascending: false }).order("nom");
  return error ? null : ((data ?? []) as Membre[]);
}

/**
 * Qui reçoit les notifications 🔔 : l'administrateur, et les membres actifs qui ont l'un des accès concernés
 * (tous les membres si aucun accès n'est précisé).
 */
export async function emailsEquipe(acces?: Acces[]): Promise<string[]> {
  const admins = emailsAdmins();
  try {
    const db = createAdminClient();
    const r1 = await db.from("equipe").select("email, role, acces").eq("actif", true);
    const lignes = r1.error ? (await db.from("equipe").select("email, role").eq("actif", true)).data : r1.data;
    const membres = ((lignes ?? []) as Membre[]).filter((m) => !acces?.length || acces.some((a) => accesDe(m).includes(a)));
    return [...new Set([...admins, ...membres.map((m) => m.email.toLowerCase())])];
  } catch {
    return admins;
  }
}

export type Personne = { email: string; nom: string; poste: string };

/** « remy.moene@… » → « Remy Moene » (quand on n'a pas de nom). */
export const nomDepuisEmail = (email: string) =>
  email.split("@")[0].split(/[._-]+/).filter(Boolean).map((m) => m[0]!.toUpperCase() + m.slice(1)).join(" ");

/** Tout le monde dans l'équipe (administrateur + membres actifs), pour attribuer un lead. */
export async function personnesEquipe(): Promise<Personne[]> {
  const admins: Personne[] = emailsAdmins().map((email) => ({ email, nom: nomDepuisEmail(email), poste: POSTE_ADMIN }));
  const membres = ((await listeEquipe()) ?? []).filter((m) => m.actif).map((m) => ({ email: m.email.toLowerCase(), nom: m.nom, poste: m.poste || roleEquipe(m.role)?.label || "" }));
  return [...admins, ...membres.filter((m) => !admins.some((a) => a.email === m.email))];
}

export const nomPersonne = (p: Personne | undefined, email?: string | null) => (p ? p.nom || nomDepuisEmail(p.email) : email ? nomDepuisEmail(email) : "");

/** Pédagogie et direction (intervenants) : l'administrateur et les membres dont le poste parle de pédagogie ou de direction. */
export async function emailsPedagogieDirection(): Promise<string[]> {
  const admins = emailsAdmins();
  const membres = ((await listeEquipe().catch(() => null)) ?? []).filter((m) => m.actif && estPedagogie(m.poste));
  return [...new Set([...admins, ...membres.map((m) => m.email.toLowerCase())])];
}

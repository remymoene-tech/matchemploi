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

/** Accès qu'on peut donner à chaque membre de l'équipe (cases à cocher dans ⚙️). */
export const ACCES = [
  { id: "accueil", label: "Accueil et chiffres", icone: "🏠", aide: "Statistiques et graphiques" },
  { id: "leads", label: "Leads", icone: "🧲", aide: "Demandes de brochure, entretiens d'admission · notifié des nouveaux leads" },
  { id: "candidats", label: "Candidats", icone: "👥", aide: "Fiches, admissions, CV, tests, briefing, entretiens" },
  { id: "alumni", label: "Alumni", icone: "🎓", aide: "Parcours des alumni · notifié quand un alumni propose son aide" },
  { id: "entreprises", label: "Entreprises et offres", icone: "🏢", aide: "Fiches entreprises, offres, annonces d'alumni · notifié quand une entreprise recrute" },
  { id: "planning", label: "Planning", icone: "📅", aide: "Entretiens programmés" },
  { id: "evenements", label: "Événements", icone: "🎪", aide: "JPO, salons, QR codes" },
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
export function accesDe(m: Pick<Membre, "role" | "acces">): Acces[] {
  if (Array.isArray(m.acces)) return m.acces.filter((a): a is Acces => TOUS_ACCES.includes(a as Acces));
  return PAR_DEFAUT[m.role] ?? ["accueil"];
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
  if (estSuperAdmin(email)) return { admin: true, acces: TOUS_ACCES, poste: "Administrateur" };
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

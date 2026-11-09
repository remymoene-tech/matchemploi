import "server-only";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";
import { estAdmis } from "@/lib/admission";
import { anneeLabel, INTITULES } from "@/lib/formations";
import { contratLabel, type Candidat } from "@/lib/types";

/** Carte de visite numérique d'un candidat admis : un QR code mène à /carte/[jeton]. */
export type OptionsCarte = { tel: boolean; email: boolean; linkedin: boolean; recherche: string; active: boolean };

export type CandidatCarte = Candidat & {
  carte_jeton?: string | null;
  carte_options?: Partial<OptionsCarte> | null;
  carte_vues?: number | null;
  carte_vue_le?: string | null;
  /** Membre de l'équipe (ex. « Directeur campus ») : son poste remplace la formation sur la carte. */
  poste_equipe?: string | null;
};

/** Ajoute le poste si la personne fait partie de l'équipe du Campus. */
export async function avecPoste<T extends CandidatCarte>(c: T): Promise<T> {
  const { droitsDe } = await import("@/lib/equipe");
  const d = await droitsDe(c.email).catch(() => null);
  return d?.poste ? { ...c, poste_equipe: d.poste } : c;
}

export const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "https://magnusmatch.vercel.app";
export const lienCarte = (jeton: string) => `${SITE()}/carte/${jeton}`;
const nouveauJeton = () => randomBytes(9).toString("base64url");

/** « Recherche une alternance · Commerce · Arles et alentours », proposé par défaut. */
export function rechercheParDefaut(c: Candidat) {
  const id = c.contrats?.includes("alternance") || !c.contrats?.length ? "alternance" : c.contrats[0]!;
  const lab = contratLabel(id);
  const contrat = /^[A-Z]{2,}$/.test(lab) ? lab : lab.toLowerCase();
  const quoi = [c.poste_vise, c.ville ? `${c.ville} et alentours` : ""].filter(Boolean).join(" · ");
  return `Recherche ${id === "alternance" ? "une" : "un"} ${contrat}${quoi ? `\n${quoi}` : ""}`.slice(0, 160);
}

export function optionsCarte(c: CandidatCarte): OptionsCarte {
  const o = c.carte_options ?? {};
  return {
    tel: o.tel ?? !!c.telephone,
    email: o.email ?? true,
    linkedin: o.linkedin ?? !!c.linkedin_url,
    recherche: typeof o.recherche === "string" ? o.recherche : c.statut_admission === "alumni" || c.poste_equipe ? "" : rechercheParDefaut(c),
    active: o.active ?? true,
  };
}

/** « Bachelor EGC · 2e année » */
const NOM_COURT: Record<string, string> = { EGC: "Bachelor EGC", GUC: "GUC · Bac+2", AMLHR: "AMLHR · Bac+2" };
export function formationCarte(c: Candidat & { poste_equipe?: string | null }) {
  if (c.poste_equipe) return c.poste_equipe;
  const nom = NOM_COURT[c.formation] ?? c.formation;
  if (c.statut_admission === "alumni") return ["Alumni", nom, c.diplome_annee ? `promo ${c.diplome_annee}` : ""].filter(Boolean).join(" · ");
  return [nom, c.annee_cursus ? anneeLabel(c.annee_cursus) : ""].filter(Boolean).join(" · ");
}

/** Intitulé complet de la formation (ex. « Gestionnaire d'Unité Commerciale »), pour la carte. */
export const intituleFormation = (c: Candidat) => (INTITULES[c.formation] ?? "").split("·")[0].trim();

export const initiales = (nom: string) =>
  nom.split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join("") || "?";

/** Donne le jeton de la carte (le crée au premier passage). null si la colonne n'existe pas encore. */
export async function jetonCarte(c: CandidatCarte): Promise<string | null> {
  if (c.carte_jeton) return c.carte_jeton;
  if (!("carte_jeton" in c)) return null;
  const jeton = nouveauJeton();
  const { error } = await createAdminClient().from("candidats").update({ carte_jeton: jeton }).eq("user_id", c.user_id);
  return error ? null : jeton;
}

export async function changerJetonCarte(userId: string) {
  await createAdminClient().from("candidats").update({ carte_jeton: nouveauJeton() }).eq("user_id", userId);
}

/** Candidat dont la carte est publique (admis et carte active), sinon null. */
export async function candidatParCarte(jeton: string): Promise<CandidatCarte | null> {
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(jeton)) return null;
  const { data } = await createAdminClient().from("candidats").select("*").eq("carte_jeton", jeton).maybeSingle<CandidatCarte>();
  const c = data ? await avecPoste(data) : null;
  if (!c || (!c.poste_equipe && !estAdmis(c)) || !optionsCarte(c).active) return null;
  return c;
}

export async function compterVue(c: CandidatCarte) {
  await createAdminClient().from("candidats").update({ carte_vues: (c.carte_vues ?? 0) + 1, carte_vue_le: new Date().toISOString() }).eq("user_id", c.user_id);
}

export const qrCarte = (jeton: string, taille = 640) =>
  QRCode.toDataURL(lienCarte(jeton), { width: taille, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });

/** Fiche contact au format vCard 3.0 (comprise par iPhone, Android, Outlook…). */
export function vcard(c: CandidatCarte) {
  const o = optionsCarte(c);
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const mots = c.nom.trim().split(/\s+/);
  const prenom = mots.length > 1 ? mots.slice(0, -1).join(" ") : mots[0] ?? "";
  const nom = mots.length > 1 ? mots[mots.length - 1]! : "";
  const formation = formationCarte(c);
  const lignes = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${esc(nom)};${esc(prenom)};;;`,
    `FN:${esc(c.nom.trim() || c.email)}`,
    "ORG:Campus Magnus",
    formation ? `TITLE:${esc(c.poste_equipe || c.statut_admission === "alumni" ? formation : `Étudiant(e) ${formation}`)}` : "",
    o.tel && c.telephone ? `TEL;TYPE=CELL:${esc(c.telephone)}` : "",
    o.email ? `EMAIL;TYPE=INTERNET:${esc(c.email)}` : "",
    o.linkedin && c.linkedin_url ? `URL:${esc(c.linkedin_url)}` : "",
    o.recherche ? `NOTE:${esc(o.recherche)}` : "",
    "END:VCARD",
  ];
  return lignes.filter(Boolean).join("\r\n") + "\r\n";
}

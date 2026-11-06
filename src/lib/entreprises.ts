import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Offre } from "@/lib/types";
import { lireAttentes, type Attentes } from "@/lib/attentes";

/** Entreprises rencontrées par l'équipe, avec ou sans offre. Données internes (jamais visibles des candidats). */
export const STATUTS_ENTREPRISE = [
  { id: "rencontree", label: "Rencontrée", chip: "chip-tag" },
  { id: "en_discussion", label: "En discussion", chip: "chip-tag" },
  { id: "partenaire", label: "Partenaire", chip: "chip-plus" },
  { id: "pas_maintenant", label: "Pas pour le moment", chip: "" },
] as const;

export const ORIGINES_ENTREPRISE = ["Salon ou forum", "Job dating", "Démarchage", "Recommandation", "Ancien alternant", "Autre"] as const;

export type Entreprise = {
  id: string;
  nom: string;
  secteur: string;
  ville: string;
  site: string;
  contact_nom: string;
  contact_fonction: string;
  contact_email: string;
  contact_tel: string;
  statut: string;
  origine: string;
  rencontre_le: string | null;
  notes: string;
  /** Questionnaire des besoins (même format que les attentes d'une offre). */
  attentes?: Attentes | null;
  auteur: string;
  created_at: string;
  updated_at: string;
};

const txt = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);

export function lireEntreprise(f: FormData) {
  const statut = txt(f, "statut", 30);
  const origine = txt(f, "origine", 60);
  const date = txt(f, "rencontre_le", 10);
  return {
    nom: txt(f, "nom", 150),
    secteur: txt(f, "secteur", 150),
    ville: txt(f, "ville", 150),
    site: txt(f, "site", 300),
    contact_nom: txt(f, "contact_nom", 150),
    contact_fonction: txt(f, "contact_fonction", 150),
    contact_email: txt(f, "contact_email", 150),
    contact_tel: txt(f, "contact_tel", 30),
    statut: STATUTS_ENTREPRISE.some((s) => s.id === statut) ? statut : "rencontree",
    origine: (ORIGINES_ENTREPRISE as readonly string[]).includes(origine) ? origine : "",
    rencontre_le: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    notes: txt(f, "notes", 4000),
    attentes: lireAttentes(f),
    updated_at: new Date().toISOString(),
  };
}

/** Toutes les entreprises (null si la table n'existe pas encore : mise à jour SQL à faire). */
export async function listeEntreprises(): Promise<Entreprise[] | null> {
  const { data, error } = await createAdminClient().from("entreprises").select("*").order("nom");
  return error ? null : ((data ?? []) as Entreprise[]);
}

export async function entrepriseParId(id: string): Promise<Entreprise | null> {
  const { data } = await createAdminClient().from("entreprises").select("*").eq("id", id).maybeSingle();
  return (data as Entreprise) ?? null;
}

const norme = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Offres de l'équipe rattachées à une entreprise (par lien direct, sinon par le nom). */
export function offresDe(e: Pick<Entreprise, "id" | "nom">, offres: (Offre & { entreprise_id?: string | null })[]) {
  const n = norme(e.nom);
  return offres.filter((o) => o.entreprise_id ? o.entreprise_id === e.id : !!n && norme(o.entreprise) === n);
}

export const statutEntreprise = (id: string) => STATUTS_ENTREPRISE.find((s) => s.id === id) ?? STATUTS_ENTREPRISE[0];

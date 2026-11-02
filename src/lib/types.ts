export const CONTRATS = [
  { id: "alternance", label: "Alternance" },
  { id: "cdi", label: "CDI" },
  { id: "cdd", label: "CDD" },
  { id: "interim", label: "Intérim" },
  { id: "stage", label: "Stage" },
] as const;
export type ContratId = (typeof CONTRATS)[number]["id"];
export const contratLabel = (id: string) =>
  CONTRATS.find((c) => c.id === id)?.label ?? id;

export const AVIS = [
  { id: "nouveau", label: "Nouveau" },
  { id: "interesse", label: "Ça m'intéresse" },
  { id: "postule", label: "J'ai postulé" },
  { id: "pas_interesse", label: "Pas pour moi" },
] as const;

export const SUIVIS = [
  { id: "a_traiter", label: "À traiter" },
  { id: "propose_candidat", label: "Proposé au candidat" },
  { id: "propose_entreprise", label: "Proposé à l'entreprise" },
  { id: "entretien", label: "Entretien prévu" },
  { id: "embauche", label: "Embauché" },
  { id: "refus", label: "Pas retenu" },
] as const;

export type Candidat = {
  user_id: string;
  email: string;
  nom: string;
  telephone: string;
  formation: string;
  poste_vise: string;
  contrats: string[];
  code_postal: string;
  ville: string;
  mobilite_km: number;
  permis: string;
  rythme: string;
  disponibilite: string;
  projet: string;
  cv_chemin: string | null;
  cv_texte: string;
  competences: string[];
  cv_conseils?: CvConseils | null;
  mots_cles: string;
  consentement: boolean;
  alertes_email: boolean;
  recherche_en_cours: boolean;
  derniere_recherche: string | null;
  latitude?: number | null;
  longitude?: number | null;
  code_commune?: string | null;
  updated_at: string;
};

export type Offre = {
  id: string;
  source: "partenaire" | "externe" | "france_travail";
  source_id: string | null;
  entreprise: string;
  intitule: string;
  contrat: string;
  contrat_libelle: string;
  lieu: string;
  departement: string;
  salaire: string;
  description: string;
  lien: string;
  contact_nom: string;
  contact_email: string;
  ouverte: boolean;
  publiee_le: string | null;
  updated_at: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type Correspondance = {
  candidat_id: string;
  offre_id: string;
  score: number;
  forts: string[];
  manques: string[];
  resume: string;
  avis_candidat: string;
  suivi: string;
  notifie_le: string | null;
  calcule_le: string;
};

export const SEUIL = Number(process.env.MATCH_SEUIL ?? 75);

export const sourceLabel = (s: string) =>
  s === "france_travail" ? "France Travail" : s === "externe" ? "Annonce externe" : "Entreprise partenaire";

/** Département à partir d'un code postal français (approximation suffisante pour la recherche). */
export function departementDepuisCP(cp: string): string {
  const c = cp.replace(/\s/g, "");
  if (!/^\d{5}$/.test(c)) return "";
  if (c.startsWith("97")) return c.slice(0, 3);
  if (c.startsWith("20")) return Number(c) < 20200 ? "2A" : "2B";
  return c.slice(0, 2);
}

export type CvConseils = {
  note: number;
  resume: string;
  points_forts: string[];
  ameliorations: { categorie: string; priorite: "important" | "conseillé"; conseil: string; exemple: string }[];
  mise_en_page?: { avis: string; explication: string };
  description_proposee?: string;
};

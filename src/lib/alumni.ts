/** Alumni : anciens étudiants qui gardent leur espace à vie et alimentent le CRM du Campus. */

export const SITUATIONS = [
  { id: "emploi", label: "En poste", icone: "💼" },
  { id: "alternance", label: "En alternance (autre école)", icone: "🔁" },
  { id: "etudes", label: "En poursuite d'études", icone: "📚" },
  { id: "independant", label: "À mon compte", icone: "🚀" },
  { id: "recherche", label: "En recherche d'emploi", icone: "🔎" },
] as const;

/** Situations où l'alumni travaille dans une entreprise (qu'on ajoute au CRM). */
export const AVEC_ENTREPRISE = ["emploi", "alternance", "independant"];

export const AIDES = [
  { id: "alternant", label: "Accueillir un alternant dans mon entreprise", court: "Alternant", icone: "🤝" },
  { id: "jpo", label: "Témoigner en journée portes ouvertes", court: "JPO", icone: "🎤" },
  { id: "parrain", label: "Parrainer un étudiant", court: "Parrainage", icone: "🧭" },
  { id: "job_dating", label: "Venir au job dating", court: "Job dating", icone: "🎪" },
] as const;

export type Parcours = {
  situation: string;
  poste: string;
  entreprise: string;
  ville: string;
  /** « 2029-09 » */
  depuis: string;
  aides: string[];
  entreprise_id?: string | null;
  maj_le?: string | null;
};

export const estAlumni = (c: { statut_admission?: string | null }) => c.statut_admission === "alumni";

export function lireParcours(v: unknown): Parcours | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Partial<Parcours>;
  return {
    situation: typeof p.situation === "string" ? p.situation : "",
    poste: typeof p.poste === "string" ? p.poste : "",
    entreprise: typeof p.entreprise === "string" ? p.entreprise : "",
    ville: typeof p.ville === "string" ? p.ville : "",
    depuis: typeof p.depuis === "string" ? p.depuis : "",
    aides: Array.isArray(p.aides) ? p.aides.filter((a): a is string => typeof a === "string") : [],
    entreprise_id: typeof p.entreprise_id === "string" ? p.entreprise_id : null,
    maj_le: typeof p.maj_le === "string" ? p.maj_le : null,
  };
}

export const situation = (id?: string | null) => SITUATIONS.find((s) => s.id === id);

/** « Chargée de clientèle chez Crédit Agricole » */
export function posteChez(p: Parcours | null) {
  if (!p) return "";
  if (p.situation && !AVEC_ENTREPRISE.includes(p.situation)) return [situation(p.situation)?.label, p.poste].filter(Boolean).join(" · ");
  return [p.poste, p.entreprise && `chez ${p.entreprise}`].filter(Boolean).join(" ");
}

export const moisTexte = (ym: string) => {
  if (!/^\d{4}-\d{2}$/.test(ym)) return "";
  return new Date(`${ym}-15T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
};

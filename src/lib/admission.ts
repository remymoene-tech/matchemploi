/** Statut d'admission de l'étudiant, choisi par l'équipe sur sa fiche. Seuls les « admis » ont accès à leurs offres. */
export const ADMISSIONS = [
  { id: "prospect", label: "Prospect", icone: "🌱", chip: "chip-tag" },
  { id: "admis", label: "Admis", icone: "✅", chip: "chip-plus" },
  { id: "admis_condition", label: "Admis sous condition", icone: "🟡", chip: "chip-tag" },
  { id: "liste_attente", label: "Liste d'attente", icone: "⏳", chip: "" },
  { id: "refus", label: "Refusé", icone: "❌", chip: "chip-minus" },
  { id: "abandon", label: "Abandon", icone: "🚪", chip: "chip-minus" },
] as const;

/** Statuts qui demandent un motif. */
export const AVEC_MOTIF = ["refus", "abandon"];

export type Admission = (typeof ADMISSIONS)[number]["id"];

/** Base pas encore à jour (colonne absente) : on considère l'étudiant admis pour ne bloquer personne. */
export const estAdmis = (c: { statut_admission?: string | null }) => c.statut_admission == null || c.statut_admission === "admis";

export const admission = (id?: string | null) => ADMISSIONS.find((a) => a.id === id) ?? ADMISSIONS[1];

/** Formations proposées par une école (ex. Magnus Campus : EGC, GUC, AMLHR). */
export type Formation = { nom: string; duree: number; alternance: number[]; brochure?: string | null };

export const anneeLabel = (n: number) => (n === 1 ? "1re année" : `${n}e année`);

/** « 2e année · alternance » pour l'année de cursus de l'étudiant. */
export function cursusLabel(annee?: number | null, rythme?: string | null) {
  if (!annee) return "";
  return `${anneeLabel(annee)}${rythme ? ` · ${rythme === "alternance" ? "alternance" : "formation initiale"}` : ""}`;
}

export function lireFormations(v: unknown): Formation[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => x as Partial<Formation>)
    .filter((x) => typeof x.nom === "string" && x.nom.trim())
    .map((x) => ({ nom: x.nom!.trim(), duree: Math.max(1, Math.min(5, Number(x.duree) || 1)), alternance: Array.isArray(x.alternance) ? x.alternance.map(Number).filter((n) => n >= 1 && n <= 5) : [], brochure: typeof x.brochure === "string" ? x.brochure : null }));
}

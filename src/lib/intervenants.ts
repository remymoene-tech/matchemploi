/** Situation professionnelle d'un intervenant. */
export const SITUATIONS_INTERVENANT: Record<string, string> = {
  salarie: "Salarié(e) d'une entreprise",
  independant: "À mon compte (indépendant, freelance, gérant)",
  autre: "Autre",
};

/** Spécialités proposées aux intervenants (plusieurs choix possibles). */
export const SPECIALITES = ["Vente", "Achat", "Marketing", "Communication", "Droit", "Comptabilité", "Tourisme", "Hôtellerie", "Restauration", "Loisirs"] as const;

/** « Vente · Marketing » → ["Vente", "Marketing"] */
export const specialitesDe = (texte?: string | null) => (texte ?? "").split("·").map((x) => x.trim()).filter(Boolean);

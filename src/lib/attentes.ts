/** Questionnaire « Les attentes de l'entreprise », en plus de la fiche de poste. Facultatif, interne à l'équipe. */
export const QUESTIONS_ATTENTES = {
  diplomes: { label: "Niveau de diplôme préparé", type: "cases", options: ["CAP", "Bac", "BTS", "Bachelor", "Master"] },
  experience: { label: "Expérience", type: "choix", options: ["Aucune, on forme", "Un petit job suffit", "Indispensable"] },
  permis: { label: "Permis", type: "choix", options: ["Pas utile", "Souhaité", "Obligatoire", "Obligatoire avec véhicule"] },
  langues: { label: "Langues demandées", type: "cases", options: ["Anglais", "Espagnol", "Italien", "Allemand"] },
  rythmes: { label: "Rythme d'alternance accepté", type: "cases", options: ["1 semaine / 1 semaine", "2 jours / 3 jours", "3 jours / 2 jours", "1 mois / 1 mois"] },
  demarrage: { label: "Démarrage", type: "choix", options: ["Dès que possible", "À une date précise"] },
  horaires: { label: "Horaires particuliers", type: "cases", options: ["Samedis", "Soirées", "Déplacements"] },
  personnalite: {
    label: "La personnalité qui réussit dans l'équipe (2 choix maximum)", type: "cases", max: 2,
    options: ["Dynamique, direct, aime les défis", "Sociable, enthousiaste, à l'aise à l'oral", "Calme, fiable, à l'écoute", "Précis, organisé, méthodique"],
  },
  qualites: {
    label: "Les 3 qualités indispensables", type: "cases", max: 3,
    options: ["Relation client", "Sens commercial", "Autonomie", "Rigueur", "Travail en équipe", "Ponctualité", "Adaptabilité", "Organisation", "Aisance au téléphone", "Esprit d'initiative"],
  },
  encadrement: { label: "Le tuteur est plutôt", type: "choix", options: ["Très présent : il montre et explique", "Il accompagne et conseille", "Il laisse vite de l'autonomie"] },
} as const;

export type CleAttente = keyof typeof QUESTIONS_ATTENTES;
export type Attentes = Partial<Record<CleAttente, string[]>> & {
  langue_autre?: string; rythme_autre?: string; date_debut?: string; redhibitoire?: string; apporte?: string;
};

/** Couleur DISC correspondant à chaque personnalité (même ordre que les options). */
const DISC_PERSONNALITE = ["rouge", "jaune", "vert", "bleu"];

const txt = (f: FormData, k: string, max = 400) => String(f.get(k) ?? "").trim().slice(0, max);

export function lireAttentes(f: FormData): Attentes | null {
  const a: Attentes = {};
  for (const [cle, q] of Object.entries(QUESTIONS_ATTENTES) as [CleAttente, (typeof QUESTIONS_ATTENTES)[CleAttente]][]) {
    const permises = q.options as readonly string[];
    let v = f.getAll(`att_${cle}`).map(String).filter((x) => permises.includes(x));
    if ("max" in q) v = v.slice(0, q.max);
    if (v.length) a[cle] = q.type === "choix" ? v.slice(0, 1) : v;
  }
  for (const k of ["langue_autre", "rythme_autre", "date_debut", "redhibitoire", "apporte"] as const) {
    const v = txt(f, `att_${k}`);
    if (v) a[k] = v;
  }
  return Object.keys(a).length ? a : null;
}

/** Résumé lisible du questionnaire, ajouté à la fiche de poste pour la notation. */
export function attentesTexte(a?: Attentes | null): string {
  if (!a) return "";
  const l = (cle: CleAttente, extra?: string) => {
    const v = [...(a[cle] ?? []), ...(extra ? [extra] : [])];
    return v.length ? `- ${QUESTIONS_ATTENTES[cle].label} : ${v.join(", ")}` : "";
  };
  const disc = (a.personnalite ?? []).map((p) => DISC_PERSONNALITE[(QUESTIONS_ATTENTES.personnalite.options as readonly string[]).indexOf(p)]).filter(Boolean);
  return [
    "ATTENTES DE L'ENTREPRISE (questionnaire rempli avec l'équipe) :",
    l("diplomes"), l("experience"), l("permis"), l("langues", a.langue_autre), l("rythmes", a.rythme_autre),
    l("demarrage", a.date_debut), l("horaires"),
    l("personnalite") + (disc.length ? ` (DISC : ${disc.join(", ")})` : ""),
    l("qualites"), l("encadrement"),
    a.redhibitoire ? `- Ce qui fait dire non tout de suite : ${a.redhibitoire}` : "",
    a.apporte ? `- Ce que l'entreprise apporte : ${a.apporte}` : "",
  ].filter(Boolean).join("\n");
}

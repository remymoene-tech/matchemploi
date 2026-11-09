/** Questionnaire « Les attentes de l'entreprise », en plus de la fiche de poste. Facultatif, interne à l'équipe. */
export const QUESTIONS_ATTENTES = {
  type_poste: { label: "Type de poste", type: "cases", options: ["Alternance", "Stage", "CDI", "CDD", "Job étudiant"] },
  duree_stage: { label: "Durée du stage", type: "choix", options: ["Moins de 2 mois", "2 mois", "3 mois", "4 à 6 mois"] },
  duree_cdd: { label: "Durée du CDD", type: "choix", options: ["Moins de 3 mois", "3 à 6 mois", "6 à 12 mois", "Plus d'un an"] },
  heures_job: { label: "Heures par semaine (job étudiant)", type: "choix", options: ["Moins de 10 h", "10 à 15 h", "15 à 20 h", "Plus de 20 h"] },
  temps_travail: { label: "Temps de travail", type: "choix", options: ["35 h", "39 h", "Temps partiel", "Autre"] },
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
  encadrement: {
    label: "Le tuteur est plutôt", type: "choix",
    options: ["Il dirige : il explique et montre comment faire", "Il entraîne : il observe et conseille", "Il épaule : il écoute et encourage", "Il délègue : il laisse vite de l'autonomie"],
  },
  // --- Le poste (questions communes avec les préférences de l'étudiant) ---
  taille: { label: "Taille de l'entreprise", type: "choix", options: ["Petite équipe (moins de 10)", "PME (10 à 250)", "Grande entreprise"] },
  contact_client: { label: "Contact avec les clients", type: "choix", options: ["Beaucoup", "Un peu", "Pas du tout"] },
  missions: { label: "Les missions au quotidien", type: "cases", options: ["Terrain et déplacements", "Bureau", "Téléphone", "Digital et réseaux sociaux", "Accueil et vente en magasin"] },
  // --- L'ambiance (reliée au test DISC) ---
  rythme_travail: { label: "Le rythme de travail", type: "choix", options: ["Rapide, sous pression", "Varié, avec beaucoup d'échanges", "Régulier et stable", "Précis, avec des procédures"] },
  reussite: { label: "Ce qui fait réussir dans le poste (2 choix maximum)", type: "cases", max: 2, options: ["Convaincre et aller chercher les clients", "Créer du lien et animer", "Être fiable et à l'écoute", "Être rigoureux et organisé"] },
} as const;

/** Questions posées aussi à l'étudiant (« Mes préférences ») pour comparer réponse contre réponse. */
export const PREFERENCES_ETUDIANT = {
  horaires: { label: "J'accepte de travailler", type: "cases", options: ["Le samedi", "Le soir", "En déplacement"] },
  secteurs: { label: "Les secteurs qui m'attirent", type: "cases", options: ["Commerce et vente", "Banque et assurance", "Immobilier", "Ressources humaines", "Communication et marketing", "Gestion et comptabilité", "Hôtellerie et restauration", "Industrie et logistique", "Santé et social"] },
  taille: { label: "Je préfère une entreprise", type: "choix", options: ["Petite équipe", "PME", "Grande entreprise", "Peu importe"] },
  contact_client: { label: "Le contact client, j'aime", type: "choix", options: ["Beaucoup", "Un peu", "Pas trop"] },
  missions: { label: "Ce que je préfère faire", type: "cases", options: ["Terrain et déplacements", "Bureau", "Téléphone", "Digital et réseaux sociaux", "Accueil et vente en magasin"] },
  autonomie: { label: "Avec mon tuteur, j'aime être", type: "choix", options: ["Guidé pas à pas", "Accompagné et conseillé", "Encouragé et rassuré", "Autonome rapidement"] },
} as const;
export type CleePreference = keyof typeof PREFERENCES_ETUDIANT;
export type Preferences = Partial<Record<CleePreference, string[]>>;

export function lirePreferences(f: FormData): Preferences | null {
  const p: Preferences = {};
  for (const [cle, q] of Object.entries(PREFERENCES_ETUDIANT) as [CleePreference, (typeof PREFERENCES_ETUDIANT)[CleePreference]][]) {
    const permises = q.options as readonly string[];
    const v = f.getAll(`pref_${cle}`).map(String).filter((x) => permises.includes(x));
    if (v.length) p[cle] = q.type === "choix" ? v.slice(0, 1) : v;
  }
  return Object.keys(p).length ? p : null;
}

export function preferencesTexte(p?: Preferences | null) {
  if (!p) return "";
  return (Object.keys(PREFERENCES_ETUDIANT) as CleePreference[])
    .filter((k) => p[k]?.length).map((k) => `- ${PREFERENCES_ETUDIANT[k].label} : ${p[k]!.join(", ")}`).join("\n");
}

/** Couleur DISC attendue selon le rythme de travail et ce qui fait réussir (même ordre que les options). */
const DISC_ORDRE = ["rouge", "jaune", "vert", "bleu"];
/** Style de management du tuteur (même ordre que les options d'encadrement). */
const MANAGEMENT_ORDRE = ["diriger", "entrainer", "epauler", "deleguer"];

export type CleAttente = keyof typeof QUESTIONS_ATTENTES;
export type Attentes = Partial<Record<CleAttente, string[]>> & {
  langue_autre?: string; rythme_autre?: string; date_debut?: string; redhibitoire?: string; apporte?: string;
  missions_texte?: string; remuneration?: string;
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
  for (const k of ["langue_autre", "rythme_autre", "date_debut", "redhibitoire", "apporte", "missions_texte", "remuneration"] as const) {
    const v = txt(f, `att_${k}`, k === "missions_texte" ? 2000 : 400);
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
    l("type_poste"), l("duree_stage"), l("duree_cdd"), l("heures_job"), l("temps_travail"),
    a.missions_texte ? `- Missions du poste : ${a.missions_texte}` : "",
    a.remuneration ? `- Rémunération : ${a.remuneration}` : "",
    l("diplomes"), l("experience"), l("permis"), l("langues", a.langue_autre), l("rythmes", a.rythme_autre),
    l("demarrage", a.date_debut), l("horaires"),
    l("personnalite") + (disc.length ? ` (DISC : ${disc.join(", ")})` : ""),
    l("qualites"),
    l("encadrement") + (() => { const i = (QUESTIONS_ATTENTES.encadrement.options as readonly string[]).indexOf(a.encadrement?.[0] ?? ""); return i >= 0 ? ` (style de management : ${MANAGEMENT_ORDRE[i]})` : ""; })(),
    l("taille"), l("contact_client"), l("missions"),
    l("rythme_travail") + (() => { const i = (QUESTIONS_ATTENTES.rythme_travail.options as readonly string[]).indexOf(a.rythme_travail?.[0] ?? ""); return i >= 0 ? ` (DISC : ${DISC_ORDRE[i]})` : ""; })(),
    l("reussite") + (a.reussite?.length ? ` (DISC : ${a.reussite.map((x) => DISC_ORDRE[(QUESTIONS_ATTENTES.reussite.options as readonly string[]).indexOf(x)]).filter(Boolean).join(", ")})` : ""),
    a.redhibitoire ? `- Ce qui fait dire non tout de suite : ${a.redhibitoire}` : "",
    a.apporte ? `- Ce que l'entreprise apporte : ${a.apporte}` : "",
  ].filter(Boolean).join("\n");
}

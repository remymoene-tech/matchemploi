/** Structure de la fiche d'entretien conseiller ↔ étudiant (alternance). */

export type Item = { id: string; label: string };
export type Section =
  | { id: string; titre: string; type: "cases"; items: Item[] }
  | { id: string; titre: string; type: "questions"; items: Item[] };

export const REPONSES_QUESTION = ["Oui", "Partiellement", "Non", "Non renseigné"] as const;

export const BILANS = [
  { id: "autonome", label: "Autonome : prêt à être positionné sur des offres" },
  { id: "accompagner", label: "À accompagner" },
  { id: "renforce", label: "Accompagnement renforcé" },
] as const;

export const SECTIONS: Section[] = [
  {
    id: "situation", titre: "1. Situation de l'étudiant", type: "cases",
    items: [
      { id: "recherche_active", label: "Recherche active d'une alternance" },
      { id: "candidatures", label: "A déjà envoyé des candidatures" },
      { id: "entretiens", label: "A déjà passé des entretiens en entreprise" },
      { id: "cv_a_jour", label: "Dispose d'un CV à jour" },
      { id: "linkedin", label: "Dispose d'un profil LinkedIn" },
      { id: "entreprise_interessee", label: "A déjà une entreprise intéressée" },
    ],
  },
  {
    id: "connaissance", titre: "2. Connaissance de l'école et de l'alternance", type: "questions",
    items: [
      { id: "connait_ecole", label: "Connaît-il notre école ?" },
      { id: "renseigne_ecole", label: "S'est-il renseigné sur l'école avant l'entretien ?" },
      { id: "connait_formation", label: "Connaît-il la formation choisie ?" },
      { id: "pourquoi_ecole", label: "Sait-il expliquer pourquoi il souhaite intégrer notre école ?" },
      { id: "fonctionnement_alternance", label: "Connaît-il le fonctionnement de l'alternance ?" },
      { id: "rythme", label: "Connaît-il le rythme école / entreprise ?" },
      { id: "attentes_entreprise", label: "Comprend-il les attentes d'une entreprise envers un alternant ?" },
      { id: "demarches", label: "Connaît-il les démarches pour trouver une entreprise ?" },
    ],
  },
  {
    id: "projet", titre: "3. Projet professionnel", type: "cases",
    items: [
      { id: "metier_identifie", label: "Métier recherché clairement identifié" },
      { id: "secteur_defini", label: "Secteur d'activité défini" },
      { id: "connait_missions", label: "Connaît les missions du métier" },
      { id: "projet_coherent", label: "Projet cohérent avec la formation" },
      { id: "ouvert_entreprises", label: "Ouvert à plusieurs types d'entreprises" },
    ],
  },
  {
    id: "mobilite", titre: "4. Mobilité et disponibilité", type: "cases",
    items: [
      { id: "permis_b", label: "Possède le permis B" },
      { id: "vehicule", label: "Dispose d'un véhicule" },
      { id: "transports", label: "Utilise les transports en commun" },
      { id: "mobile_20", label: "Mobile dans un rayon de 20 km" },
      { id: "mobile_50", label: "Mobile dans un rayon de 50 km" },
      { id: "disponible", label: "Disponible rapidement pour un entretien" },
    ],
  },
  {
    id: "preparation", titre: "5. Préparation à la recherche", type: "cases",
    items: [
      { id: "cv_pro", label: "CV professionnel et adapté" },
      { id: "presenter_parcours", label: "Sait présenter son parcours" },
      { id: "expliquer_formation", label: "Sait expliquer son choix de formation" },
      { id: "bases_entretien", label: "Connaît les bases de l'entretien d'embauche" },
      { id: "relancer", label: "Sait relancer une entreprise" },
      { id: "accompagnement_renforce", label: "A besoin d'un accompagnement renforcé" },
    ],
  },
];

/** Réponses enregistrées : pour une case { coche, precision }, pour une question { reponse, precision }. */
export type Reponse = { coche?: boolean; reponse?: string; precision?: string };
export type Reponses = Record<string, Reponse>;

export type EntretienConseil = {
  id: string;
  candidat_id: string;
  conseiller: string;
  conseiller_email: string;
  date_entretien: string;
  formation: string;
  zone: string;
  reponses: Reponses;
  qualites: string;
  points_faibles: string;
  bilan: string;
  observations: string;
  prochaine_etape: string;
  partage: boolean;
  created_at: string;
  updated_at: string;
};

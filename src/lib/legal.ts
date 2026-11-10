/**
 * Informations légales du site (mentions légales et politique de confidentialité).
 * Les champs à null s'affichent « à compléter » : il faut les faire valider par la direction et le DPO de la CCI.
 */
export const LEGAL = {
  site: "MagnusMatch",
  url: "magnusmatch.vercel.app",
  editeur: "Campus Magnus (EGC Business School et CFA Négoventis), établissements de formation de la CCI du Pays d'Arles",
  adresse: "45 boulevard Marcellin Berthelot, 13200 Arles",
  telephone: "04 90 99 08 08",
  emailContact: "egc@arles.cci.fr",
  /** Nom et fonction du directeur ou de la directrice de la publication. */
  directeurPublication: null as string | null,
  /** SIRET de la CCI du Pays d'Arles (ou de l'établissement). */
  siret: "181 300 039 00011" as string | null,
  /** Adresse du délégué à la protection des données (DPO) de la CCI. */
  emailDpo: null as string | null,
  miseAJour: "10 novembre 2026",
};

/** Sous-traitants techniques (à vérifier avec les contrats en place). */
export const SOUS_TRAITANTS = [
  { nom: "Vercel Inc.", role: "Hébergement du site", lieu: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis" },
  { nom: "Supabase Inc.", role: "Base de données, comptes et stockage des fichiers (CV, brochures)", lieu: "Serveurs dans la région choisie pour le projet (à vérifier : de préférence Union européenne)" },
  { nom: "Anthropic PBC", role: "Intelligence artificielle (lecture des CV et des offres, notes de correspondance, conseils)", lieu: "États-Unis" },
  { nom: "Service d'envoi d'emails", role: "Envoi des brochures, convocations, invitations et alertes", lieu: "Selon le service configuré (boîte mail de l'école ou Resend)" },
] as const;

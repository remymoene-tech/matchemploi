/** Formation « Créer un bon LinkedIn », étape par étape (pensée pour l'alternance). */
export type EtapeLinkedin = { titre: string; pourquoi: string; faire: string[]; eviter?: string; mieux?: string };

export const ETAPES_LINKEDIN: EtapeLinkedin[] = [
  {
    titre: "Créer ton compte",
    pourquoi: "Les recruteurs et les tuteurs d'alternance regardent souvent LinkedIn avant de te rappeler.",
    faire: ["Inscris-toi sur linkedin.com avec ton vrai prénom et ton nom.", "Utilise une adresse email sérieuse (prenom.nom@…)."],
  },
  {
    titre: "Mettre une photo professionnelle",
    pourquoi: "Un profil avec photo est beaucoup plus consulté qu'un profil sans photo.",
    faire: ["Visage bien visible, de face ou de trois quarts, avec le sourire.", "Fond neutre et lumière du jour, téléphone posé ou tenu par quelqu'un d'autre.", "Tenue adaptée au métier visé."],
    eviter: "Selfie au bras tendu, photo de soirée, lunettes de soleil, photo recadrée d'un groupe.",
    mieux: "Une photo simple prise devant un mur clair, en tenue de travail.",
  },
  {
    titre: "Ajouter une bannière",
    pourquoi: "Le fond gris par défaut donne l'impression d'un profil abandonné.",
    faire: ["Choisis une image liée à ton métier ou à ton école (1584 × 396 pixels).", "Tu peux écrire dessus une phrase courte : « En recherche d'alternance · Vente · Rentrée 2027 »."],
  },
  {
    titre: "Écrire un titre clair",
    pourquoi: "C'est la ligne sous ton nom : c'est elle que les recruteurs voient dans les résultats de recherche.",
    faire: ["Dis ce que tu vas devenir, ta formation et ce que tu cherches.", "Ajoute ta ville ou ta zone."],
    eviter: "« Étudiant » ou « À la recherche de nouvelles opportunités ».",
    mieux: "« Futur conseiller de vente en alternance · BTS NDRC · Salon-de-Provence »",
  },
  {
    titre: "Personnaliser l'adresse de ton profil",
    pourquoi: "Une adresse propre se met facilement sur ton CV et dans tes mails.",
    faire: ["Sur ton profil : « Modifier le profil public et l'URL ».", "Choisis linkedin.com/in/prenom-nom."],
  },
  {
    titre: "Rédiger la section « Infos »",
    pourquoi: "C'est ta présentation : 4 à 6 phrases qui donnent envie de te rencontrer.",
    faire: ["Qui tu es et ce qui t'a amené vers ce métier.", "Ce que tu sais déjà faire, avec un exemple concret.", "Ce que tu cherches : poste, rythme d'alternance, date de début, zone."],
    eviter: "« Dynamique, motivé et rigoureux, je suis passionné par… »",
    mieux: "« Après 2 étés en boulangerie, j'aime conseiller les clients et tenir une caisse. Je prépare un BTS NDRC et je cherche une alternance en vente, 2 jours école / 3 jours entreprise, dès septembre, autour de Salon. »",
  },
  {
    titre: "Activer « Open to work » en mode discret",
    pourquoi: "Les recruteurs filtrent les profils disponibles.",
    faire: ["Sur ton profil : « Disponible pour » → « Trouver un nouveau poste ».", "Indique le poste, le type de contrat et le lieu.", "Choisis « Recruteurs uniquement » pour la visibilité."],
  },
  {
    titre: "Détailler tes expériences",
    pourquoi: "Même un job d'été ou un stage montre ce que tu sais faire.",
    faire: ["Pour chaque expérience : 2 ou 3 réalisations concrètes avec des verbes d'action.", "Ajoute des chiffres quand c'est possible (clients par jour, chiffre d'affaires, nombre de produits)."],
    eviter: "« Vente » tout seul.",
    mieux: "« Accueil et conseil d'environ 150 clients par jour, encaissement, mise en rayon des produits frais. »",
  },
  {
    titre: "Remplir ta formation",
    pourquoi: "Les entreprises d'alternance cherchent souvent par école ou par diplôme.",
    faire: ["Ajoute l'école EGC – Campus Magnus et le diplôme préparé.", "Précise le rythme de l'alternance dans la description."],
  },
  {
    titre: "Choisir 5 compétences clés",
    pourquoi: "Les compétences servent de mots-clés dans les recherches des recruteurs.",
    faire: ["Choisis celles du métier visé (ex. relation client, négociation, encaissement).", "Épingle les 2 ou 3 plus importantes en haut."],
  },
  {
    titre: "Demander 1 ou 2 recommandations",
    pourquoi: "L'avis d'un ancien tuteur ou employeur rassure beaucoup.",
    faire: ["Demande-la à un ancien employeur, un tuteur de stage ou un formateur.", "Envoie un message court et personnel en expliquant ton projet."],
  },
  {
    titre: "Construire ton réseau",
    pourquoi: "Plus ton réseau est en lien avec ton métier, plus tu apparais auprès des bonnes personnes.",
    faire: ["Ajoute tes formateurs, les anciens de l'école, tes anciens collègues.", "Suis les entreprises où tu aimerais travailler.", "Ajoute toujours un petit message à ta demande de connexion."],
  },
  {
    titre: "Être actif",
    pourquoi: "Un profil vivant est mieux mis en avant.",
    faire: ["Publie « Je recherche une alternance en… » avec ton rythme et ta date de début.", "Commente ou partage 1 fois par semaine des posts de ton secteur."],
  },
];

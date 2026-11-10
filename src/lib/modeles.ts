/**
 * Modèles de messages (email et SMS) proposés dans « Noter un échange ».
 * Variables remplacées automatiquement :
 *   {prenom} {formation} {rentree} {entretien} {moi} {signature} {site}
 *   entreprises : {contact} {entreprise}
 * Une variable inconnue reste entre accolades : l'écran demande de la compléter.
 */
export type Cible = "lead" | "candidat" | "entreprise";
/** `pour` : statuts où le modèle est conseillé (affiché en premier). Vide = toujours utile. */
export type Modele = { id: string; titre: string; cible: Cible; pour: string[]; sujet: string; email: string; sms: string };

export const MODELES: Modele[] = [
  /* ---------- Leads (prospects) ---------- */
  {
    id: "merci", cible: "lead", pour: ["nouveau"], titre: "👋 Merci pour ta demande",
    sujet: "Ta demande sur la formation {formation} · Campus Magnus",
    email: "Bonjour {prenom},\n\nMerci pour ton intérêt pour la formation {formation} au Campus Magnus ! Je suis {moi} et je t'accompagne dans ton projet.\n\n## Ce que je peux faire pour toi\n\n- Te présenter la formation et le rythme de l'alternance\n- T'aider à trouver ton entreprise d'accueil\n- Te préparer au concours d'entrée\n\n## Prochaine étape\n\nÉchangeons 10 minutes par téléphone : réponds à cet email avec tes disponibilités (jour et heure), et je t'appelle.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus 👋 Merci pour ta demande sur la formation {formation} ! Quand es-tu dispo pour un petit appel de 10 min ?",
  },
  {
    id: "injoignable", cible: "lead", pour: ["nouveau", "contacte"], titre: "📞 Pas réussi à te joindre",
    sujet: "J'ai essayé de te joindre · Campus Magnus",
    email: "Bonjour {prenom},\n\nJ'ai essayé de t'appeler au sujet de la formation {formation}, sans réussir à te joindre.\n\n## Pour qu'on se parle\n\nRéponds simplement à cet email avec :\n\n- Le jour et l'heure qui t'arrangent\n- Le numéro où te joindre, s'il a changé\n\nJe te rappelle au moment qui te convient.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. J'ai essayé de t'appeler pour la formation {formation}. Quand puis-je te rappeler ?",
  },
  {
    id: "jpo", cible: "lead", pour: ["nouveau", "contacte", "rdv"], titre: "🏫 Invitation portes ouvertes",
    sujet: "Viens découvrir le Campus Magnus le {date_jpo}",
    email: "Bonjour {prenom},\n\nTu t'intéresses à la formation {formation} ? Viens la découvrir à nos portes ouvertes !\n\n## Les portes ouvertes\n\n📅 {date_jpo}\n📍 Campus Magnus, 45 boulevard Marcellin Berthelot, Arles\n👨‍👩‍👧 Tu peux venir accompagné(e)\n\n## Au programme\n\n- Visite du campus\n- Rencontre avec les formateurs et des étudiants en {formation}\n- Toutes les réponses sur l'alternance et le concours d'entrée\n\nDis-moi si tu viens en répondant à cet email : je serai ravi(e) de t'accueillir.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Nos portes ouvertes ont lieu le {date_jpo} : viens visiter l'école et poser tes questions sur la formation {formation} ! Tu viens ?",
  },
  {
    id: "rdv", cible: "lead", pour: ["rdv"], titre: "🤝 Confirmation du rendez-vous",
    sujet: "Notre rendez-vous au Campus Magnus",
    email: "Bonjour {prenom},\n\nJe te confirme notre rendez-vous au Campus Magnus.\n\n## Ton rendez-vous\n\n📅 {date_rdv}\n📍 Campus Magnus, 45 boulevard Marcellin Berthelot, Arles\n\n## Pour en profiter au maximum\n\n- Note tes questions sur la formation {formation}\n- Apporte ton CV si tu en as un\n\nEn cas d'empêchement, préviens-moi en répondant à cet email.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Je te confirme notre RDV le {date_rdv} au campus (45 bd Marcellin Berthelot, Arles). À bientôt !",
  },
  {
    id: "dossier", cible: "lead", pour: ["dossier"], titre: "📝 As-tu pu remplir ton dossier ?",
    sujet: "Ton dossier de candidature · Campus Magnus",
    email: "Bonjour {prenom},\n\nAs-tu pu remplir ton dossier de candidature pour la formation {formation} ?\n\n## Pour finaliser ton dossier\n\n1. Complète toutes les rubriques\n2. Joins ton CV et les documents demandés\n3. Envoie-le-nous\n\nSi tu bloques sur un point ou s'il te manque une pièce, réponds à cet email : je t'aide volontiers.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. As-tu pu remplir ton dossier pour la formation {formation} ? Si tu bloques, je t'aide !",
  },
  {
    id: "concours", cible: "lead", pour: ["convoque"], titre: "📅 Rappel du concours",
    sujet: "Rappel : ton entretien d'admission au Campus Magnus",
    email: "Bonjour {prenom},\n\nTu es convoqué(e) à ton entretien d'admission pour la formation {formation}. Voici toutes les informations pour qu'il se passe au mieux.\n\n## Ton rendez-vous\n\n📅 {entretien}\n📍 Campus Magnus, 45 boulevard Marcellin Berthelot, Arles\n⏱️ Durée : environ 1 heure\n\n## À apporter\n\n- Ton CV à jour\n- Tes questions sur la formation et l'alternance\n\n## Comment ça se passe\n\n1. Tu présentes ton parcours et ton projet\n2. Nous échangeons sur la formation et le rythme de l'alternance\n3. Tu poses toutes tes questions\n\nEn cas d'empêchement, merci de me prévenir en répondant à cet email.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, petit rappel : ton entretien d'admission au Campus Magnus a lieu le {entretien} (environ 1 h). Pense à ton CV ! En cas d'empêchement, préviens-moi. {moi}",
  },
  {
    id: "apres_concours", cible: "lead", pour: ["present"], titre: "🙏 Merci d'être venu(e)",
    sujet: "Merci pour ta venue au Campus Magnus",
    email: "Bonjour {prenom},\n\nMerci d'être venu(e) passer ton entretien d'admission pour la formation {formation}.\n\n## La suite\n\n1. Notre équipe étudie ta candidature\n2. Tu reçois ta réponse très vite, par email\n\nEn attendant, je reste disponible pour toute question.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, merci d'être venu(e) à ton entretien au Campus Magnus ! Tu auras ta réponse très vite. {moi}",
  },
  {
    id: "absent", cible: "lead", pour: ["absent"], titre: "🚫 On t'a attendu",
    sujet: "Ton entretien d'admission · Campus Magnus",
    email: "Bonjour {prenom},\n\nNous t'attendions pour ton entretien d'admission et tu n'as pas pu venir. J'espère que tout va bien.\n\n## On fixe une nouvelle date ?\n\nSi la formation {formation} t'intéresse toujours, réponds à cet email avec tes disponibilités : je te propose un nouveau créneau.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. On t'attendait pour ton entretien : tout va bien ? Si tu veux, on fixe une nouvelle date.",
  },
  {
    id: "admis_lead", cible: "lead", pour: ["admis"], titre: "🎉 Tu es admis",
    sujet: "Félicitations, tu es admis au Campus Magnus 🎉",
    email: "Bonjour {prenom},\n\nFélicitations : tu es admis(e) en {formation} au Campus Magnus pour la rentrée {rentree} 🎉\n\n## Tes prochaines étapes\n\n1. Crée ton espace MagnusMatch grâce à l'email que tu vas recevoir\n2. Dépose ton CV et complète ton profil\n3. Postule aux offres d'alternance qui te correspondent\n\n## On t'accompagne\n\n- Des offres d'alternance choisies pour toi\n- De l'aide pour ton CV et tes candidatures\n- La préparation à tes entretiens d'embauche\n\nBravo encore,\n\n{signature}",
    sms: "Bonjour {prenom}, félicitations, tu es admis en {formation} au Campus Magnus 🎉 Regarde tes emails pour créer ton espace MagnusMatch. {moi}",
  },
  {
    id: "relance", cible: "lead", pour: ["contacte", "rdv", "dossier"], titre: "🔁 Des nouvelles ?",
    sujet: "Où en es-tu dans ton projet ? · Campus Magnus",
    email: "Bonjour {prenom},\n\nJe reviens vers toi au sujet de la formation {formation}. Où en es-tu dans ton projet ?\n\n## Je peux t'aider sur\n\n- L'alternance et la recherche d'entreprise\n- Le concours d'entrée\n- Le financement et le rythme de la formation\n\nRéponds à cet email avec tes questions ou tes disponibilités : je t'appelle quand tu veux.\n\nBelle journée,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Où en es-tu dans ton projet de formation {formation} ? Je peux t'appeler si tu as des questions.",
  },
  {
    id: "porte_ouverte", cible: "lead", pour: ["perdu"], titre: "🚪 La porte reste ouverte",
    sujet: "Bonne continuation · Campus Magnus",
    email: "Bonjour {prenom},\n\nMerci pour l'intérêt que tu as porté au Campus Magnus. Je te souhaite plein de réussite dans ton projet.\n\nSi un jour ton projet évolue, la porte reste ouverte : réponds simplement à cet email.\n\nBelle continuation,\n\n{signature}",
    sms: "Bonjour {prenom}, merci pour ton intérêt pour le Campus Magnus et bonne continuation ! Si ton projet évolue, la porte reste ouverte. {moi}",
  },

  /* ---------- Candidats (selon l'admission) ---------- */
  {
    id: "bienvenue", cible: "candidat", pour: ["admis"], titre: "🎉 Bienvenue au Campus",
    sujet: "Bienvenue au Campus Magnus 🎉",
    email: "Bonjour {prenom},\n\nFélicitations et bienvenue au Campus Magnus ! Ton admission en {formation} est confirmée 🎉\n\n## Ton espace MagnusMatch est prêt\n\nTu y trouves des offres d'alternance choisies pour toi, ton CV et ta carte de visite.\n\n👉 Accéder à mon espace : {site}/espace\n\n## Tes prochaines étapes\n\n1. Complète ton profil et dépose ton CV\n2. Postule aux offres qui te correspondent\n3. Prends rendez-vous avec nous pour préparer tes entretiens\n\nJe reste à ta disposition pour toute question.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, bienvenue au Campus Magnus 🎉 Ton espace MagnusMatch t'attend avec des offres d'alternance pour toi : {site}/espace {moi}",
  },
  {
    id: "point_alternance", cible: "candidat", pour: ["admis", "admis_condition"], titre: "🔎 Point sur ta recherche",
    sujet: "Où en est ta recherche d'alternance ?",
    email: "Bonjour {prenom},\n\nOù en est ta recherche d'entreprise pour ton alternance ?\n\n## Fais le point\n\n- Combien de candidatures as-tu envoyées ?\n- As-tu des entretiens prévus ?\n- As-tu des réponses en attente ?\n\n## On t'aide\n\nRéponds à cet email : on peut faire un point ensemble sur ton CV, tes candidatures et la préparation de tes entretiens.\n\n👉 Voir mes offres : {site}/espace\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Où en est ta recherche d'alternance ? On fait un point ensemble cette semaine ?",
  },
  {
    id: "offres", cible: "candidat", pour: ["admis"], titre: "📬 De nouvelles offres pour toi",
    sujet: "De nouvelles offres d'alternance t'attendent",
    email: "Bonjour {prenom},\n\nDe nouvelles offres d'alternance qui te correspondent sont arrivées sur ton espace MagnusMatch.\n\n👉 Voir mes offres : {site}/espace\n\n## Nos conseils\n\n- Postule vite : les entreprises reçoivent beaucoup de candidatures\n- Adapte ton message à chaque entreprise\n- Préviens-nous dès que tu as un entretien\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, de nouvelles offres d'alternance t'attendent sur ton espace MagnusMatch : {site}/espace Postule vite ! {moi}",
  },
  {
    id: "entretien_embauche", cible: "candidat", pour: ["admis", "admis_condition"], titre: "🍀 Bonne chance pour ton entretien",
    sujet: "Bonne chance pour ton entretien !",
    email: "Bonjour {prenom},\n\nBonne chance pour ton entretien chez {entreprise_visee} !\n\n## Nos conseils\n\n1. Renseigne-toi sur l'entreprise : ses produits, ses clients, ses valeurs\n2. Prépare 2 exemples concrets de ce que tu as déjà fait\n3. Arrive 10 minutes en avance, avec ton CV imprimé\n\nDis-moi comment ça s'est passé en répondant à cet email.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, bonne chance pour ton entretien chez {entreprise_visee} ! Arrive 10 min en avance et sois toi-même 💪 Dis-moi comment ça s'est passé. {moi}",
  },
  {
    id: "condition", cible: "candidat", pour: ["admis_condition"], titre: "🟡 Ce qu'il manque pour ton admission",
    sujet: "Ton admission au Campus Magnus : dernière étape",
    email: "Bonjour {prenom},\n\nTu es admis(e) sous condition en {formation}. Il ne reste plus qu'une étape pour confirmer ton admission.\n\n## Ce qu'il nous manque\n\n- {condition}\n\nEnvoie-le-moi dès que possible en répondant à cet email.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Pour confirmer ton admission en {formation}, il nous manque : {condition}. Merci de me l'envoyer vite !",
  },
  {
    id: "attente", cible: "candidat", pour: ["liste_attente"], titre: "⏳ Liste d'attente",
    sujet: "Ta candidature au Campus Magnus",
    email: "Bonjour {prenom},\n\nTa candidature en {formation} est sur liste d'attente.\n\n## La suite\n\n1. Je te préviens dès qu'une place se libère\n2. En attendant, continue ta recherche d'entreprise : un contrat signé peut faire avancer ton dossier\n\nJe reste disponible pour toute question.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, ta candidature en {formation} au Campus Magnus est sur liste d'attente. Je te préviens dès qu'une place se libère. {moi}",
  },
  {
    id: "refus", cible: "candidat", pour: ["refus"], titre: "❌ Réponse négative",
    sujet: "Ta candidature au Campus Magnus",
    email: "Bonjour {prenom},\n\nMerci pour ta candidature en {formation}. Nous ne pouvons malheureusement pas la retenir cette année.\n\nSi tu le souhaites, je peux t'expliquer pourquoi et t'orienter vers une autre formation : réponds simplement à cet email.\n\nBon courage pour la suite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Je t'ai envoyé un email au sujet de ta candidature. Je reste dispo si tu veux en parler.",
  },
  {
    id: "abandon", cible: "candidat", pour: ["abandon"], titre: "🚪 On reste disponibles",
    sujet: "On reste disponibles · Campus Magnus",
    email: "Bonjour {prenom},\n\nTu as décidé d'arrêter ton parcours au Campus Magnus. Je respecte ton choix et te souhaite le meilleur.\n\nSi tu as besoin d'un conseil ou si ton projet évolue, n'hésite pas à revenir vers moi.\n\nBelle continuation,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Je te souhaite le meilleur pour la suite. Si ton projet évolue, n'hésite pas à revenir vers nous !",
  },
  {
    id: "alumni_nouvelles", cible: "candidat", pour: ["alumni"], titre: "🎓 Des nouvelles, alumni ?",
    sujet: "Des nouvelles ? 🎓 Campus Magnus",
    email: "Bonjour {prenom},\n\nQue deviens-tu depuis ton diplôme ? Nous serions ravis d'avoir de tes nouvelles.\n\n👉 Mettre à jour mon parcours : {site}/espace/parcours\n\n## Tu peux aussi nous aider\n\n- Ton entreprise cherche un alternant ? Dis-le-nous\n- Témoigne de ton parcours auprès de nos étudiants\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus 🎓 Que deviens-tu ? Mets ton parcours à jour en 1 min : {site}/espace/parcours",
  },
  {
    id: "alumni_temoignage", cible: "candidat", pour: ["alumni"], titre: "🎤 Témoigner aux portes ouvertes",
    sujet: "Viens témoigner aux portes ouvertes ?",
    email: "Bonjour {prenom},\n\nLes futurs étudiants adorent écouter les anciens. Accepterais-tu de venir raconter ton parcours à nos portes ouvertes ?\n\n## En pratique\n\n📅 {date_jpo}\n📍 Campus Magnus, Arles\n⏱️ Environ 30 minutes\n\nDis-moi si tu es disponible en répondant à cet email.\n\nÀ très vite,\n\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Viendrais-tu 30 min raconter ton parcours aux futurs étudiants, aux portes ouvertes le {date_jpo} ?",
  },

  /* ---------- Entreprises (vouvoiement) ---------- */
  {
    id: "ent_merci", cible: "entreprise", pour: ["rencontree"], titre: "🤝 Merci pour la rencontre",
    sujet: "Suite à notre rencontre · Campus Magnus",
    email: "Bonjour {contact},\n\nMerci pour notre échange. Je vous rappelle en quelques mots ce que le Campus Magnus peut vous apporter.\n\n## Nos formations en alternance\n\n- Commerce et vente\n- Gestion d'unité commerciale\n- Tourisme, hôtellerie et loisirs\n\n## Notre accompagnement\n\n1. Vous nous décrivez votre besoin\n2. Nous vous proposons des profils sélectionnés sous 48 heures\n3. Nous vous aidons dans les démarches du contrat d'apprentissage\n\nCe service est gratuit. N'hésitez pas à me contacter pour tout besoin.\n\nBien cordialement,\n\n{signature}",
    sms: "Bonjour {contact}, c'est {moi} du Campus Magnus. Merci pour notre échange ! Si vous cherchez un alternant, je vous envoie des profils sous 48 h.",
  },
  {
    id: "ent_relance", cible: "entreprise", pour: ["en_discussion", "rencontree", "pas_maintenant"], titre: "🔁 Relance recrutement",
    sujet: "Recrutez-vous un alternant pour la rentrée {rentree} ?",
    email: "Bonjour {contact},\n\nNous préparons la rentrée {rentree}. {entreprise} aurait-elle un besoin d'alternant ?\n\n## Ce que nous vous proposons\n\n- Des profils motivés, déjà sélectionnés par notre équipe\n- Une présélection sous 48 heures\n- Un accompagnement dans les démarches du contrat\n\nJe reste à votre disposition pour en parler.\n\nBien cordialement,\n\n{signature}",
    sms: "Bonjour {contact}, c'est {moi} du Campus Magnus. Recrutez-vous un alternant pour la rentrée {rentree} ? J'ai de très bons profils à vous proposer.",
  },
  {
    id: "ent_profils", cible: "entreprise", pour: ["recrute", "partenaire"], titre: "👥 Proposer des profils",
    sujet: "Des profils pour votre alternance",
    email: "Bonjour {contact},\n\nSuite à votre besoin, je vous propose le profil de {etudiant}, en {formation} au Campus Magnus.\n\n## Son profil\n\n- Formation : {formation}\n- Disponibilité : rentrée {rentree}\n\nSeriez-vous disponible pour un entretien la semaine prochaine ? Je m'occupe de l'organiser.\n\nBien cordialement,\n\n{signature}",
    sms: "Bonjour {contact}, c'est {moi} du Campus Magnus. Je vous ai envoyé par email le profil de {etudiant} pour votre alternance. Un entretien la semaine prochaine ?",
  },
  {
    id: "ent_merci_partenaire", cible: "entreprise", pour: ["partenaire"], titre: "💚 Merci, partenaire",
    sujet: "Merci pour votre confiance · Campus Magnus",
    email: "Bonjour {contact},\n\nMerci pour votre confiance et pour l'accueil de nos alternants chez {entreprise}.\n\n## Faisons le point\n\n- Comment se passe l'alternance de votre côté ?\n- Avez-vous de nouveaux besoins pour la rentrée {rentree} ?\n\nJe reste disponible pour tout échange.\n\nBien cordialement,\n\n{signature}",
    sms: "Bonjour {contact}, c'est {moi} du Campus Magnus. Merci pour l'accueil de nos alternants ! Comment ça se passe de votre côté ?",
  },
  {
    id: "ent_jobdating", cible: "entreprise", pour: [], titre: "📣 Invitation job dating",
    sujet: "Invitation : job dating alternance au Campus Magnus",
    email: "Bonjour {contact},\n\nNous organisons un job dating alternance au Campus Magnus et serions ravis d'y accueillir {entreprise}.\n\n## Le job dating\n\n📅 {date_jobdating}\n📍 Campus Magnus, 45 boulevard Marcellin Berthelot, Arles\n\n## Pourquoi venir\n\n- Rencontrer en une matinée des candidats motivés et présélectionnés\n- Trouver votre alternant pour la rentrée {rentree}\n\nPuis-je compter sur votre présence ?\n\nBien cordialement,\n\n{signature}",
    sms: "Bonjour {contact}, c'est {moi} du Campus Magnus. Job dating alternance le {date_jobdating} au campus : venez rencontrer nos candidats ! Je vous inscris ?",
  },
];

/** Modèles d'une cible : conseillés pour ce statut d'abord. */
export function modelesPour(cible: Cible, statut?: string) {
  const liste = MODELES.filter((m) => m.cible === cible);
  const conseilles = liste.filter((m) => !m.pour.length || (statut && m.pour.includes(statut)));
  return { conseilles, autres: liste.filter((m) => !conseilles.includes(m)) };
}

export function remplir(texte: string, v: Record<string, string>) {
  return texte.replace(/\{(\w+)\}/g, (m, k: string) => (v[k] ? v[k] : m));
}

/** « 06 12 34 56 78 » → « +33612345678 » (numéros français), sinon chiffres et + seulement. */
export function telInternational(tel: string) {
  const n = tel.replace(/[^\d+]/g, "");
  if (/^0[1-9]\d{8}$/.test(n)) return `+33${n.slice(1)}`;
  if (/^0033\d{9}$/.test(n)) return `+${n.slice(2)}`;
  return n;
}

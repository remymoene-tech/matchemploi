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

const FIN = "\n\nÀ très vite,\n{signature}";

export const MODELES: Modele[] = [
  /* ---------- Leads (prospects) ---------- */
  {
    id: "merci", cible: "lead", pour: ["nouveau"], titre: "👋 Merci pour ta demande",
    sujet: "Ta demande sur la formation {formation} · Campus Magnus",
    email: "Bonjour {prenom},\n\nMerci pour ton intérêt pour la formation {formation} au Campus Magnus !\n\nJe suis {moi}, de l'équipe du Campus Magnus. Je suis là pour répondre à toutes tes questions : la formation, l'alternance, la recherche d'entreprise, le concours d'entrée…\n\nQuand es-tu disponible pour un petit appel de 10 minutes ? Réponds simplement à cet email." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus 👋 Merci pour ta demande sur la formation {formation} ! Quand es-tu dispo pour un petit appel de 10 min ?",
  },
  {
    id: "injoignable", cible: "lead", pour: ["nouveau", "contacte"], titre: "📞 Pas réussi à te joindre",
    sujet: "J'ai essayé de te joindre · Campus Magnus",
    email: "Bonjour {prenom},\n\nJ'ai essayé de t'appeler au sujet de la formation {formation}, sans réussir à te joindre.\n\nDis-moi quand tu es disponible (jour et heure) et je te rappelle." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. J'ai essayé de t'appeler pour la formation {formation}. Quand puis-je te rappeler ?",
  },
  {
    id: "jpo", cible: "lead", pour: ["nouveau", "contacte", "rdv"], titre: "🏫 Invitation portes ouvertes",
    sujet: "Viens découvrir le Campus Magnus le {date_jpo}",
    email: "Bonjour {prenom},\n\nNos portes ouvertes ont lieu le {date_jpo} au Campus Magnus, à Arles.\n\nTu pourras visiter l'école, rencontrer les formateurs et des étudiants en {formation}, et poser toutes tes questions sur l'alternance. Tu peux venir accompagné(e).\n\nJe serai ravi(e) de t'y accueillir." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Nos portes ouvertes ont lieu le {date_jpo} : viens visiter l'école et poser tes questions sur la formation {formation} ! Tu viens ?",
  },
  {
    id: "rdv", cible: "lead", pour: ["rdv"], titre: "🤝 Confirmation du rendez-vous",
    sujet: "Notre rendez-vous au Campus Magnus",
    email: "Bonjour {prenom},\n\nJe te confirme notre rendez-vous le {date_rdv} au Campus Magnus (45 boulevard Marcellin Berthelot, Arles).\n\nSi tu as un empêchement, préviens-moi en répondant à cet email." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Je te confirme notre RDV le {date_rdv} au campus (45 bd Marcellin Berthelot, Arles). À bientôt !",
  },
  {
    id: "dossier", cible: "lead", pour: ["dossier"], titre: "📝 As-tu pu remplir ton dossier ?",
    sujet: "Ton dossier de candidature · Campus Magnus",
    email: "Bonjour {prenom},\n\nAs-tu pu remplir ton dossier de candidature pour la formation {formation} ?\n\nSi tu bloques sur un point ou s'il te manque une pièce, dis-le-moi : je t'aide volontiers." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. As-tu pu remplir ton dossier pour la formation {formation} ? Si tu bloques, je t'aide !",
  },
  {
    id: "concours", cible: "lead", pour: ["convoque"], titre: "📅 Rappel du concours",
    sujet: "Rappel : ton entretien d'admission au Campus Magnus",
    email: "Bonjour {prenom},\n\nPetit rappel : ton entretien d'admission pour la formation {formation} a lieu le {entretien}, au Campus Magnus (45 boulevard Marcellin Berthelot, Arles).\n\nPense à apporter ton CV. En cas d'empêchement, préviens-moi en répondant à cet email." + FIN,
    sms: "Bonjour {prenom}, petit rappel : ton entretien d'admission au Campus Magnus a lieu le {entretien}. Pense à ton CV ! En cas d'empêchement, préviens-moi. {moi}",
  },
  {
    id: "apres_concours", cible: "lead", pour: ["present"], titre: "🙏 Merci d'être venu(e)",
    sujet: "Merci pour ta venue au Campus Magnus",
    email: "Bonjour {prenom},\n\nMerci d'être venu(e) passer ton entretien d'admission pour la formation {formation}.\n\nTu recevras ta réponse très vite. En attendant, n'hésite pas si tu as la moindre question." + FIN,
    sms: "Bonjour {prenom}, merci d'être venu(e) à ton entretien au Campus Magnus ! Tu auras ta réponse très vite. {moi}",
  },
  {
    id: "absent", cible: "lead", pour: ["absent"], titre: "🚫 On t'a attendu",
    sujet: "Ton entretien d'admission · Campus Magnus",
    email: "Bonjour {prenom},\n\nNous t'attendions pour ton entretien d'admission et tu n'as pas pu venir. J'espère que tout va bien.\n\nSi la formation {formation} t'intéresse toujours, on peut fixer une nouvelle date : dis-moi tes disponibilités." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. On t'attendait pour ton entretien : tout va bien ? Si tu veux, on fixe une nouvelle date.",
  },
  {
    id: "admis_lead", cible: "lead", pour: ["admis"], titre: "🎉 Tu es admis",
    sujet: "Félicitations, tu es admis au Campus Magnus 🎉",
    email: "Bonjour {prenom},\n\nFélicitations : tu es admis en {formation} au Campus Magnus pour la rentrée {rentree} 🎉\n\nTu vas recevoir un email pour créer ton espace MagnusMatch : tu y trouveras des offres d'alternance qui te correspondent.\n\nProchaine étape : trouver ton entreprise. On t'accompagne : offres, CV, préparation aux entretiens.\n\nBravo encore,\n{signature}",
    sms: "Bonjour {prenom}, félicitations, tu es admis en {formation} au Campus Magnus 🎉 Regarde tes emails pour créer ton espace MagnusMatch. {moi}",
  },
  {
    id: "relance", cible: "lead", pour: ["contacte", "rdv", "dossier"], titre: "🔁 Des nouvelles ?",
    sujet: "Où en es-tu dans ton projet ? · Campus Magnus",
    email: "Bonjour {prenom},\n\nJe reviens vers toi au sujet de la formation {formation}. Où en es-tu dans ton projet ?\n\nSi tu as des questions (alternance, concours, entreprise), je peux t'appeler quand tu veux." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Où en es-tu dans ton projet de formation {formation} ? Je peux t'appeler si tu as des questions.",
  },
  {
    id: "porte_ouverte", cible: "lead", pour: ["perdu"], titre: "🚪 La porte reste ouverte",
    sujet: "Bonne continuation · Campus Magnus",
    email: "Bonjour {prenom},\n\nMerci pour l'intérêt que tu as porté au Campus Magnus. Je te souhaite plein de réussite dans ton projet.\n\nSi un jour ton projet évolue, la porte reste ouverte : n'hésite pas à me recontacter." + FIN,
    sms: "Bonjour {prenom}, merci pour ton intérêt pour le Campus Magnus et bonne continuation ! Si ton projet évolue, la porte reste ouverte. {moi}",
  },

  /* ---------- Candidats (selon l'admission) ---------- */
  {
    id: "bienvenue", cible: "candidat", pour: ["admis"], titre: "🎉 Bienvenue au Campus",
    sujet: "Bienvenue au Campus Magnus 🎉",
    email: "Bonjour {prenom},\n\nBienvenue au Campus Magnus ! Ton espace MagnusMatch est prêt : {site}/espace\n\nTu y trouves des offres d'alternance choisies pour toi, ton CV et ta carte de visite. Pense à le compléter dès maintenant : plus ton profil est précis, meilleures sont les offres." + FIN,
    sms: "Bonjour {prenom}, bienvenue au Campus Magnus 🎉 Ton espace MagnusMatch t'attend avec des offres d'alternance pour toi : {site}/espace {moi}",
  },
  {
    id: "point_alternance", cible: "candidat", pour: ["admis", "admis_condition"], titre: "🔎 Point sur ta recherche",
    sujet: "Où en est ta recherche d'alternance ?",
    email: "Bonjour {prenom},\n\nOù en est ta recherche d'entreprise pour ton alternance ?\n\nCombien de candidatures as-tu envoyées ? As-tu des entretiens prévus ? Si tu veux, on fait un point ensemble sur ton CV et tes candidatures." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Où en est ta recherche d'alternance ? On fait un point ensemble cette semaine ?",
  },
  {
    id: "offres", cible: "candidat", pour: ["admis"], titre: "📬 De nouvelles offres pour toi",
    sujet: "De nouvelles offres d'alternance t'attendent",
    email: "Bonjour {prenom},\n\nDe nouvelles offres d'alternance qui te correspondent sont sur ton espace MagnusMatch : {site}/espace\n\nPostule vite : les entreprises reçoivent beaucoup de candidatures en ce moment." + FIN,
    sms: "Bonjour {prenom}, de nouvelles offres d'alternance t'attendent sur ton espace MagnusMatch : {site}/espace Postule vite ! {moi}",
  },
  {
    id: "entretien_embauche", cible: "candidat", pour: ["admis", "admis_condition"], titre: "🍀 Bonne chance pour ton entretien",
    sujet: "Bonne chance pour ton entretien !",
    email: "Bonjour {prenom},\n\nBonne chance pour ton entretien chez {entreprise_visee} ! Quelques conseils : renseigne-toi sur l'entreprise, prépare 2 exemples de ce que tu as déjà fait, et arrive 10 minutes en avance.\n\nDis-moi comment ça s'est passé." + FIN,
    sms: "Bonjour {prenom}, bonne chance pour ton entretien chez {entreprise_visee} ! Arrive 10 min en avance et sois toi-même 💪 Dis-moi comment ça s'est passé. {moi}",
  },
  {
    id: "condition", cible: "candidat", pour: ["admis_condition"], titre: "🟡 Ce qu'il manque pour ton admission",
    sujet: "Ton admission au Campus Magnus : dernière étape",
    email: "Bonjour {prenom},\n\nTu es admis(e) sous condition en {formation}. Pour confirmer ton admission, il nous manque : {condition}.\n\nEnvoie-le-moi dès que possible en répondant à cet email." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Pour confirmer ton admission en {formation}, il nous manque : {condition}. Merci de me l'envoyer vite !",
  },
  {
    id: "attente", cible: "candidat", pour: ["liste_attente"], titre: "⏳ Liste d'attente",
    sujet: "Ta candidature au Campus Magnus",
    email: "Bonjour {prenom},\n\nTa candidature en {formation} est sur liste d'attente. Je reviens vers toi dès qu'une place se libère.\n\nEn attendant, n'hésite pas à continuer ta recherche d'entreprise : un contrat signé peut faire avancer ton dossier." + FIN,
    sms: "Bonjour {prenom}, ta candidature en {formation} au Campus Magnus est sur liste d'attente. Je te préviens dès qu'une place se libère. {moi}",
  },
  {
    id: "refus", cible: "candidat", pour: ["refus"], titre: "❌ Réponse négative",
    sujet: "Ta candidature au Campus Magnus",
    email: "Bonjour {prenom},\n\nMerci pour ta candidature en {formation}. Nous ne pouvons malheureusement pas la retenir cette année.\n\nSi tu le souhaites, je peux t'expliquer pourquoi et t'orienter vers une autre formation.\n\nBon courage pour la suite,\n{signature}",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Je t'ai envoyé un email au sujet de ta candidature. Je reste dispo si tu veux en parler.",
  },
  {
    id: "abandon", cible: "candidat", pour: ["abandon"], titre: "🚪 On reste disponibles",
    sujet: "On reste disponibles · Campus Magnus",
    email: "Bonjour {prenom},\n\nTu as décidé d'arrêter ton parcours au Campus Magnus. Je respecte ton choix et te souhaite le meilleur.\n\nSi tu as besoin d'un conseil ou si ton projet évolue, n'hésite pas à revenir vers moi." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Je te souhaite le meilleur pour la suite. Si ton projet évolue, n'hésite pas à revenir vers nous !",
  },
  {
    id: "alumni_nouvelles", cible: "candidat", pour: ["alumni"], titre: "🎓 Des nouvelles, alumni ?",
    sujet: "Des nouvelles ? 🎓 Campus Magnus",
    email: "Bonjour {prenom},\n\nQue deviens-tu depuis ton diplôme ? Prends 1 minute pour mettre ton parcours à jour : {site}/espace/parcours\n\nEt si ton entreprise cherche un alternant, dis-le-nous : nos étudiants seront ravis de la rencontrer." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus 🎓 Que deviens-tu ? Mets ton parcours à jour en 1 min : {site}/espace/parcours",
  },
  {
    id: "alumni_temoignage", cible: "candidat", pour: ["alumni"], titre: "🎤 Témoigner aux portes ouvertes",
    sujet: "Viens témoigner aux portes ouvertes ?",
    email: "Bonjour {prenom},\n\nNos portes ouvertes ont lieu le {date_jpo}. Les futurs étudiants adorent écouter les anciens : accepterais-tu de venir 30 minutes raconter ton parcours ?\n\nDis-moi si tu es disponible." + FIN,
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Viendrais-tu 30 min raconter ton parcours aux futurs étudiants, aux portes ouvertes le {date_jpo} ?",
  },

  /* ---------- Entreprises (vouvoiement) ---------- */
  {
    id: "ent_merci", cible: "entreprise", pour: ["rencontree"], titre: "🤝 Merci pour la rencontre",
    sujet: "Suite à notre rencontre · Campus Magnus",
    email: "Bonjour {contact},\n\nMerci pour notre échange. Comme convenu, le Campus Magnus (EGC Business School et CFA Négoventis) forme des alternants en commerce, vente, gestion et tourisme.\n\nSi vous avez un besoin d'alternant, je vous propose des profils sélectionnés sous 48 h, gratuitement.\n\nBien cordialement,\n{signature}",
    sms: "Bonjour {contact}, c'est {moi} du Campus Magnus. Merci pour notre échange ! Si vous cherchez un alternant, je vous envoie des profils sous 48 h.",
  },
  {
    id: "ent_relance", cible: "entreprise", pour: ["en_discussion", "rencontree", "pas_maintenant"], titre: "🔁 Relance recrutement",
    sujet: "Recrutez-vous un alternant pour la rentrée {rentree} ?",
    email: "Bonjour {contact},\n\nNous préparons la rentrée {rentree}. {entreprise} aurait-elle un besoin d'alternant ?\n\nJe peux vous proposer des profils motivés, déjà sélectionnés par notre équipe, et vous aider pour les démarches du contrat.\n\nBien cordialement,\n{signature}",
    sms: "Bonjour {contact}, c'est {moi} du Campus Magnus. Recrutez-vous un alternant pour la rentrée {rentree} ? J'ai de très bons profils à vous proposer.",
  },
  {
    id: "ent_profils", cible: "entreprise", pour: ["recrute", "partenaire"], titre: "👥 Proposer des profils",
    sujet: "Des profils pour votre alternance",
    email: "Bonjour {contact},\n\nSuite à votre besoin, je vous propose le profil de {etudiant}, en {formation} au Campus Magnus.\n\nSeriez-vous disponible pour un entretien la semaine prochaine ?\n\nBien cordialement,\n{signature}",
    sms: "Bonjour {contact}, c'est {moi} du Campus Magnus. Je vous ai envoyé par email le profil de {etudiant} pour votre alternance. Un entretien la semaine prochaine ?",
  },
  {
    id: "ent_merci_partenaire", cible: "entreprise", pour: ["partenaire"], titre: "💚 Merci, partenaire",
    sujet: "Merci pour votre confiance · Campus Magnus",
    email: "Bonjour {contact},\n\nMerci pour votre confiance et pour l'accueil de nos alternants chez {entreprise}.\n\nComment se passe l'alternance de votre côté ? Je reste disponible pour tout point à faire.\n\nBien cordialement,\n{signature}",
    sms: "Bonjour {contact}, c'est {moi} du Campus Magnus. Merci pour l'accueil de nos alternants ! Comment ça se passe de votre côté ?",
  },
  {
    id: "ent_jobdating", cible: "entreprise", pour: [], titre: "📣 Invitation job dating",
    sujet: "Invitation : job dating alternance au Campus Magnus",
    email: "Bonjour {contact},\n\nNous organisons un job dating alternance le {date_jobdating} au Campus Magnus, à Arles.\n\nEn une matinée, vous rencontrez des candidats motivés et déjà sélectionnés. Puis-je compter sur la présence de {entreprise} ?\n\nBien cordialement,\n{signature}",
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

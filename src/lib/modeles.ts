/**
 * Modèles de messages pour les leads (email et SMS).
 * Variables remplacées automatiquement : {prenom} {formation} {rentree} {entretien} {moi} {poste}
 */
export type Modele = { id: string; titre: string; sujet: string; email: string; sms: string };

export const MODELES: Modele[] = [
  {
    id: "merci",
    titre: "👋 Merci pour ta demande",
    sujet: "Ta demande de brochure {formation} · Campus Magnus",
    email: "Bonjour {prenom},\n\nMerci pour ton intérêt pour la formation {formation} au Campus Magnus !\n\nJe suis {moi}, {poste}. Je suis là pour répondre à toutes tes questions : la formation, l'alternance, la recherche d'entreprise, le concours d'entrée…\n\nQuand es-tu disponible pour un petit appel de 10 minutes ? Réponds simplement à cet email.\n\nÀ très vite,\n{moi}\n{poste} · Campus Magnus",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus 👋 Merci pour ta demande sur la formation {formation} ! Quand es-tu dispo pour un petit appel de 10 min ?",
  },
  {
    id: "injoignable",
    titre: "📞 Je n'ai pas réussi à te joindre",
    sujet: "J'ai essayé de te joindre · Campus Magnus",
    email: "Bonjour {prenom},\n\nJ'ai essayé de t'appeler au sujet de la formation {formation}, sans réussir à te joindre.\n\nDis-moi quand tu es disponible (jour et heure) et je te rappelle.\n\nÀ bientôt,\n{moi}\n{poste} · Campus Magnus",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. J'ai essayé de t'appeler pour la formation {formation}. Quand puis-je te rappeler ?",
  },
  {
    id: "concours",
    titre: "📅 Rappel du concours",
    sujet: "Rappel : ton entretien d'admission au Campus Magnus",
    email: "Bonjour {prenom},\n\nPetit rappel : ton entretien d'admission pour la formation {formation} a lieu le {entretien}, au Campus Magnus.\n\nPense à apporter ton CV. En cas d'empêchement, préviens-moi en répondant à cet email.\n\nÀ très vite,\n{moi}\n{poste} · Campus Magnus",
    sms: "Bonjour {prenom}, petit rappel : ton entretien d'admission au Campus Magnus a lieu le {entretien}. Pense à ton CV ! En cas d'empêchement, préviens-moi. {moi}",
  },
  {
    id: "admis",
    titre: "🎉 Tu es admis",
    sujet: "Félicitations, tu es admis au Campus Magnus 🎉",
    email: "Bonjour {prenom},\n\nFélicitations : tu es admis en {formation} au Campus Magnus pour la rentrée {rentree} 🎉\n\nProchaine étape : trouver ton entreprise d'alternance. On t'accompagne : offres, CV, préparation aux entretiens.\n\nN'hésite pas si tu as la moindre question.\n\nBravo encore,\n{moi}\n{poste} · Campus Magnus",
    sms: "Bonjour {prenom}, félicitations, tu es admis en {formation} au Campus Magnus 🎉 On t'accompagne maintenant pour trouver ton entreprise. {moi}",
  },
  {
    id: "relance",
    titre: "🔁 Des nouvelles ?",
    sujet: "Où en es-tu dans ton projet ? · Campus Magnus",
    email: "Bonjour {prenom},\n\nJe reviens vers toi au sujet de la formation {formation}. Où en es-tu dans ton projet ?\n\nSi tu as des questions (alternance, concours, entreprise), je peux t'appeler quand tu veux.\n\nBelle journée,\n{moi}\n{poste} · Campus Magnus",
    sms: "Bonjour {prenom}, c'est {moi} du Campus Magnus. Où en es-tu dans ton projet de formation {formation} ? Je peux t'appeler si tu as des questions.",
  },
];

export function remplir(texte: string, v: Record<string, string>) {
  return texte.replace(/\{(\w+)\}/g, (m, k: string) => (k in v ? v[k] : m));
}

/** « 06 12 34 56 78 » → « +33612345678 » (numéros français), sinon chiffres et + seulement. */
export function telInternational(tel: string) {
  const n = tel.replace(/[^\d+]/g, "");
  if (/^0[1-9]\d{8}$/.test(n)) return `+33${n.slice(1)}`;
  if (/^0033\d{9}$/.test(n)) return `+${n.slice(2)}`;
  return n;
}

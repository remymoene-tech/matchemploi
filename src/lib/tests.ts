/**
 * Tests de personnalité proposés aux étudiants.
 * 1. DISC (15 questions, tableau de correspondance fourni par l'école).
 * 2. Style de management (10 séries de 4 phrases à hiérarchiser, grille fournie par l'école).
 */

export type Couleur = "rouge" | "jaune" | "vert" | "bleu";

export const COULEURS: { id: Couleur; nom: string; lettre: string; hex: string; resume: string; forces: string; vigilance: string; environnements: string }[] = [
  {
    id: "rouge", nom: "Rouge", lettre: "D", hex: "#d64545",
    resume: "Direct, décidé et tourné vers l'action. Aime les défis et les résultats concrets.",
    forces: "Prend des initiatives, décide vite, avance malgré les obstacles.",
    vigilance: "Peut paraître impatient ou trop direct ; prendre le temps d'écouter.",
    environnements: "Vente terrain, prospection, gestion de projet, entrepreneuriat.",
  },
  {
    id: "jaune", nom: "Jaune", lettre: "I", hex: "#d9a400",
    resume: "Enthousiaste, sociable et communicant. Aime convaincre et créer du lien.",
    forces: "Met de l'énergie dans l'équipe, à l'aise à l'oral, crée facilement le contact.",
    vigilance: "Peut se disperser ; soigner l'organisation et le suivi des détails.",
    environnements: "Accueil, vente en magasin, communication, événementiel, relation client.",
  },
  {
    id: "vert", nom: "Vert", lettre: "S", hex: "#2f9e5b",
    resume: "Calme, à l'écoute et fiable. Aime le travail d'équipe et un cadre stable.",
    forces: "Patient, loyal, rassurant pour les clients et les collègues, régulier dans le travail.",
    vigilance: "Peut avoir du mal avec les changements soudains ; oser donner son avis.",
    environnements: "Suivi client, ressources humaines, assistanat, social, santé.",
  },
  {
    id: "bleu", nom: "Bleu", lettre: "C", hex: "#2f6fd6",
    resume: "Rigoureux, précis et réfléchi. Aime les règles, la méthode et le travail bien fait.",
    forces: "Fiable sur les détails, analyse avant d'agir, recherche la qualité.",
    vigilance: "Peut être perfectionniste ou lent à décider ; accepter le « suffisamment bien ».",
    environnements: "Comptabilité, gestion, administration, informatique, qualité.",
  },
];

export const QUESTIONS_DISC: { q: string; choix: [string, string, string, string] }[] = [
  { q: "Concernant votre poignée de main :", choix: ["Elle est ferme et plutôt appuyée.", "Elle est rapide et plutôt chaleureuse.", "Elle est moyennement forte.", "Elle est discrète et vous n'aimez pas forcément serrer la main."] },
  { q: "Dans votre quotidien vous aimez :", choix: ["Relever les challenges et être tourné vers l'action.", "Être compréhensif et ne pas rentrer dans le conflit.", "Divertir et prendre plaisir avec les gens.", "Être prudent, réfléchi et ne pas donner votre confiance facilement."] },
  { q: "Quand vous vous exprimez, vous parlez plutôt :", choix: ["Fort car il est important de se faire entendre et d'impacter.", "Avec un très faible volume et lentement, vous aimez être discret.", "Avec de grandes variations vocales et un rythme très rapide.", "Avec un volume modéré et de manière calme, voire monocorde."] },
  { q: "C'est samedi, qu'avez-vous prévu :", choix: ["Partir à l'aventure sans me préoccuper des autres.", "Organiser un barbecue avec des amis.", "Ranger et mettre de l'ordre dans mes affaires.", "Aider une association locale et prendre mon temps."] },
  { q: "Quand vous échangez avec les autres :", choix: ["Vous parlez plus que vous n'écoutez et avez tendance à couper la parole et être affirmatif dans vos propos.", "Vous avez une grande capacité d'écoute ce qui est pour vous, un signe de respect.", "Vous adorez prendre part à une conversation. Discuter est essentiel pour vous, qu'importe le contenu.", "Vous préférez les échanges par email. Vous parlez peu et n'exprimez pas forcément vos sentiments."] },
  { q: "Concernant le regard :", choix: ["Vous regardez dans les yeux de manière soutenue en cherchant à évaluer votre interlocuteur.", "Vous avez un regard amical et chaleureux et cherchez à éveiller l'intérêt.", "Vous n'aimez pas qu'on vous regarde de manière fixe, vous détournez facilement le regard.", "Vos contacts visuels sont rares, voire inexistants, vous évitez le regard des autres."] },
  { q: "Quelles sont les qualités que vous aimez :", choix: ["Aller de l'avant, faire preuve de détermination, affronter les challenges.", "Le sens de l'humour, la répartie, l'optimisme et l'enthousiasme.", "Les règles, les procédures, la précision et la recherche de l'excellence.", "Faire preuve d'empathie, être ouvert aux autres et comprendre leurs sentiments."] },
  { q: "Vos principales peurs :", choix: ["Que l'on tire avantage de vous.", "Faire face à des changements soudains, à l'instabilité permanente.", "Être critiqué pour votre travail, l'absence de qualité et de précision.", "L'ignorance des autres, être délaissé."] },
  { q: "Dans une réunion vous êtes celui qui :", choix: ["Propose de nouvelles idées et est toujours de bonne humeur.", "Aime décider et imposer ses idées pour avancer.", "Se conforme aux règles, procédures et suit scrupuleusement l'agenda de la réunion.", "S'attache à la cohésion du groupe et aux sentiments des autres."] },
  { q: "Au travail vous êtes :", choix: ["Formel, rationnel, structuré et concret.", "Attentionné, pratique et altruiste.", "Interactif, social et amical.", "Efficace, rapide, structuré et occupé."] },
  { q: "Parmi les métiers suivants, quel est celui que vous choisiriez :", choix: ["Avocat, comptable, informaticien pour la précision et l'analyse.", "Thérapeute, infirmier ou coach, pour le don de soi et l'écoute.", "Sportif, entrepreneur, cadre dirigeant pour les challenges et la compétition.", "Cadre commercial, publiciste, journaliste pour le relationnel et les interactions."] },
  { q: "Concernant votre mode de réflexion :", choix: ["Vous réfléchissez à voix haute et n'hésitez pas à exprimer vos ressentis.", "Vous allez rapidement à l'essentiel et décidez vite avec un minimum d'informations.", "Votre réflexion est lente et profonde.", "Vous aimez analyser les choses et rentrer dans les détails, ce qui peut vous paralyser dans votre prise de décision."] },
  { q: "Au niveau de votre espace personnel :", choix: ["Même avec vos proches, vous gardez votre distance.", "Vous occupez l'espace et n'hésitez pas à rentrer dans l'espace privé de votre interlocuteur.", "Vous restez à distance et prenez uniquement vos aises quand une relation profonde vous lie avec votre interlocuteur.", "Vous êtes très rapidement tactile et familier avec votre interlocuteur, voire trop."] },
  { q: "La structure de vos emails :", choix: ["Au maximum 3 lignes, sans forcément de salutations. Ils sont courts et vont à l'essentiel.", "Vos emails sont moyennement longs et vous n'hésitez pas à utiliser des smileys et raconter une anecdote.", "Les courriels que vous rédigez sont complets, détaillés, très longs et souvent avec des pièces jointes.", "Vos emails sont plutôt longs, détaillés et personnels avec des formules de politesse."] },
  { q: "Quand vous donnez votre opinion lors d'une conversation :", choix: ["Vous n'hésitez pas à donner votre opinion directement et sans filtres.", "Vous êtes très spontané, voire trop de temps en temps.", "Vous prenez le temps avant de répondre et vous exprimez plus en termes de données et de faits qu'en opinion générale.", "Vous vérifiez que les personnes comprennent vos propos et faites attention à ne pas les froisser."] },
];

/** Tableau des correspondances : pour chaque question, la lettre qui compte pour Rouge, Jaune, Vert, Bleu. */
const CORRESPONDANCES_DISC: [string, string, string, string][] = [
  ["a", "b", "c", "d"], ["a", "c", "b", "d"], ["a", "c", "b", "d"], ["a", "b", "d", "c"], ["a", "c", "b", "d"],
  ["a", "b", "c", "d"], ["a", "b", "d", "c"], ["a", "d", "b", "c"], ["b", "a", "d", "c"], ["d", "c", "b", "a"],
  ["c", "d", "b", "a"], ["b", "a", "c", "d"], ["b", "d", "c", "a"], ["a", "b", "d", "c"], ["a", "b", "d", "c"],
];

export type ResultatDisc = { scores: Record<Couleur, number>; dominante: Couleur; secondaire: Couleur };

/** Calcule les couleurs à partir des 15 réponses (lettres a à d). */
export function calculerDisc(reponses: string[]): ResultatDisc {
  const ordre: Couleur[] = ["rouge", "jaune", "vert", "bleu"];
  const scores: Record<Couleur, number> = { rouge: 0, jaune: 0, vert: 0, bleu: 0 };
  reponses.forEach((r, i) => {
    const k = CORRESPONDANCES_DISC[i]?.indexOf(r);
    if (k !== undefined && k >= 0) scores[ordre[k]]++;
  });
  const tri = [...ordre].sort((a, b) => scores[b] - scores[a]);
  return { scores, dominante: tri[0], secondaire: tri[1] };
}

/* ---------- Style de management ---------- */

export type Style = "diriger" | "entrainer" | "epauler" | "deleguer";

export const STYLES: { id: Style; nom: string; mots: string; hex: string; resume: string }[] = [
  { id: "diriger", nom: "Diriger", mots: "Explique · Apporte · Montre", hex: "#2f6fd6", resume: "Donne des consignes claires, montre comment faire et décide." },
  { id: "entrainer", nom: "Entraîner", mots: "Observe · Conseille · Fait faire", hex: "#d9a400", resume: "Accompagne pas à pas, observe et conseille pour faire progresser." },
  { id: "epauler", nom: "Épauler", mots: "Écoute · Propose · Encourage", hex: "#2f9e5b", resume: "Écoute, encourage et renforce la confiance pour que l'autre décide." },
  { id: "deleguer", nom: "Déléguer", mots: "Mentor · Challenger · Reconnaître", hex: "#d64545", resume: "Fait confiance, confie des responsabilités et laisse l'autonomie." },
];

/** 10 séries de 4 phrases. Le style de chaque phrase vient de la grille de l'école (IN, EN, SP, ME). */
export const SERIES_MANAGEMENT: { theme: string; phrases: { texte: string; style: Style }[] }[] = [
  { theme: "Le changement", phrases: [
    { texte: "Pour faire accepter un changement, j'accompagne mes collaborateurs en les encourageant.", style: "epauler" },
    { texte: "Dans les situations de changement, je parle généralement du contexte et des objectifs du changement et je laisse mes collaborateurs décider comment appliquer le changement.", style: "deleguer" },
    { texte: "Dans les situations de changement, j'explique la raison de celui-ci et le quoi et comment faire à mes collaborateurs.", style: "diriger" },
    { texte: "Après avoir observé les comportements en situation de changement de mes collaborateurs, j'ajuste avec eux les moyens de la mise en œuvre, pour une meilleure efficacité.", style: "entrainer" },
  ] },
  { theme: "Les décisions", phrases: [
    { texte: "Généralement, je laisse mes collaborateurs prendre les décisions qui vont dans le sens de leur développement.", style: "deleguer" },
    { texte: "Généralement, je prends les décisions qui vont dans le sens du développement de mes collaborateurs.", style: "diriger" },
    { texte: "Généralement, j'écoute mes collaborateurs pour renforcer leur confiance dans leur prise de décisions.", style: "epauler" },
    { texte: "Généralement, j'aide mes collaborateurs à trouver les moyens de prendre de bonnes décisions.", style: "entrainer" },
  ] },
  { theme: "Les responsabilités", phrases: [
    { texte: "J'aime confier des responsabilités à mon collaborateur.", style: "deleguer" },
    { texte: "J'encourage mon collaborateur à exprimer son point de vue.", style: "epauler" },
    { texte: "Je parle souvent de mes propres expériences.", style: "diriger" },
    { texte: "J'aide mon collaborateur à se faire sa propre opinion.", style: "entrainer" },
  ] },
  { theme: "L'initiative", phrases: [
    { texte: "Je challenge mes collaborateurs sur leur prise d'initiative personnelle.", style: "epauler" },
    { texte: "J'apporte des idées applicables pour mes collaborateurs.", style: "diriger" },
    { texte: "J'aide mon collaborateur à prendre des initiatives.", style: "entrainer" },
    { texte: "J'encourage la pensée créative et la recherche d'idées.", style: "deleguer" },
  ] },
  { theme: "Les conflits", phrases: [
    { texte: "Dans les situations de conflit au sein de mon équipe, je demande généralement aux personnes de résoudre leurs problèmes de manière autonome.", style: "deleguer" },
    { texte: "Dans les situations de conflit au sein de mon équipe, je participe à la résolution du conflit en écoutant et conseillant.", style: "entrainer" },
    { texte: "Dans les situations de conflit au sein de mon équipe, je montre à mes collaborateurs qu'ils sont capables de résoudre ce problème.", style: "epauler" },
    { texte: "Dans les situations de conflit au sein de mon équipe, je montre comment faire pour sortir de cette situation rapidement.", style: "diriger" },
  ] },
  { theme: "Les objectifs", phrases: [
    { texte: "Généralement, je demande à mes collaborateurs de fixer les objectifs à atteindre.", style: "deleguer" },
    { texte: "Je motive mon collaborateur à fixer lui-même ses propres objectifs.", style: "epauler" },
    { texte: "Généralement, je donne des objectifs clairs à mes collaborateurs.", style: "diriger" },
    { texte: "J'aide mes collaborateurs à savoir déterminer leurs objectifs.", style: "entrainer" },
  ] },
  { theme: "Les réunions", phrases: [
    { texte: "Lors des discussions et des réunions, j'encourage mes collaborateurs à prendre la parole.", style: "epauler" },
    { texte: "Lors des discussions et des réunions, je prends la parole pour les développer.", style: "diriger" },
    { texte: "Lors des discussions et des réunions, je prends le temps de leur donner des conseils sur leurs interventions.", style: "entrainer" },
    { texte: "Lors des discussions et des réunions, j'aime laisser d'autres personnes mener la conversation.", style: "deleguer" },
  ] },
  { theme: "L'implication", phrases: [
    { texte: "Je pense que les personnes s'impliquent davantage dans les décisions qu'elles prennent elles-mêmes.", style: "deleguer" },
    { texte: "Je pense que l'implication des collaborateurs dans mes décisions dépend de leur savoir-faire.", style: "diriger" },
    { texte: "Je pense que l'implication dans la réalisation d'une tâche est liée à la confiance en soi du collaborateur.", style: "epauler" },
    { texte: "Je pense que l'implication du collaborateur nécessite qu'il maîtrise totalement les moyens de réaliser une tâche.", style: "entrainer" },
  ] },
  { theme: "Les tâches difficiles", phrases: [
    { texte: "Je pense que mes collaborateurs peuvent réaliser de manière autonome leurs tâches, y compris les tâches difficiles.", style: "deleguer" },
    { texte: "Je motive mon collaborateur à réaliser toutes les tâches, même les plus difficiles.", style: "epauler" },
    { texte: "Je donne des instructions claires pour la réalisation de tâches accessibles.", style: "diriger" },
    { texte: "J'évalue avec mes collaborateurs les moyens à leur apporter pour qu'ils accomplissent toutes les tâches, y compris les difficiles.", style: "entrainer" },
  ] },
  { theme: "Les conseils", phrases: [
    { texte: "Quand un collaborateur demande un conseil, je l'écoute sur ses solutions et le motive à prendre sa décision.", style: "epauler" },
    { texte: "Quand un collaborateur demande un conseil, je lui explique comment faire pour prendre sa décision.", style: "diriger" },
    { texte: "Quand un collaborateur demande un conseil, je l'aide à réfléchir à des solutions pour qu'il puisse prendre sa décision seul.", style: "entrainer" },
    { texte: "Quand un collaborateur demande un conseil, je le laisse prendre sa décision.", style: "deleguer" },
  ] },
];

export type ResultatManagement = { scores: Record<Style, number>; dominant: Style };

/**
 * Chaque série se hiérarchise de 1 à 4 (4 = me ressemble le plus). Chaque série vaut donc 10 points,
 * et le total des 4 styles fait 100, comme dans la grille Excel.
 */
export function calculerManagement(classements: number[][]): ResultatManagement | null {
  const scores: Record<Style, number> = { diriger: 0, entrainer: 0, epauler: 0, deleguer: 0 };
  for (let s = 0; s < SERIES_MANAGEMENT.length; s++) {
    const rangs = classements[s];
    if (!rangs || [...rangs].sort().join() !== "1,2,3,4") return null; // saisie erronée ou incomplète
    rangs.forEach((r, i) => (scores[SERIES_MANAGEMENT[s].phrases[i].style] += r));
  }
  const dominant = (Object.keys(scores) as Style[]).sort((a, b) => scores[b] - scores[a])[0];
  return { scores, dominant };
}

export type TestId = "disc" | "management";
export const TESTS: { id: TestId; nom: string; duree: string; description: string }[] = [
  { id: "disc", nom: "Test DISC : ta couleur", duree: "5 minutes · 15 questions", description: "Découvre ton style de personnalité : Rouge, Jaune, Vert ou Bleu." },
  { id: "management", nom: "Style de management", duree: "10 minutes · 10 séries", description: "Classe 4 phrases dans chaque série pour découvrir ta façon d'accompagner les autres." },
];

export type ResultatTest = {
  id: string;
  candidat_id: string;
  test: TestId;
  reponses: unknown;
  scores: Record<string, number>;
  dominante: string;
  passe_par: string;
  created_at: string;
};

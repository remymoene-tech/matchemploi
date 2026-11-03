import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Candidat, Offre, Piste } from "@/lib/types";
import { attentesTexte } from "@/lib/attentes";

/**
 * Modèle léger et économique par défaut (≈ 40 fois moins cher que le plus puissant).
 * Pour plus de finesse, mettre IA_MODELE=claude-opus-5-5 dans les variables Vercel.
 */
const MODELE = process.env.IA_MODELE || "claude-haiku-5-5";

/** L'IA n'est utilisée que si la clé ANTHROPIC_API_KEY est renseignée. */
export function iaConfiguree() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function ia() {
  if (!iaConfiguree()) throw new Error("IA non configurée : ajoute ANTHROPIC_API_KEY");
  return (client ??= new Anthropic()); // lit ANTHROPIC_API_KEY
}

/** Appel commun : la réponse est un JSON validé par le schéma. */
async function demander<T extends z.ZodType>(
  schema: T,
  content: Anthropic.ContentBlockParam[] | string,
  effort: "low" | "medium" = "medium",
): Promise<z.infer<T>> {
  const res = await ia().messages.parse({
    model: MODELE,
    max_tokens: 16000,
    output_config: { effort, format: zodOutputFormat(schema) },
    messages: [{ role: "user", content }],
  });
  if (res.stop_reason === "refusal") throw new Error("Demande refusée par le modèle");
  if (!res.parsed_output) throw new Error("Réponse illisible du modèle");
  return res.parsed_output;
}

// ---------- 1. Lecture d'un CV (PDF) + conseils d'amélioration ----------
const ConseilsSchema = z.object({
  note: z.number().int().min(1).max(10).describe("Note globale du CV sur 10, honnête et encourageante"),
  resume: z.string().describe("2 phrases maximum : l'impression générale, en tutoyant le candidat"),
  points_forts: z.array(z.string()).describe("2 à 3 points forts du CV, phrases courtes"),
  ameliorations: z.array(
    z.object({
      categorie: z.enum(["Mise en page", "Personnalisation", "Description du projet", "Expériences", "Compétences", "Photo", "Orthographe", "Formation", "Coordonnées"]),
      priorite: z.enum(["important", "conseillé"]),
      conseil: z.string().describe("Conseil concret et actionnable, en tutoyant, 1 à 2 phrases"),
      exemple: z.string().describe("Exemple de réécriture tiré de SON CV (avant → après), ou chaîne vide"),
    }),
  ).describe("3 à 8 améliorations, les plus importantes en premier"),
  mise_en_page: z.object({
    avis: z.enum(["personnalisée", "trop modèle", "trop IA", "trop modèle et trop IA"]),
    explication: z.string().describe("1 à 2 phrases : ce qui fait cet effet (ou ce qui rend le CV personnel)"),
  }),
  description_proposee: z.string().describe("Description personnalisée de 2 à 3 lignes, à la 1re personne, à mettre en haut du CV"),
});
export type ConseilsCV = z.infer<typeof ConseilsSchema>;

const CvSchema = z.object({
  texte: z.string().describe("Contenu utile du CV en texte brut : expériences, formations, compétences, langues. 4000 caractères maximum."),
  competences: z.array(z.string()).describe("10 compétences clés maximum, 1 à 4 mots chacune"),
  mots_cles: z.string().describe("1 à 3 mots-clés de métier pour chercher des offres sur France Travail, séparés par des virgules, ex. 'assistant commercial'"),
  conseils: ConseilsSchema,
});

export async function lireCV(pdfBase64: string, posteVise: string, projet = "") {
  return demander(
    CvSchema,
    [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
      {
        type: "text",
        text: `Voici le CV d'une personne qui cherche un emploi ou une alternance en France. Poste visé : « ${posteVise || "non précisé"} ».
Son projet, décrit avec ses mots : « ${projet || "non précisé"} ».

1. Extrais son contenu utile (texte, compétences, mots-clés). N'y mets pas l'âge, la date de naissance, l'adresse, la photo, la nationalité ni la situation familiale.

2. Comme un conseiller en insertion bienveillant, donne des conseils pour améliorer ce CV en vue du poste visé :
- expériences trop vagues (missions, résultats chiffrés, verbes d'action), compétences manquantes ou mal mises en valeur, accroche, mise en page et lisibilité, fautes d'orthographe (cite-les), coordonnées manquantes (email, téléphone).
- Photo : s'il y en a une, commente uniquement des éléments techniques et de présentation (cadrage, netteté, lumière, fond neutre, tenue adaptée au métier visé). Ne commente JAMAIS le physique, l'âge, l'apparence, la couleur de peau, la coiffure ou le style vestimentaire religieux ou culturel. S'il n'y a pas de photo, ne la réclame pas : en France elle est facultative.
- Mise en page (regarde le rendu visuel des pages) : un recruteur doit sentir une vraie personne, pas un modèle.
  « Trop modèle » : modèle Canva ou générateur reconnaissable (jauges ou étoiles de compétences, barres de progression, pictogrammes partout, colonne latérale très colorée, trop de couleurs ou de polices, texte difficile à lire par les logiciels de recrutement).
  « Trop IA » : formulations génériques qu'on retrouve partout (« dynamique et motivé », « passionné », « rigoureux et autonome », « force de proposition »), phrases creuses sans exemple ni chiffre, ton impersonnel.
  Dans ces cas, ajoute une amélioration « Mise en page » ou « Personnalisation » qui explique quoi changer concrètement (structure sobre, une couleur, des détails vrais et propres à la personne).
- Description du projet : le CV doit commencer par 2 à 3 lignes qui disent qui est la personne et ce qu'elle cherche (poste, type de contrat, rythme, date). Si elle manque ou reste vague, ajoute une amélioration « Description du projet » (priorité important).
  Dans tous les cas, rédige "description_proposee" : 2 à 3 lignes à la 1re personne, naturelles, avec des éléments vrais tirés de son CV et de son projet, sans aucune formule toute faite.
- Dans "exemple", propose une réécriture tirée de SON CV quand c'est utile.
Tutoie la personne, reste concret et encourageant.`,
      },
    ],
    "medium",
  );
}

export async function motsClesDepuisProfil(c: Pick<Candidat, "poste_vise" | "formation" | "projet">) {
  const r = await demander(
    z.object({ mots_cles: z.string() }),
    `Donne 1 à 3 mots-clés de métier (séparés par des virgules) pour chercher des offres sur France Travail pour ce profil.
Poste visé : ${c.poste_vise}
Formation : ${c.formation}
Projet : ${c.projet}`,
    "low",
  );
  return r.mots_cles;
}

/** Codes métier ROME (ex. D1214) pour un poste : La bonne alternance cherche par code. Mis en cache. */
const cacheRome = new Map<string, string[]>();
export async function codesRome(poste: string): Promise<string[]> {
  const cle = poste.trim().toLowerCase();
  if (!cle) return [];
  if (cacheRome.has(cle)) return cacheRome.get(cle)!;
  try {
    const r = await demander(
      z.object({ codes: z.array(z.string()).describe("1 à 3 codes ROME, format lettre + 4 chiffres, ex. D1214") }),
      `Donne les 1 à 3 codes ROME (nomenclature France Travail) qui correspondent le mieux à ce métier, du plus proche au moins proche.
Métier : ${poste}`,
      "low",
    );
    const codes = [...new Set(r.codes.map((x) => x.trim().toUpperCase()).filter((x) => /^[A-N]\d{4}$/.test(x)))].slice(0, 3);
    cacheRome.set(cle, codes);
    return codes;
  } catch {
    return [];
  }
}

// ---------- 2. Lecture d'une annonce collée ----------
const AnnonceSchema = z.object({
  entreprise: z.string(),
  intitule: z.string(),
  contrat: z.enum(["alternance", "cdi", "cdd", "interim", "stage", ""]),
  lieu: z.string(),
  salaire: z.string(),
  description: z.string().describe("Missions, profil recherché et compétences attendues, 1500 caractères maximum"),
  contact_nom: z.string(),
  contact_email: z.string(),
});

export async function lireAnnonce(texte: string) {
  return demander(
    AnnonceSchema,
    `Voici le texte d'une offre d'emploi copiée depuis un site d'annonces. Remplis la fiche ; chaîne vide si l'information est absente.

${texte.slice(0, 15000)}`,
    "low",
  );
}

// ---------- 3. Notation candidat × offres ----------
const NotesSchema = z.object({
  notes: z.array(
    z.object({
      offre: z.string().describe("Identifiant court de l'offre, ex. O3"),
      score: z.number().int().min(0).max(100),
      forts: z.array(z.string()).describe("3 points forts maximum, 2 à 6 mots chacun"),
      manques: z.array(z.string()).describe("0 à 3 manques, 2 à 6 mots chacun"),
      resume: z.string().describe("Une phrase qui explique la note"),
    }),
  ),
});
export type Note = { offre_id: string; score: number; forts: string[]; manques: string[]; resume: string };

function profil(c: Candidat) {
  const permis = { permis_vehicule: "permis + véhicule", permis: "permis sans véhicule", non: "pas de permis" }[c.permis] ?? "non précisé";
  return `Formation : ${c.formation || "?"}
Poste visé : ${c.poste_vise || "?"}
Contrats recherchés : ${c.contrats.join(", ") || "?"}
Secteur : ${c.ville || "?"} ${c.code_postal} (mobilité ${c.mobilite_km} km) · ${permis}
${c.contrats.includes("alternance") ? `Rythme d'alternance : ${c.rythme || "?"}\n` : ""}Disponibilité : ${c.disponibilite || "?"}
Projet : ${c.projet || "?"}
Compétences : ${c.competences.join(", ") || "?"}
CV : ${(c.cv_texte || "non fourni").slice(0, 4000)}${c.disc ? `
Profil DISC (test de personnalité passé avec son école) : dominante ${c.disc.dominante}, secondaire ${c.disc.secondaire} (rouge = décidé et orienté action, jaune = communicant et enthousiaste, vert = à l'écoute et stable, bleu = rigoureux et précis).
Utilise ce profil UNIQUEMENT pour ajuster de 5 points au maximum le savoir-être attendu par l'offre (relationnel, rigueur, autonomie, rythme). Ne baisse jamais fortement une note à cause de lui seul, et cite-le dans les points forts s'il aide.` : ""}`;
}

function offreTexte(o: Offre) {
  return `${o.intitule} — ${o.entreprise || "entreprise non communiquée"}
Contrat : ${o.contrat_libelle || o.contrat || "?"} · Lieu : ${o.lieu || "?"}${o.salaire ? ` · Salaire : ${o.salaire}` : ""}
${o.description.slice(0, 2500)}${o.attentes ? `\n${attentesTexte(o.attentes)}` : ""}`;
}

/** Note jusqu'à ~8 offres pour un candidat en un seul appel. */
export type Refus = { intitule: string; entreprise: string; lieu: string; contrat: string; raison: string };

export async function noterOffres(c: Candidat, offres: Offre[], refus: Refus[] = [], contexte = ""): Promise<Note[]> {
  const cle = new Map(offres.map((o, i) => [`O${i + 1}`, o.id]));
  const r = await demander(
    NotesSchema,
    `Tu es conseiller en recrutement. Évalue la correspondance entre ce candidat et chacune des offres.

Barème sur 100 :
- 40 pts : compétences, expériences et diplôme face aux missions et au profil demandés
- 25 pts : cohérence avec le poste visé et le projet professionnel
- 20 pts : géographie (lieu de l'offre vs secteur et mobilité, permis si utile)
- 15 pts : type de contrat, rythme et date de début compatibles
Une information manquante compte pour la moitié des points du critère.
N'utilise jamais l'âge, le sexe, l'origine, la nationalité, la situation familiale, l'apparence ou le handicap.
Sois exigeant : 75 ou plus veut dire « candidature à envoyer sans hésiter ».
Si une offre contient « ATTENTES DE L'ENTREPRISE », utilise-les en priorité dans chaque critère (diplôme, expérience, permis, rythme, date, horaires, qualités) et cite-les dans les points forts ou les manques (ex. « Rythme 2 j / 3 j compatible », « Permis obligatoire »). La personnalité recherchée se compare au profil DISC du candidat s'il existe, sans dépasser ±5 points. Un élément rédhibitoire clairement présent dans le profil fait nettement baisser la note.

CANDIDAT
${profil(c)}
${refus.length ? `
OFFRES QUE LE CANDIDAT A ÉCARTÉES, ET POURQUOI (ses préférences réelles, à respecter en priorité)
${refus.map((r) => `- « ${r.intitule} »${r.entreprise ? ` chez ${r.entreprise}` : ""} (${[r.lieu, r.contrat].filter(Boolean).join(", ")}) → ${r.raison}`).join("\n")}
Si une offre ressemble à une offre écartée pour la même raison (même distance, même métier, même type de contrat, même secteur…), baisse nettement sa note et cite cette raison dans les manques.
` : ""}
${contexte ? `${contexte}\n` : ""}
OFFRES
${offres.map((o, i) => `[O${i + 1}]\n${offreTexte(o)}`).join("\n\n")}

Donne une note pour chaque offre (${[...cle.keys()].join(", ")}).`,
  );
  return r.notes
    .filter((n) => cle.has(n.offre))
    .map((n) => ({
      offre_id: cle.get(n.offre)!,
      score: Math.max(0, Math.min(100, Math.round(n.score))),
      forts: n.forts.slice(0, 3),
      manques: n.manques.slice(0, 3),
      resume: n.resume.slice(0, 300),
    }));
}

// ---------- 4. Fiche de préparation d'entretien ----------
const PreparationSchema = z.object({
  entreprise: z.object({
    resume: z.string().describe("2 à 3 phrases : ce que fait l'entreprise. Uniquement des faits sûrs (annonce ou entreprise très connue)."),
    a_savoir: z.array(z.string()).describe("2 à 5 choses utiles à savoir, sûres uniquement"),
    a_verifier: z.array(z.string()).describe("3 à 5 recherches concrètes que le candidat doit faire lui-même avant l'entretien"),
  }),
  poste: z.object({
    resume: z.string().describe("1 à 2 phrases : le rôle en clair"),
    missions: z.array(z.string()).describe("3 à 6 missions principales"),
  }),
  pitch: z.string().describe("Présentation orale de 30 secondes, à la 1re personne, avec des éléments vrais du CV, ton naturel"),
  mettre_en_avant: z.array(z.string()).describe("3 à 5 atouts du candidat pour CE poste, chacun avec un exemple tiré du CV"),
  points_a_preparer: z.array(z.object({ point: z.string(), reponse: z.string().describe("Comment en parler positivement, 1 à 2 phrases") })).describe("2 à 4 points faibles ou manques à préparer"),
  questions_probables: z.array(z.object({ question: z.string(), piste: z.string().describe("Piste de réponse adaptée au candidat, 1 à 2 phrases") })).describe("5 à 7 questions que le recruteur posera probablement"),
  questions_a_poser: z.array(z.string()).describe("3 à 5 questions intelligentes à poser au recruteur"),
  pratique: z.array(z.string()).describe("3 à 5 conseils pratiques : trajet depuis chez lui, tenue adaptée au secteur, documents à apporter, ponctualité"),
});
export type Preparation = z.infer<typeof PreparationSchema>;

export type Source = { titre: string; url: string };

/**
 * Recherche sur internet ce qu'il faut savoir sur l'entreprise (site, activité, actualités).
 * Renvoie null si la recherche n'est pas possible : la fiche est alors faite sans.
 */
export async function rechercherEntreprise(o: Offre): Promise<{ notes: string; sources: Source[] } | null> {
  if (!o.entreprise) return null;
  const consigne = `Fais des recherches sur internet sur l'entreprise « ${o.entreprise} »${o.lieu ? ` (${o.lieu})` : ""}, pour un candidat qui passe un entretien pour le poste « ${o.intitule} ».
Cherche : son activité et ses produits ou services, sa taille approximative, ses clients, son implantation locale, ses valeurs, et ses actualités récentes (12 derniers mois).
Fais au maximum 4 recherches. Vérifie qu'il s'agit bien de la bonne entreprise (même nom ET même ville ou secteur) ; en cas de doute, dis-le.
Réponds en français, en notes courtes et factuelles. Termine par la mention « Incertain : … » pour tout ce que tu n'as pas pu confirmer.`;
  try {
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: consigne }];
    const sources = new Map<string, string>();
    let notes = "";
    for (let tour = 0; tour < 3; tour++) {
      const res = await ia().messages.create({
        model: MODELE,
        max_tokens: 6000,
        output_config: { effort: "low" },
        tools: [{
          type: "web_search_20250305",
          name: "web_search",
          max_uses: 4,
          user_location: { type: "approximate", country: "FR" },
        }],
        messages,
      });
      for (const b of res.content) {
        if (b.type === "text") {
          notes += b.text;
          for (const cit of b.citations ?? []) if (cit.type === "web_search_result_location") sources.set(cit.url, cit.title ?? cit.url);
        }
        if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
          for (const r of b.content) if (!sources.has(r.url)) sources.set(r.url, r.title);
        }
      }
      if (res.stop_reason !== "pause_turn") break; // la recherche a demandé une pause : on la laisse continuer
      messages.push({ role: "assistant", content: res.content });
    }
    if (!notes.trim()) return null;
    return { notes: notes.slice(0, 6000), sources: [...sources].slice(0, 8).map(([url, titre]) => ({ url, titre })) };
  } catch (e) {
    console.error("Recherche sur l'entreprise impossible", e);
    return null;
  }
}

export async function preparerEntretien(c: Candidat, o: Offre, forts: string[], manques: string[], recherche?: string | null) {
  return demander(
    PreparationSchema,
    `Tu es conseiller en insertion professionnelle. Prépare une fiche d'entretien d'embauche pour ce candidat, pour cette offre précise.
Tutoie le candidat, sois concret, encourageant et réaliste.

RÈGLE ABSOLUE SUR L'ENTREPRISE : n'invente rien. N'écris sur l'entreprise que ce qui figure dans l'annonce, dans la recherche internet ci-dessous (sauf les points marqués incertains), ou des faits très connus et certains si c'est une grande entreprise nationale.
Si la recherche internet contient des actualités récentes utiles, mets-les dans "a_savoir" et propose une question à poser qui s'en inspire. Si tu ne connais pas l'entreprise, dis-le simplement dans le résumé (« L'annonce présente… ») et mets dans "a_verifier" les recherches à faire (site internet, page LinkedIn, avis Google, actualités locales, produits ou clients). Ne donne aucun chiffre (effectif, chiffre d'affaires, date de création) dont tu n'es pas certain.

CANDIDAT
${profil(c)}

OFFRE
${offreTexte(o)}

Analyse déjà faite : points forts ${forts.join(", ") || "?"} ; manques ${manques.join(", ") || "aucun"}.
${recherche ? `
RECHERCHE INTERNET SUR L'ENTREPRISE (notes brutes)
${recherche}` : "\n(Aucune recherche internet disponible : appuie-toi sur l'annonce et liste les vérifications à faire.)"}`,
    "medium",
  );
}

// ---------- 5. Pistes : métiers voisins à partir de l'expérience ----------
const PistesSchema = z.object({
  pistes: z.array(z.object({
    metier: z.string().describe("Intitulé de métier court et courant, ex. « Conseiller clientèle »"),
    mots_cles: z.string().describe("1 à 3 mots-clés de recherche d'offres pour ce métier"),
    raison: z.string().describe("1 à 2 phrases en tutoyant, qui citent une expérience ou une compétence PRÉCISE de son CV"),
  })).describe("2 ou 3 métiers voisins"),
});

/** Propose 2-3 métiers que le candidat n'a pas demandés mais pour lesquels son expérience est un vrai atout. */
export async function proposerPistes(c: Candidat, dejaRecherches: string[], aEviter: string[]): Promise<Piste[]> {
  const r = await demander(
    PistesSchema,
    `Tu es conseiller en évolution professionnelle. À partir du CV et du projet de ce candidat, propose 2 ou 3 métiers VOISINS qu'il n'a pas demandés, mais pour lesquels son expérience réelle est un atout concret et qui recrutent souvent, au même niveau de qualification.
Reste réaliste et proche de son projet : pas de reconversion lointaine, pas de métier qui demande un diplôme qu'il n'a pas.
Ses recherches actuelles (à ne pas reproposer) : ${dejaRecherches.join(", ") || "aucune"}.
Métiers qu'il a déjà refusés (à ne pas reproposer) : ${aEviter.join(", ") || "aucun"}.

CANDIDAT
${profil(c)}`,
    "low",
  );
  return r.pistes.slice(0, 3).map((p) => ({ metier: p.metier, mots_cles: p.mots_cles, raison: p.raison }));
}

// ---------- 6. Synthèse globale (entretien + tests + profil) ----------
const SyntheseSchema = z.object({
  equipe: z.object({
    portrait: z.string().describe("3 à 4 phrases : qui est ce candidat, sa posture, sa maturité de projet"),
    points_forts: z.array(z.string()).describe("3 à 5 points forts, concrets"),
    vigilance: z.array(z.string()).describe("2 à 4 points de vigilance, francs mais respectueux"),
    accompagnement: z.string().describe("Recommandation d'accompagnement : niveau (autonome / à accompagner / renforcé) et actions concrètes"),
    postes_adaptes: z.array(z.string()).describe("3 à 5 postes ou types de missions adaptés"),
    entreprises_adaptees: z.string().describe("Type d'entreprise et de tuteur qui lui conviendrait (taille, ambiance, style de management)"),
    prochaines_etapes: z.array(z.string()).describe("3 à 5 prochaines étapes concrètes pour l'équipe"),
  }),
  etudiant: z.object({
    message: z.string().describe("3 à 4 phrases en tutoyant, bienveillantes et motivantes, sur ce qui ressort de son profil"),
    points_forts: z.array(z.string()).describe("3 à 5 atouts, formulés pour lui"),
    axes_progres: z.array(z.string()).describe("2 à 3 axes de progrès formulés positivement, sans jugement"),
    postes_adaptes: z.array(z.string()).describe("3 à 5 postes ou missions qui lui correspondent"),
    conseils: z.array(z.string()).describe("3 à 5 conseils concrets pour sa recherche et ses entretiens"),
  }),
});
export type Synthese = z.infer<typeof SyntheseSchema>;

export async function redigerSynthese(c: Candidat, entretien: string, disc: string, management: string) {
  return demander(
    SyntheseSchema,
    `Tu es conseiller en insertion dans une école en alternance. Rédige la synthèse globale d'un candidat à partir de son profil, de l'entretien mené par son conseiller et de ses deux tests.

Deux versions :
- "equipe" : pour l'équipe pédagogique uniquement. Franche, précise, utile pour décider de l'accompagnement et des entreprises à lui proposer.
- "etudiant" : pour le candidat lui-même. Tutoiement, bienveillante, tournée vers la progression. RÈGLE ABSOLUE : ne cite et ne paraphrase JAMAIS les remarques, jugements ou réponses de l'entretien (il ne doit pas savoir ce que le conseiller a noté). Appuie-toi sur ses tests, son CV et son projet, et transforme les difficultés en conseils positifs.
N'utilise jamais l'âge, le sexe, l'origine, la santé ou la situation familiale. Le DISC et le style de management décrivent des préférences, pas des capacités : présente-les avec nuance.

PROFIL ET CV
${profil(c)}

ENTRETIEN AVEC LE CONSEILLER (confidentiel)
${entretien}

TEST DISC
${disc}

TEST STYLE DE MANAGEMENT
${management}`,
    "medium",
  );
}

// ---------- 7. CV amélioré (réécriture fidèle, sans rien inventer) ----------
const CvAmelioreSchema = z.object({
  nom: z.string(),
  titre: z.string().describe("Titre du CV : poste visé et type de contrat, ex. « Assistante commerciale en alternance »"),
  accroche: z.string().describe("2 à 3 lignes à la 1re personne : qui je suis, ce que je cherche (poste, contrat, rythme, date, lieu)"),
  coordonnees: z.array(z.string()).describe("Ville, email, téléphone, permis… uniquement ceux connus"),
  experiences: z.array(z.object({
    poste: z.string(),
    entreprise: z.string(),
    lieu: z.string(),
    dates: z.string().describe("Dates telles que dans le CV, ou « [à compléter] »"),
    missions: z.array(z.string()).describe("2 à 4 missions, chacune commence par un verbe d'action ; chiffres uniquement s'ils sont dans le CV"),
  })),
  formations: z.array(z.object({ diplome: z.string(), etablissement: z.string(), dates: z.string() })),
  competences: z.array(z.object({ categorie: z.string().describe("ex. Relation client, Outils, Langues"), elements: z.array(z.string()) })),
  centres_interet: z.array(z.string()).describe("0 à 4, seulement s'ils sont dans le CV"),
  a_completer: z.array(z.string()).describe("Liste des informations manquantes que le candidat doit ajouter lui-même"),
});
export type CvAmeliore = z.infer<typeof CvAmelioreSchema>;

export async function ameliorerCV(c: Candidat, conseils: string) {
  return demander(
    CvAmelioreSchema,
    `Tu es conseiller en recrutement. Réécris le CV de ce candidat pour le poste qu'il vise, dans une structure sobre et efficace.

RÈGLES ABSOLUES :
- N'invente RIEN : aucune expérience, aucune entreprise, aucune date, aucun diplôme, aucun chiffre qui ne figure pas dans son CV ou son profil.
- Si une information utile manque (dates, ville, nom d'entreprise), écris « [à compléter] » et ajoute-la dans "a_completer".
- Reformule les missions avec des verbes d'action et des phrases concrètes, en gardant le sens exact.
- Écris une accroche personnelle à partir de son projet, sans formules toutes faites (« dynamique et motivé », « passionné »…).
- N'indique ni âge, ni date de naissance, ni photo, ni nationalité, ni situation familiale.
- Expériences de la plus récente à la plus ancienne.

Conseils déjà donnés sur son CV, à appliquer : ${conseils || "aucun"}

CANDIDAT
Nom : ${c.nom}
Email : ${c.email}${c.telephone ? ` · Téléphone : ${c.telephone}` : ""}${c.linkedin_url ? ` · LinkedIn : ${c.linkedin_url.replace(/^https?:\/\/(www\.)?/, "")}` : ""}
${profil(c)}`,
    "medium",
  );
}

// ---------- LinkedIn : analyse d'un profil (PDF et/ou captures) ou kit de création ----------
export const CATEGORIES_LINKEDIN = ["Photo", "Bannière", "Titre", "Infos", "Expériences", "Formation", "Compétences", "Recommandations", "Réseau", "Activité", "Paramètres", "Cohérence avec le CV"] as const;
const LinkedinSchema = z.object({
  note: z.number().int().min(0).max(10).describe("Note du profil sur 10 ; 0 s'il n'y a pas encore de profil"),
  resume: z.string().describe("2 phrases maximum, en tutoyant : impression générale, ou encouragement à créer son profil"),
  points_forts: z.array(z.string()).describe("0 à 3 points forts du profil, phrases courtes"),
  photo_banniere: z.string().describe("Avis sur la photo et la bannière si une capture les montre, sinon chaîne vide"),
  titre_propose: z.string().describe("Titre LinkedIn proposé (sous le nom), 220 caractères maximum, ex. « Futur conseiller de vente en alternance · BTS NDRC · Salon-de-Provence »"),
  infos_proposee: z.string().describe("Texte « Infos » proposé, 4 à 6 phrases à la 1re personne, vrai et personnel, sans formule toute faite"),
  competences_a_mettre: z.array(z.string()).describe("Les 5 compétences à mettre en avant, avec les mots que les recruteurs recherchent"),
  ameliorations: z.array(z.object({
    categorie: z.enum(CATEGORIES_LINKEDIN),
    priorite: z.enum(["important", "conseillé"]),
    conseil: z.string().describe("Conseil concret, en tutoyant, 1 à 2 phrases"),
    exemple: z.string().describe("Exemple de réécriture (avant → après) ou chaîne vide"),
  })).describe("3 à 8 améliorations, les plus importantes en premier"),
  mots_cles_manquants: z.array(z.string()).describe("Mots-clés du métier visé absents du profil (vide s'il n'y a pas de profil)"),
  ecarts_cv: z.array(z.string()).describe("Différences entre le profil et le CV (dates, postes, intitulés), vide si aucune ou pas de profil"),
});
export type AnalyseLinkedin = z.infer<typeof LinkedinSchema> & { mode: "analyse" | "creation" };

export async function analyserLinkedin(
  fichiers: { type: "pdf" | "image"; media: string; data: string }[],
  c: Pick<Candidat, "poste_vise" | "projet" | "formation" | "cv_texte" | "competences" | "contrats" | "ville">,
): Promise<AnalyseLinkedin> {
  const creation = !fichiers.length;
  const blocs: Anthropic.ContentBlockParam[] = fichiers.map((f) =>
    f.type === "pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } }
      : { type: "image", source: { type: "base64", media_type: f.media as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: f.data } },
  );
  const profil = `Poste visé : ${c.poste_vise || "non précisé"} · Contrats : ${c.contrats?.join(", ") || "non précisé"} · Ville : ${c.ville || "non précisée"}
Formation : ${c.formation || "non précisée"}
Projet (ses mots) : ${c.projet || "non précisé"}
Compétences du CV : ${c.competences?.join(", ") || "—"}
CV (texte) : ${(c.cv_texte || "pas de CV déposé").slice(0, 3500)}`;
  const consigne = creation
    ? `Cette personne n'a PAS encore de profil LinkedIn. Prépare son kit de départ à partir de son CV et de son projet :
- note = 0, points_forts vide, photo_banniere vide, mots_cles_manquants et ecarts_cv vides ;
- titre_propose, infos_proposee et competences_a_mettre prêts à copier ;
- ameliorations = les étapes les plus utiles pour créer un bon profil (photo, bannière, titre, infos, expériences, formation, compétences, réseau, paramètres « Open to work » visible des recruteurs seulement), adaptées à son métier.`
    : `Voici son profil LinkedIn (PDF et/ou captures d'écran). Comme un conseiller en insertion bienveillant, aide-la à l'améliorer pour le poste visé :
- note honnête et encourageante, points forts ;
- photo et bannière : seulement si une capture les montre. Commente UNIQUEMENT la technique et la présentation (cadrage, netteté, lumière, fond, tenue adaptée au métier, bannière par défaut ou personnalisée). Ne commente JAMAIS le physique, l'âge, l'apparence, la couleur de peau, la coiffure, ni un signe religieux ou culturel ;
- titre, section Infos, expériences (trop vagues ? résultats ? verbes d'action), formation, compétences, recommandations, réseau, activité ;
- mots-clés du métier qui manquent ; différences avec le CV ;
- titre_propose et infos_proposee : versions améliorées prêtes à copier, avec des éléments vrais tirés de son profil et de son CV.`;
  const r = await demander(
    LinkedinSchema,
    [
      ...blocs,
      {
        type: "text",
        text: `${consigne}

N'invente aucun fait (diplôme, entreprise, date, chiffre) : si une information manque, écris « [à compléter] ».
Pas de formules creuses (« dynamique et motivé », « passionné », « force de proposition »). Tutoie la personne, reste concret.
N'utilise jamais l'âge, le sexe, l'origine, la religion, la situation familiale ni le handicap.

Son profil MagnusMatch :
${profil}`,
      },
    ],
    "medium",
  );
  return { ...r, mode: creation ? "creation" : "analyse" };
}

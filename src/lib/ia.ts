import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Candidat, Offre } from "@/lib/types";

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
CV : ${(c.cv_texte || "non fourni").slice(0, 4000)}`;
}

function offreTexte(o: Offre) {
  return `${o.intitule} — ${o.entreprise || "entreprise non communiquée"}
Contrat : ${o.contrat_libelle || o.contrat || "?"} · Lieu : ${o.lieu || "?"}${o.salaire ? ` · Salaire : ${o.salaire}` : ""}
${o.description.slice(0, 2500)}`;
}

/** Note jusqu'à ~8 offres pour un candidat en un seul appel. */
export type Refus = { intitule: string; entreprise: string; lieu: string; contrat: string; raison: string };

export async function noterOffres(c: Candidat, offres: Offre[], refus: Refus[] = []): Promise<Note[]> {
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

CANDIDAT
${profil(c)}
${refus.length ? `
OFFRES QUE LE CANDIDAT A ÉCARTÉES, ET POURQUOI (ses préférences réelles, à respecter en priorité)
${refus.map((r) => `- « ${r.intitule} »${r.entreprise ? ` chez ${r.entreprise}` : ""} (${[r.lieu, r.contrat].filter(Boolean).join(", ")}) → ${r.raison}`).join("\n")}
Si une offre ressemble à une offre écartée pour la même raison (même distance, même métier, même type de contrat, même secteur…), baisse nettement sa note et cite cette raison dans les manques.
` : ""}
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

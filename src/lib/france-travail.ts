import "server-only";
import type { Candidat } from "@/lib/types";
import { departementDepuisCP } from "@/lib/types";

/**
 * API "Offres d'emploi v2" de France Travail (gratuite).
 * Identifiants à créer sur https://francetravail.io (FRANCE_TRAVAIL_CLIENT_ID / _SECRET).
 */
const TOKEN_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const SEARCH_URL = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search";

let jeton: { valeur: string; expire: number } | null = null;

export function franceTravailConfigure() {
  return Boolean(process.env.FRANCE_TRAVAIL_CLIENT_ID && process.env.FRANCE_TRAVAIL_CLIENT_SECRET);
}

async function obtenirJeton() {
  if (jeton && jeton.expire > Date.now() + 30_000) return jeton.valeur;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.FRANCE_TRAVAIL_CLIENT_ID!,
      client_secret: process.env.FRANCE_TRAVAIL_CLIENT_SECRET!,
      scope: "api_offresdemploiv2 o2dsoffre",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`France Travail : connexion refusée (${res.status})`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  jeton = { valeur: data.access_token, expire: Date.now() + data.expires_in * 1000 };
  return jeton.valeur;
}

type OffreFT = {
  id: string;
  intitule?: string;
  description?: string;
  dateCreation?: string;
  lieuTravail?: { libelle?: string; latitude?: number; longitude?: number };
  entreprise?: { nom?: string };
  typeContrat?: string;
  typeContratLibelle?: string;
  natureContrat?: string;
  alternance?: boolean;
  salaire?: { libelle?: string };
  origineOffre?: { urlOrigine?: string };
};

export type OffreImportee = {
  source: "france_travail";
  source_id: string;
  entreprise: string;
  intitule: string;
  contrat: string;
  contrat_libelle: string;
  lieu: string;
  departement: string;
  salaire: string;
  description: string;
  lien: string;
  publiee_le: string | null;
  latitude: number | null;
  longitude: number | null;
};

function convertir(o: OffreFT, departement: string): OffreImportee {
  const alternance = o.alternance || /apprentissage|professionnalisation/i.test(o.natureContrat ?? "");
  const contrat = alternance
    ? "alternance"
    : o.typeContrat === "CDI" ? "cdi"
    : o.typeContrat === "CDD" ? "cdd"
    : o.typeContrat === "MIS" ? "interim"
    : (o.typeContrat ?? "").toLowerCase();
  return {
    source: "france_travail",
    source_id: o.id,
    entreprise: o.entreprise?.nom ?? "",
    intitule: o.intitule ?? "",
    contrat,
    contrat_libelle: alternance ? `Alternance · ${o.typeContratLibelle ?? ""}`.trim() : o.typeContratLibelle ?? "",
    lieu: o.lieuTravail?.libelle ?? "",
    departement,
    salaire: o.salaire?.libelle ?? "",
    description: (o.description ?? "").slice(0, 6000),
    lien: o.origineOffre?.urlOrigine ?? `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
    publiee_le: o.dateCreation ?? null,
    latitude: o.lieuTravail?.latitude ?? null,
    longitude: o.lieuTravail?.longitude ?? null,
  };
}

async function chercher(params: Record<string, string>): Promise<OffreFT[]> {
  const url = `${SEARCH_URL}?${new URLSearchParams(params)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${await obtenirJeton()}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 204) return []; // aucun résultat
  if (!res.ok) throw new Error(`France Travail : recherche impossible (${res.status})`);
  const data = (await res.json()) as { resultats?: OffreFT[] };
  return data.resultats ?? [];
}

/** Cherche les offres récentes qui correspondent aux critères d'un candidat. */
export async function offresPourCandidat(c: Candidat): Promise<OffreImportee[]> {
  const departement = departementDepuisCP(c.code_postal);
  const motsCles = (c.mots_cles || c.poste_vise).split(",")[0].trim().slice(0, 60);
  if (!motsCles) return [];

  const base: Record<string, string> = { motsCles, range: "0-29", publieeDepuis: "31", sort: "1" };
  if (c.code_commune) {
    // Rayon autour de la commune du candidat (France Travail accepte jusqu'à 200 km)
    base.commune = c.code_commune;
    base.distance = String(Math.max(1, Math.min(200, c.mobilite_km || 20)));
  } else if (departement) {
    base.departement = departement;
  }

  const recherches: Record<string, string>[] = [];
  if (c.contrats.includes("alternance")) {
    recherches.push({ ...base, natureContrat: "E2" }); // apprentissage
    recherches.push({ ...base, natureContrat: "FS" }); // professionnalisation
  }
  const types = [
    c.contrats.includes("cdi") && "CDI",
    c.contrats.includes("cdd") && "CDD",
    c.contrats.includes("interim") && "MIS",
  ].filter(Boolean) as string[];
  if (types.length) recherches.push({ ...base, typeContrat: types.join(",") });
  if (!recherches.length) recherches.push(base);

  const vues = new Map<string, OffreImportee>();
  for (const p of recherches) {
    for (const o of await chercher(p)) {
      if (!vues.has(o.id)) vues.set(o.id, convertir(o, departement));
    }
  }
  return [...vues.values()];
}

/** Test de connexion pour la page de diagnostic (n'affiche jamais les identifiants). */
export async function testerFranceTravail(): Promise<{ etat: "non_configure" | "ok" | "erreur"; detail: string }> {
  if (!franceTravailConfigure()) return { etat: "non_configure", detail: "Identifiants absents dans Vercel." };
  try {
    await obtenirJeton();
  } catch (e) {
    return {
      etat: "erreur",
      detail: `Connexion refusée : vérifie l'identifiant et la clé secrète (sans espace), et que l'API « Offres d'emploi v2 » est bien ajoutée à ton application. ${e instanceof Error ? e.message : ""}`,
    };
  }
  try {
    const offres = await chercher({ motsCles: "vendeur", departement: "13", range: "0-4" });
    return { etat: "ok", detail: `Connexion réussie : recherche test « vendeur » dans les Bouches-du-Rhône → ${offres.length} offre(s) reçue(s).` };
  } catch (e) {
    return {
      etat: "erreur",
      detail: `Connexion OK mais la recherche est refusée : ajoute l'API « Offres d'emploi v2 » à ton application France Travail. ${e instanceof Error ? e.message : ""}`,
    };
  }
}

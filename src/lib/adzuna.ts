import "server-only";
import type { Candidat } from "@/lib/types";
import { departementDepuisCP } from "@/lib/types";

/**
 * API Adzuna (agrégateur d'offres, gratuit) : https://developer.adzuna.com
 * Variables Vercel : ADZUNA_APP_ID et ADZUNA_APP_KEY.
 */
export function adzunaConfigure() {
  return Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
}

type OffreAdzuna = {
  id: string;
  title?: string;
  description?: string;
  created?: string;
  redirect_url?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  latitude?: number;
  longitude?: number;
  contract_type?: "permanent" | "contract";
  contract_time?: "full_time" | "part_time";
  salary_min?: number;
  salary_max?: number;
};

export type OffreAdzunaImportee = {
  source: "adzuna";
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

const sansBalises = (s = "") => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

function convertir(o: OffreAdzuna, departement: string): OffreAdzunaImportee {
  const titre = sansBalises(o.title);
  const texte = `${titre} ${sansBalises(o.description)}`;
  const alternance = /alternan|apprenti|contrat pro/i.test(texte);
  const contrat = alternance ? "alternance"
    : /\bstage\b|stagiaire/i.test(texte) ? "stage"
    : /int[ée]rim/i.test(texte) ? "interim"
    : o.contract_type === "permanent" ? "cdi"
    : o.contract_type === "contract" ? "cdd" : "";
  const libelles: Record<string, string> = { alternance: "Alternance", stage: "Stage", interim: "Intérim", cdi: "CDI", cdd: "CDD" };
  const salaire = o.salary_min
    ? `${Math.round(o.salary_min).toLocaleString("fr-FR")}${o.salary_max && o.salary_max !== o.salary_min ? ` – ${Math.round(o.salary_max).toLocaleString("fr-FR")}` : ""} € par an (estimation)`
    : "";
  return {
    source: "adzuna",
    source_id: String(o.id),
    entreprise: sansBalises(o.company?.display_name),
    intitule: titre,
    contrat,
    contrat_libelle: [libelles[contrat], o.contract_time === "part_time" ? "temps partiel" : ""].filter(Boolean).join(" · "),
    lieu: o.location?.display_name ?? "",
    departement,
    salaire,
    description: sansBalises(o.description).slice(0, 4000),
    lien: o.redirect_url ?? "",
    publiee_le: o.created ?? null,
    latitude: typeof o.latitude === "number" ? o.latitude : null,
    longitude: typeof o.longitude === "number" ? o.longitude : null,
  };
}

async function chercher(params: Record<string, string>): Promise<OffreAdzuna[]> {
  const url = `https://api.adzuna.com/v1/api/jobs/fr/search/1?${new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID!,
    app_key: process.env.ADZUNA_APP_KEY!,
    results_per_page: "30",
    max_days_old: "31",
    sort_by: "date",
    "content-type": "application/json",
    ...params,
  })}`;
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Adzuna : recherche impossible (${res.status})`);
  const data = (await res.json()) as { results?: OffreAdzuna[] };
  return data.results ?? [];
}

/** Offres Adzuna autour de la commune du candidat, pour ses mots-clés et ses types de contrat. */
export async function offresAdzunaPourCandidat(c: Candidat): Promise<OffreAdzunaImportee[]> {
  const motsCles = (c.mots_cles || c.poste_vise).split(",")[0].trim().slice(0, 60);
  const ou = c.ville || c.code_postal;
  if (!motsCles || !ou) return [];
  const base = { where: ou, distance: String(Math.max(1, Math.min(200, c.mobilite_km || 20))) };
  const departement = departementDepuisCP(c.code_postal);

  const recherches: Record<string, string>[] = [];
  if (c.contrats.includes("alternance")) recherches.push({ ...base, what: `${motsCles} alternance` });
  if (c.contrats.some((t) => t !== "alternance")) recherches.push({ ...base, what: motsCles });

  const vues = new Map<string, OffreAdzunaImportee>();
  for (const p of recherches) {
    for (const o of await chercher(p)) {
      const conv = convertir(o, departement);
      if (!vues.has(conv.source_id)) vues.set(conv.source_id, conv);
    }
  }
  return [...vues.values()];
}

/** Test de connexion pour la page de diagnostic (n'affiche jamais les identifiants). */
export async function testerAdzuna(): Promise<{ etat: "non_configure" | "ok" | "erreur"; detail: string }> {
  if (!adzunaConfigure()) return { etat: "non_configure", detail: "Identifiants absents dans Vercel (ADZUNA_APP_ID et ADZUNA_APP_KEY)." };
  try {
    const r = await chercher({ what: "vendeur", where: "Marseille", results_per_page: "5" });
    return { etat: "ok", detail: `Connexion réussie : recherche test « vendeur » à Marseille → ${r.length} offre(s) reçue(s).` };
  } catch (e) {
    return { etat: "erreur", detail: `Connexion refusée : vérifie l'App ID et l'App Key (sans espace). ${e instanceof Error ? e.message : ""}` };
  }
}

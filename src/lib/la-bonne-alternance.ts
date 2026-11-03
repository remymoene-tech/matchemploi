import "server-only";
import type { Candidat } from "@/lib/types";
import { departementDepuisCP } from "@/lib/types";
import { codesRome, iaConfiguree } from "@/lib/ia";

/**
 * API La bonne alternance (service public de l'apprentissage) : https://api.apprentissage.beta.gouv.fr
 * Offres d'alternance de La bonne alternance et de ses partenaires.
 * Variable Vercel : LBA_API_TOKEN (jeton personnel créé sur le site).
 */
const URL_API = "https://api.apprentissage.beta.gouv.fr/api/job/v1/search";

export function lbaConfigure() {
  return Boolean(process.env.LBA_API_TOKEN);
}

type OffreLBA = {
  identifier?: { id?: string | null; partner_job_id?: string; partner_label?: string };
  workplace?: {
    name?: string | null; brand?: string | null; legal_name?: string | null;
    location?: { address?: string; geopoint?: { coordinates?: [number, number] } };
  };
  apply?: { url?: string };
  contract?: { type?: string[]; start?: string | null; duration?: number | null };
  offer?: { title?: string; description?: string; desired_skills?: string[]; publication?: { creation?: string | null }; target_diploma?: { label?: string } | null };
};

export type OffreLBAImportee = {
  source: "la_bonne_alternance";
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

const propre = (s = "") => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function convertir(o: OffreLBA): OffreLBAImportee | null {
  const id = o.identifier?.id || o.identifier?.partner_job_id;
  const titre = propre(o.offer?.title);
  if (!id || !titre) return null;
  const adresse = o.workplace?.location?.address ?? "";
  const cp = adresse.match(/\b(\d{5})\b/)?.[1] ?? "";
  const ville = cp ? adresse.slice(adresse.indexOf(cp) + 5).replace(/^[\s,]+/, "").trim() : "";
  const [lon, lat] = o.workplace?.location?.geopoint?.coordinates ?? [];
  const types = o.contract?.type ?? [];
  const extras = [
    o.offer?.target_diploma?.label ? `Diplôme visé : ${o.offer.target_diploma.label}` : "",
    o.offer?.desired_skills?.length ? `Compétences attendues : ${o.offer.desired_skills.join(", ")}` : "",
    o.contract?.duration ? `Durée du contrat : ${o.contract.duration} mois` : "",
  ].filter(Boolean).join("\n");
  return {
    source: "la_bonne_alternance",
    source_id: `${o.identifier?.partner_label ?? "lba"}:${id}`.slice(0, 200),
    entreprise: propre(o.workplace?.brand || o.workplace?.name || o.workplace?.legal_name || ""),
    intitule: titre,
    contrat: "alternance",
    contrat_libelle: ["Alternance", ...types].join(" · "),
    lieu: ville ? `${cp.slice(0, 2)} - ${ville}` : adresse,
    departement: departementDepuisCP(cp),
    salaire: "",
    description: `${propre(o.offer?.description)}${extras ? `\n\n${extras}` : ""}`.slice(0, 4000),
    lien: o.apply?.url ?? "",
    publiee_le: o.offer?.publication?.creation ?? null,
    latitude: typeof lat === "number" ? lat : null,
    longitude: typeof lon === "number" ? lon : null,
  };
}

type ReponseLBA = { jobs?: OffreLBA[]; recruiters?: unknown[]; warnings?: { message: string; code: string }[] };

async function appeler(params: Record<string, string>): Promise<ReponseLBA> {
  const res = await fetch(`${URL_API}?${new URLSearchParams(params)}`, {
    cache: "no-store",
    headers: { Accept: "application/json", Authorization: `Bearer ${process.env.LBA_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`recherche impossible (${res.status}) ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return (await res.json()) as ReponseLBA;
}

async function chercher(params: Record<string, string>): Promise<OffreLBA[]> {
  return (await appeler(params)).jobs ?? [];
}

/**
 * Offres d'alternance autour du candidat. L'API cherche par codes métier (ROME) :
 * MagnusMatch les déduit du poste visé.
 * Les offres venant de France Travail sont ignorées si France Travail est déjà branché (pas de doublons).
 */
export async function offresLBAPourCandidat(c: Candidat, sansFranceTravail: boolean): Promise<OffreLBAImportee[]> {
  if (c.contrats.length && !c.contrats.includes("alternance")) return [];
  if (c.latitude == null || c.longitude == null || !iaConfiguree()) return [];
  const romes = await codesRome(c.poste_vise || c.mots_cles);
  if (!romes.length) return [];
  const jobs = await chercher({
    romes: romes.join(","),
    latitude: String(c.latitude),
    longitude: String(c.longitude),
    radius: String(Math.max(1, Math.min(200, c.mobilite_km || 30))),
  });
  const vues = new Map<string, OffreLBAImportee>();
  for (const j of jobs) {
    if (sansFranceTravail && /france travail|p[ôo]le emploi/i.test(j.identifier?.partner_label ?? "")) continue;
    const o = convertir(j);
    if (o && !vues.has(o.source_id)) vues.set(o.source_id, o);
  }
  return [...vues.values()].slice(0, 60);
}

/** Test de connexion pour la page de diagnostic (n'affiche jamais le jeton). */
export async function testerLBA(): Promise<{ etat: "non_configure" | "ok" | "erreur"; detail: string }> {
  if (!lbaConfigure()) return { etat: "non_configure", detail: "Jeton absent dans Vercel (LBA_API_TOKEN)." };
  try {
    // Vente (D1211, D1214, D1106) autour de Salon-de-Provence, puis sans limite de lieu
    const romes = "D1211,D1214,D1106";
    const [local, france] = await Promise.all([
      appeler({ romes, latitude: "43.64", longitude: "5.10", radius: "60" }),
      appeler({ romes }),
    ]);
    const n = (r: ReponseLBA) => `${r.jobs?.length ?? 0} offre(s), ${r.recruiters?.length ?? 0} entreprise(s) qui recrutent`;
    const alertes = [...(local.warnings ?? []), ...(france.warnings ?? [])].map((w) => `${w.code} : ${w.message}`);
    return {
      etat: "ok",
      detail: `Connexion réussie. Test « vente » à 60 km de Salon-de-Provence : ${n(local)}. Toute la France : ${n(france)}.${alertes.length ? ` Avertissements : ${[...new Set(alertes)].join(" ; ")}` : ""}`,
    };
  } catch (e) {
    return { etat: "erreur", detail: `Connexion refusée : vérifie le jeton (copié en entier, sans espace). ${e instanceof Error ? e.message : ""}` };
  }
}

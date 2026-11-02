import "server-only";

/**
 * Géolocalisation avec les services publics gratuits de l'État :
 * - geo.api.gouv.fr (communes par code postal)
 * - Base Adresse Nationale (recherche d'un lieu par son nom)
 */
export type Point = { latitude: number; longitude: number };

const sansAccents = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "force-cache", signal: AbortSignal.timeout(6000) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** Commune du candidat : code INSEE (pour France Travail) + coordonnées (pour la carte). */
export async function localiserCommune(codePostal: string, ville: string): Promise<(Point & { code: string; nom: string }) | null> {
  const cp = codePostal.replace(/\s/g, "");
  type Commune = { nom: string; code: string; centre?: { coordinates: [number, number] } };
  let communes: Commune[] | null = null;
  if (/^\d{5}$/.test(cp)) {
    communes = await json<Commune[]>(`https://geo.api.gouv.fr/communes?codePostal=${cp}&fields=nom,code,centre&format=json`);
  }
  if ((!communes || !communes.length) && ville) {
    communes = await json<Commune[]>(
      `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(ville)}&fields=nom,code,centre&boost=population&limit=1&format=json`,
    );
  }
  if (!communes?.length) return null;
  const choix = communes.find((c) => sansAccents(c.nom) === sansAccents(ville)) ?? communes[0];
  if (!choix.centre) return null;
  const [longitude, latitude] = choix.centre.coordinates;
  return { code: choix.code, nom: choix.nom, latitude, longitude };
}

/** Coordonnées d'un lieu d'offre écrit librement (« 13 - Salon-de-Provence », « Lyon 3e »…). */
export async function localiserLieu(lieu: string): Promise<Point | null> {
  const q = lieu.replace(/^\s*\d{2,3}\s*-\s*/, "").replace(/\(\d+\)/g, "").trim();
  if (q.length < 2) return null;
  type Rep = { features?: { geometry: { coordinates: [number, number] } }[] };
  const urls = [
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=1`,
    `https://data.geopf.fr/geocodage/search?q=${encodeURIComponent(q)}&index=address&type=municipality&limit=1`,
  ];
  for (const url of urls) {
    const r = await json<Rep>(url);
    const f = r?.features?.[0];
    if (f) return { longitude: f.geometry.coordinates[0], latitude: f.geometry.coordinates[1] };
  }
  return null;
}

/** Distance à vol d'oiseau en km. */
export function distanceKm(a: Point, b: Point) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Durée de validité d'une offre de l'équipe : elle se ferme toute seule à la date d'expiration. */
export const DUREES_OFFRE = [
  { id: "7", label: "1 semaine" },
  { id: "14", label: "2 semaines" },
  { id: "30", label: "1 mois" },
  { id: "60", label: "2 mois" },
  { id: "90", label: "3 mois" },
  { id: "aucune", label: "Sans limite" },
] as const;

/** « garder » = date inchangée ; sinon nouvelle date calculée à partir d'aujourd'hui. */
export function lireExpiration(f: FormData, actuelle: string | null | undefined): string | null {
  const v = String(f.get("duree_offre") ?? "garder");
  if (v === "garder") return actuelle ?? null;
  if (v === "aucune") return null;
  const jours = Number(v);
  return Number.isFinite(jours) && jours > 0 ? new Date(Date.now() + jours * 864e5).toISOString() : actuelle ?? null;
}

export const estExpiree = (o: { expire_le?: string | null }, maintenant = Date.now()) =>
  !!o.expire_le && new Date(o.expire_le).getTime() <= maintenant;

/** « Expire dans 5 jours » / « Expirée le 3 nov. ». */
export function texteExpiration(expire: string | null | undefined, maintenant: number) {
  if (!expire) return null;
  const d = new Date(expire);
  const jours = Math.ceil((d.getTime() - maintenant) / 864e5);
  const date = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
  if (jours <= 0) return { texte: `⌛ Expirée le ${date}`, chip: "chip-minus" };
  if (jours <= 7) return { texte: `⏳ Expire dans ${jours} jour${jours > 1 ? "s" : ""}`, chip: "chip-minus" };
  return { texte: `⏳ Expire le ${date}`, chip: "chip-tag" };
}

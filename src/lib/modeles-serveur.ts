import "server-only";
import { nomPersonne, personnesEquipe } from "@/lib/equipe";
import { dateEvenementTexte, listeEvenements } from "@/lib/evenements";
import { jourParis } from "@/lib/planning";

/** Variables communes des modèles : qui écrit (nom, signature), adresse du site, prochaine journée portes ouvertes. */
export async function valeursCommunes(email?: string | null): Promise<Record<string, string>> {
  const moi = (await personnesEquipe().catch(() => [])).find((p) => p.email === (email ?? "").toLowerCase());
  const nom = nomPersonne(moi, email ?? "") || "L'équipe";
  const aujourdhui = jourParis(new Date());
  const evts = ((await listeEvenements().catch(() => null)) ?? []).filter((e) => e.date >= aujourdhui).sort((a, b) => a.date.localeCompare(b.date));
  const jpo = evts.find((e) => /porte/i.test(e.nom)) ?? evts.find((e) => e.sur_accueil);
  return {
    moi: nom,
    signature: `${nom}\n${moi?.poste ? `${moi.poste} · ` : ""}Campus Magnus`,
    site: process.env.NEXT_PUBLIC_SITE_URL || "https://magnusmatch.vercel.app",
    ...(jpo ? { date_jpo: dateEvenementTexte(jpo.date) } : {}),
  };
}

/** « Inès Benali » → « Inès » */
export const prenomDe = (nom?: string | null) => (nom ?? "").trim().split(/\s+/)[0] ?? "";

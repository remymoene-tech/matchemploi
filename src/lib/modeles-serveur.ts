import "server-only";
import { nomPersonne, personnesEquipe } from "@/lib/equipe";
import { dateEvenementTexte, listeEvenements } from "@/lib/evenements";
import { jourParis } from "@/lib/planning";
import { createAdminClient } from "@/lib/supabase/admin";
import { CIBLES, MODELES, type Cible, type Modele } from "@/lib/modeles";

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

/** Modèles en service : ceux du site (textes modifiés par l'administrateur), puis ceux qu'il a créés (⚙️ Paramètres). */
export async function modelesActifs(): Promise<(Modele & { modifie?: boolean })[]> {
  const { data, error } = await createAdminClient().from("modeles_messages").select("id, cible, titre, sujet, email, sms, updated_at").order("updated_at");
  if (error || !data) return MODELES;
  const lignes = data as { id: string; cible: string; titre: string; sujet: string; email: string; sms: string }[];
  const perso = new Map(lignes.map((x) => [x.id, x]));
  const site = MODELES.map((m) => {
    const x = perso.get(m.id);
    return x ? { ...m, titre: x.titre || m.titre, sujet: x.sujet || m.sujet, email: x.email || m.email, sms: x.sms || m.sms, modifie: true } : m;
  });
  const crees = lignes.filter((x) => x.id.startsWith("perso-") && (CIBLES as string[]).includes(x.cible))
    .map((x) => ({ id: x.id, cible: x.cible as Cible, titre: x.titre || "Mon modèle", sujet: x.sujet, email: x.email, sms: x.sms, pour: [], perso: true }));
  return [...site, ...crees];
}

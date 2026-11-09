import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { localiserLieu } from "@/lib/geo";
import { noterOffrePourTous } from "@/lib/matching";
import { offresDe, type Entreprise } from "@/lib/entreprises";
import { memeEntreprise } from "@/lib/prospections";
import { logoDepuisSite } from "@/lib/logo-entreprise";
import { CONTRATS, SOURCES_AUTO, type Offre } from "@/lib/types";
import { iaConfiguree, redigerFicheDePoste } from "@/lib/ia";

const INTITULE_AUTO = "Recrutement";
type OffreAuto = Offre & { entreprise_id?: string | null; redigee_ia?: boolean };

/** L'entreprise recrute : statut « Recrute », un étudiant a coché « elle recrute », ou une offre est ouverte. */
export async function entrepriseRecrute(e: Pick<Entreprise, "id" | "nom" | "statut">) {
  if (e.statut === "recrute") return true;
  const db = createAdminClient();
  const [{ data: prosp }, { data: offres }] = await Promise.all([
    db.from("prospections").select("entreprise, entreprise_id").eq("recrute", "oui"),
    db.from("offres").select("*").not("source", "in", `(${SOURCES_AUTO.join(",")})`).eq("ouverte", true),
  ]);
  return (prosp ?? []).some((p) => p.entreprise_id === e.id || memeEntreprise(p.entreprise, e.nom))
    || offresDe(e, (offres ?? []) as Offre[]).length > 0;
}

/**
 * Fiche de poste rédigée par MagnusMatch pour l'entreprise (créée, ou mise à jour tant que l'équipe ne l'a pas relue).
 * `forcer` : réécrit aussi une fiche déjà relue (bouton « Générer la fiche de poste »). Renvoie l'offre.
 */
export async function preparerFicheDePoste(entrepriseId: string, forcer = false): Promise<OffreAuto | null> {
  const db = createAdminClient();
  const { data } = await db.from("entreprises").select("*").eq("id", entrepriseId).maybeSingle();
  const e = data as (Entreprise & { logo_url?: string | null }) | null;
  if (!e) return null;
  const { data: toutes } = await db.from("offres").select("*").not("source", "in", `(${SOURCES_AUTO.join(",")})`);
  const siennes = offresDe(e, (toutes ?? []) as Offre[]) as OffreAuto[];
  const { data: prosp } = await db.from("prospections").select("entreprise, recrute, justification").eq("recrute", "oui");
  const dits = (prosp ?? []).filter((p) => memeEntreprise(p.entreprise, e.nom)).map((p) => `- ${p.justification}`).join("\n");

  // Logo de l'entreprise depuis son site (une seule fois)
  if (e.site && !e.logo_url) {
    const logo = await logoDepuisSite(e.site);
    if (logo) await db.from("entreprises").update({ logo_url: logo }).eq("id", e.id);
  }

  const redaction = iaConfiguree() ? await redigerFicheDePoste(e, dits).catch(() => null) : null;
  const contenu = redaction
    ? { intitule: redaction.intitule.slice(0, 200), contrat: redaction.contrat, contrat_libelle: CONTRATS.find((c) => c.id === redaction.contrat)?.label ?? "", description: redaction.description.slice(0, 7000), fiche: redaction.fiche }
    : { intitule: `${INTITULE_AUTO} ${e.secteur ? `(${e.secteur}) ` : ""}— ${e.nom}`, contrat: "", contrat_libelle: "", description: [e.notes, dits].filter(Boolean).join("\n\n").slice(0, 6000) };

  const auto = siennes.find((o) => o.entreprise_id === e.id && (o.redigee_ia || o.intitule.startsWith(INTITULE_AUTO) || !!(o as { fiche?: unknown }).fiche));
  if (auto) {
    const reecrire = forcer || auto.redigee_ia;
    const maj = { ...(reecrire ? { ...contenu, redigee_ia: true } : {}), attentes: e.attentes ?? null, ouverte: true, updated_at: new Date().toISOString() };
    let { error } = await db.from("offres").update(maj).eq("id", auto.id);
    if (error) ({ error } = await db.from("offres").update({ attentes: e.attentes ?? null, ouverte: true }).eq("id", auto.id));
    return { ...auto, ...(reecrire ? contenu : {}) } as OffreAuto;
  }
  const position = e.ville ? await localiserLieu(e.ville) : null;
  const base = {
    source: "partenaire", entreprise: e.nom, lieu: e.ville ?? "",
    contact_nom: [e.contact_nom, e.contact_fonction].filter(Boolean).join(", "),
    contact_email: e.contact_email ?? "", contact_tel: e.contact_tel ?? "",
    attentes: e.attentes ?? null, entreprise_id: e.id, ouverte: true,
  };
  const { data: o } = await db.from("offres").insert({ ...base, ...contenu, redigee_ia: true, latitude: position?.latitude ?? null, longitude: position?.longitude ?? null }).select("*").single();
  if (o) return o as OffreAuto;
  // Base pas encore à jour : sans les colonnes récentes
  const { fiche: _f, ...sansFiche } = contenu as typeof contenu & { fiche?: unknown };
  void _f;
  const { data: o2 } = await db.from("offres").insert({ ...base, ...sansFiche }).select("*").single();
  return (o2 as OffreAuto) ?? null;
}

/** MagnusMatch cherche les étudiants pour une entreprise qui recrute (fiche de poste à jour, puis notation des étudiants admis). */
export async function lancerRechercheCandidats(entrepriseId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db.from("entreprises").select("id, nom").eq("id", entrepriseId).maybeSingle();
  if (!data) return false;
  const { data: toutes } = await db.from("offres").select("*").not("source", "in", `(${SOURCES_AUTO.join(",")})`).eq("ouverte", true);
  const ouvertes = offresDe(data as Entreprise, (toutes ?? []) as Offre[]) as OffreAuto[];
  // Pas d'offre écrite par l'équipe : la fiche de poste de MagnusMatch sert de base
  const manuelles = ouvertes.filter((o) => !o.redigee_ia && !o.intitule.startsWith(INTITULE_AUTO));
  const auto = manuelles.length ? null : await preparerFicheDePoste(entrepriseId);
  const cibles = [...new Map([...ouvertes, ...(auto ? [auto] : [])].map((o) => [o.id, o])).values()];
  for (const o of cibles) await noterOffrePourTous(o.id);
  return cibles.length > 0;
}

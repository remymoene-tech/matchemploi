import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { localiserLieu } from "@/lib/geo";
import { noterOffrePourTous } from "@/lib/matching";
import { offresDe, type Entreprise } from "@/lib/entreprises";
import { memeEntreprise } from "@/lib/prospections";
import { SOURCES_AUTO, type Offre } from "@/lib/types";

const INTITULE_AUTO = "Recrutement";

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
 * MagnusMatch cherche les étudiants pour une entreprise qui recrute.
 * Sans offre ouverte, crée (ou met à jour) un « Recrutement — Nom » à partir de la fiche besoin et des notes,
 * invisible des étudiants, puis note tous les étudiants admis en arrière-plan.
 */
export async function lancerRechercheCandidats(entrepriseId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db.from("entreprises").select("*").eq("id", entrepriseId).maybeSingle();
  const e = data as Entreprise | null;
  if (!e) return false;
  const { data: toutes } = await db.from("offres").select("*").not("source", "in", `(${SOURCES_AUTO.join(",")})`);
  const siennes = offresDe(e, (toutes ?? []) as Offre[]);
  const { data: prosp } = await db.from("prospections").select("entreprise, recrute, justification").eq("recrute", "oui");
  const dits = (prosp ?? []).filter((p) => memeEntreprise(p.entreprise, e.nom)).map((p) => `- ${p.justification}`).join("\n");
  const description = [e.notes, dits && `Ce que l'entreprise a dit aux étudiants :\n${dits}`].filter(Boolean).join("\n\n").slice(0, 6000);

  // Le besoin créé automatiquement suit toujours la fiche besoin à jour
  const auto = siennes.find((o) => o.intitule.startsWith(INTITULE_AUTO) && (o as Offre & { entreprise_id?: string }).entreprise_id === e.id);
  if (auto) await db.from("offres").update({ attentes: e.attentes ?? null, description, ouverte: true, updated_at: new Date().toISOString() }).eq("id", auto.id);

  let ouvertes = siennes.filter((o) => o.ouverte || o.id === auto?.id);
  if (!ouvertes.length) {
    const position = e.ville ? await localiserLieu(e.ville) : null;
    const { data: o } = await db.from("offres").insert({
      source: "partenaire",
      entreprise: e.nom,
      intitule: `${INTITULE_AUTO} ${e.secteur ? `(${e.secteur}) ` : ""}— ${e.nom}`,
      contrat: "", contrat_libelle: "",
      lieu: e.ville ?? "",
      description,
      contact_nom: [e.contact_nom, e.contact_fonction].filter(Boolean).join(", "),
      contact_email: e.contact_email ?? "", contact_tel: e.contact_tel ?? "",
      attentes: e.attentes ?? null,
      entreprise_id: e.id,
      ouverte: true,
      latitude: position?.latitude ?? null, longitude: position?.longitude ?? null,
    }).select("*").single();
    if (!o) return false;
    ouvertes = [o as Offre];
  }
  for (const o of ouvertes) await noterOffrePourTous(o.id);
  return true;
}

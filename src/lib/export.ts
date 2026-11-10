import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { toutLire } from "@/lib/tout-lire";
import { listeContacts, listeLeads, statutLead, type Lead } from "@/lib/leads";
import { listeEntreprises, statutEntreprise, type Entreprise } from "@/lib/entreprises";
import { admission } from "@/lib/admission";
import { lireParcours, situation, AIDES } from "@/lib/alumni";
import { SITUATIONS_INTERVENANT, specialitesDe } from "@/lib/intervenants";
import { anneeScolaire, listeClasses, type Classe } from "@/lib/classes";
import { contratLabel, type Candidat } from "@/lib/types";

/** Exports Excel « à la carte » : quoi exporter, quels filtres, quelles colonnes. */

const date = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }) : "");
const oui = (b: unknown) => (b ? "Oui" : "Non");

type Valeur = string | number;
type Colonne<T> = { id: string; label: string; parDefaut?: boolean; val: (x: T, ctx: Contexte) => Valeur };
type Contexte = { classes: Classe[] };

export const TYPES_EXPORT = [
  { id: "leads", label: "🧲 Leads", aide: "Demandes de brochure et prospects en cours de recrutement" },
  { id: "candidats", label: "👥 Candidats", aide: "Étudiants inscrits (admis, prospects, refusés…) · filtre par classe possible" },
  { id: "alumni", label: "🎓 Alumni", aide: "Anciens étudiants et leur parcours" },
  { id: "entreprises", label: "🏢 Entreprises", aide: "Mes entreprises et leurs contacts" },
  { id: "intervenants", label: "🧑‍🏫 Intervenants", aide: "Carnet d'adresses de la pédagogie" },
] as const;
export type TypeExport = (typeof TYPES_EXPORT)[number]["id"];

const COLONNES_LEADS: Colonne<Lead>[] = [
  { id: "prenom", label: "Prénom", parDefaut: true, val: (l) => l.prenom },
  { id: "nom", label: "Nom", parDefaut: true, val: (l) => l.nom },
  { id: "email", label: "Email", parDefaut: true, val: (l) => l.email },
  { id: "telephone", label: "Téléphone", parDefaut: true, val: (l) => l.telephone },
  { id: "formation", label: "Formation visée", parDefaut: true, val: (l) => l.formation },
  { id: "rentree", label: "Rentrée", parDefaut: true, val: (l) => l.annee_rentree ?? "" },
  { id: "statut", label: "Où on en est", parDefaut: true, val: (l) => statutLead(l.statut).label.replace(/^\S+\s/, "") },
  { id: "origine", label: "Origine", val: (l) => l.origine },
  { id: "suivi", label: "Suivi par", val: (l) => l.attribue_a ?? "" },
  { id: "entretien", label: "Entretien d'admission", val: (l) => (l.entretien_a ? new Date(l.entretien_a).toLocaleString("fr-FR", { timeZone: "Europe/Paris" }) : "") },
  { id: "motif", label: "Motif (perdu)", val: (l) => l.motif_perte ?? "" },
  { id: "recu", label: "Reçu le", parDefaut: true, val: (l) => date(l.created_at) },
];

const COLONNES_CANDIDATS: Colonne<Candidat & { created_at?: string }>[] = [
  { id: "nom", label: "Nom", parDefaut: true, val: (c) => c.nom },
  { id: "email", label: "Email", parDefaut: true, val: (c) => c.email },
  { id: "telephone", label: "Téléphone", parDefaut: true, val: (c) => c.telephone },
  { id: "admission", label: "Admission", parDefaut: true, val: (c) => admission(c.statut_admission).label },
  { id: "formation", label: "Formation", parDefaut: true, val: (c) => c.formation },
  { id: "annee", label: "Année de formation", parDefaut: true, val: (c) => c.annee_cursus ?? "" },
  { id: "rythme", label: "Rythme", val: (c) => (c.rythme_cursus === "alternance" ? "Alternance" : c.rythme_cursus ? "Initial" : "") },
  { id: "rentree", label: "Rentrée", parDefaut: true, val: (c) => c.annee_rentree ?? "" },
  { id: "classe", label: "Classe", parDefaut: true, val: (c, x) => x.classes.find((k) => k.id === c.classe_id)?.nom ?? "" },
  { id: "ville", label: "Ville", val: (c) => [c.code_postal, c.ville].filter(Boolean).join(" ") },
  { id: "poste", label: "Poste visé", val: (c) => c.poste_vise },
  { id: "contrats", label: "Contrats", val: (c) => (c.contrats ?? []).map(contratLabel).join(", ") },
  { id: "cv", label: "CV déposé", val: (c) => oui(c.cv_chemin) },
  { id: "linkedin", label: "LinkedIn", val: (c) => c.linkedin_url ?? "" },
  { id: "inscrit", label: "Inscrit le", val: (c) => date(c.created_at) },
];

const COLONNES_ALUMNI: Colonne<Candidat>[] = [
  { id: "nom", label: "Nom", parDefaut: true, val: (c) => c.nom },
  { id: "email", label: "Email", parDefaut: true, val: (c) => c.email },
  { id: "telephone", label: "Téléphone", parDefaut: true, val: (c) => c.telephone },
  { id: "formation", label: "Formation", parDefaut: true, val: (c) => c.formation },
  { id: "promo", label: "Promo", parDefaut: true, val: (c) => c.diplome_annee ?? "" },
  { id: "situation", label: "Situation", parDefaut: true, val: (c) => situation(lireParcours((c as { parcours?: unknown }).parcours)?.situation)?.label ?? "" },
  { id: "poste", label: "Poste", parDefaut: true, val: (c) => lireParcours((c as { parcours?: unknown }).parcours)?.poste ?? "" },
  { id: "entreprise", label: "Entreprise", parDefaut: true, val: (c) => lireParcours((c as { parcours?: unknown }).parcours)?.entreprise ?? "" },
  { id: "ville", label: "Ville", val: (c) => lireParcours((c as { parcours?: unknown }).parcours)?.ville ?? "" },
  { id: "aides", label: "Peut aider pour", val: (c) => AIDES.filter((a) => lireParcours((c as { parcours?: unknown }).parcours)?.aides.includes(a.id)).map((a) => a.court).join(", ") },
];

const COLONNES_ENTREPRISES: Colonne<Entreprise>[] = [
  { id: "nom", label: "Entreprise", parDefaut: true, val: (e) => e.nom },
  { id: "secteur", label: "Secteur", parDefaut: true, val: (e) => e.secteur },
  { id: "ville", label: "Ville", parDefaut: true, val: (e) => e.ville },
  { id: "statut", label: "Statut", parDefaut: true, val: (e) => statutEntreprise(e.statut).label.replace(/^\S+\s/, "") },
  { id: "contact", label: "Contact", parDefaut: true, val: (e) => e.contact_nom },
  { id: "fonction", label: "Fonction", val: (e) => e.contact_fonction },
  { id: "email", label: "Email", parDefaut: true, val: (e) => e.contact_email },
  { id: "telephone", label: "Téléphone", parDefaut: true, val: (e) => e.contact_tel },
  { id: "origine", label: "Origine", val: (e) => e.origine },
  { id: "rencontre", label: "Rencontrée le", val: (e) => date(e.rencontre_le) },
  { id: "site", label: "Site internet", val: (e) => e.site },
];

const COLONNES_INTERVENANTS: Colonne<Lead>[] = [
  { id: "prenom", label: "Prénom", parDefaut: true, val: (l) => l.prenom },
  { id: "nom", label: "Nom", parDefaut: true, val: (l) => l.nom },
  { id: "email", label: "Email", parDefaut: true, val: (l) => l.email },
  { id: "telephone", label: "Téléphone", parDefaut: true, val: (l) => l.telephone },
  { id: "specialites", label: "Spécialités", parDefaut: true, val: (l) => specialitesDe(l.formation).join(", ") },
  { id: "situation", label: "Situation", val: (l) => (l.situation ? SITUATIONS_INTERVENANT[l.situation] ?? "" : "") },
  { id: "entreprise", label: "Entreprise", parDefaut: true, val: (l) => l.entreprise ?? "" },
  { id: "recrute", label: "Recrute", val: (l) => oui(l.recrute) },
  { id: "linkedin", label: "LinkedIn", val: (l) => (l.message ?? "").match(/LinkedIn : (\S+)/)?.[1] ?? "" },
  { id: "dispos", label: "Disponibilités", val: (l) => (l.message ?? "").match(/Disponibilités : ([^\n]+)/)?.[1] ?? "" },
  { id: "cv", label: "CV déposé", val: (l) => oui(l.cv_chemin) },
  { id: "recu", label: "Reçu le", val: (l) => date(l.created_at) },
];

export const COLONNES: Record<TypeExport, { id: string; label: string; parDefaut?: boolean }[]> = {
  leads: COLONNES_LEADS, candidats: COLONNES_CANDIDATS, alumni: COLONNES_ALUMNI, entreprises: COLONNES_ENTREPRISES, intervenants: COLONNES_INTERVENANTS,
};

/** Filtres possibles pour un type (lus dans l'adresse). */
export type Filtres = { statut?: string; formation?: string; rentree?: string; classe?: string; promo?: string; specialite?: string; admission?: string };

async function candidats() {
  const { data } = await toutLire<Candidat & { created_at?: string }>((de, a) => createAdminClient().from("candidats").select("*").order("nom").order("user_id").range(de, a));
  return data ?? [];
}

/** Lignes de l'export : titres des colonnes choisies + valeurs, après filtres. */
export async function lignesExport(type: TypeExport, f: Filtres, colonnesChoisies: string[]): Promise<{ titres: string[]; lignes: Valeur[][] }> {
  const ctx: Contexte = { classes: (await listeClasses().catch(() => null)) ?? [] };
  const prendre = <T,>(cols: Colonne<T>[], liste: T[]) => {
    const choisies = cols.filter((c) => colonnesChoisies.includes(c.id));
    const finales = choisies.length ? choisies : cols.filter((c) => c.parDefaut);
    return { titres: finales.map((c) => c.label), lignes: liste.map((x) => finales.map((c) => c.val(x, ctx))) };
  };
  if (type === "leads") {
    const l = ((await listeLeads()) ?? []).filter((x) => (!f.statut || statutLead(x.statut).id === f.statut) && (!f.formation || x.formation === f.formation) && (!f.rentree || String(x.annee_rentree ?? "") === f.rentree));
    return prendre(COLONNES_LEADS, l);
  }
  if (type === "candidats") {
    const l = (await candidats()).filter((c) => c.statut_admission !== "intervenant"
      && (!f.admission || admission(c.statut_admission).id === f.admission)
      && (!f.formation || c.formation === f.formation)
      && (!f.rentree || String(c.annee_rentree ?? "") === f.rentree)
      && (!f.classe || (f.classe === "sans" ? !c.classe_id : c.classe_id === f.classe)));
    return prendre(COLONNES_CANDIDATS, l);
  }
  if (type === "alumni") {
    const l = (await candidats()).filter((c) => c.statut_admission === "alumni" && (!f.promo || String(c.diplome_annee ?? "") === f.promo) && (!f.formation || c.formation === f.formation));
    return prendre(COLONNES_ALUMNI, l);
  }
  if (type === "entreprises") {
    const l = ((await listeEntreprises()) ?? []).filter((e) => !f.statut || e.statut === f.statut);
    return prendre(COLONNES_ENTREPRISES, l);
  }
  const l = (await listeContacts("intervenant")).filter((x) => !f.specialite || specialitesDe(x.formation).includes(f.specialite));
  return prendre(COLONNES_INTERVENANTS, l);
}

export const libelleClasse = (k: Classe) => `${k.nom} · ${anneeScolaire(k.annee)}`;

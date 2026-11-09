import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { franceTravailConfigure } from "@/lib/france-travail";
import { fermerOffresExpirees } from "@/lib/matching";
import { iaConfiguree } from "@/lib/ia";
import { adzunaConfigure } from "@/lib/adzuna";
import { lbaConfigure } from "@/lib/la-bonne-alternance";
import { Chips, Score } from "@/components/Score";
import { SelectAuto } from "@/components/SelectAuto";
import { MessageEnvoyable } from "@/components/MessageEnvoyable";
import { ListeRelances } from "@/components/ListeRelances";
import { Barres, Colonnes } from "@/components/Graphiques";
import { OngletsCartes } from "@/components/OngletsCartes";
import { Copier } from "@/components/Copier";
import { FormBrochure } from "@/components/FormBrochure";
import { ADMISSIONS, admission } from "@/lib/admission";
import { estExpiree, texteExpiration } from "@/lib/expiration";
import { BriefingSemaine } from "@/components/BriefingSemaine";
import { briefingEtudiants } from "@/lib/briefing";
import { BROCHURES_PAR_DEFAUT, anneeLabel, lireFormations } from "@/lib/formations";
import { ORIGINES_LEAD, STATUTS_LEAD, estLeadAdmis, listeLeads, nomLead, type EchangeLead } from "@/lib/leads";
import { StatsRecrutement } from "@/components/StatsRecrutement";
import { ORIGINES_ENTREPRISE, STATUTS_ENTREPRISE, listeEntreprises, offresDe } from "@/lib/entreprises";
import { decouvreursDesEntreprises, type Decouvreur } from "@/lib/prospections";
import { echeance, lienRelance, maintenantMs, relancesDe } from "@/lib/echanges";
import { moyenEnvoi } from "@/lib/email";
import { messageEntreprise, messageEtudiant } from "@/lib/messages";
import { renvoyerInvitation, changerStatutLead, genererFicheDePosteOffre, changerStatutEntreprise, ajouterFormation, retirerFormation, changerAdmissionAdmin, ajouterResponsable, changerFrequence, changerSuivi, creerEcole, envoyerMessageAdmin, relancerTout, retirerResponsable } from "./actions";
import { FREQUENCES, lireFrequence } from "@/lib/reglages";
import { AVIS, SEUIL, SOURCES_AUTO, SUIVIS, estOffreEquipe, contratLabel, sourceLabel, type Candidat, type Offre, type Correspondance } from "@/lib/types";

export const metadata = { title: "Tableau de bord · MagnusMatch" };
export const maxDuration = 300;

const VUES = [
  { id: "accueil", label: "Accueil" },
  { id: "leads", label: "Leads" },
  { id: "entreprises", label: "Mes entreprises" },
  { id: "candidats", label: "Mes candidats" },
] as const;
/** Pages secondaires, en petit à droite des onglets. */
const AUTRES = [
  { id: "briefing", label: "📋 Briefing" },
  { id: "relances", label: "🔔 Relances" },
  { id: "entretiens", label: "🗣️ Entretiens" },
  { id: "ecoles", label: "🏫 Écoles" },
  { id: "reglages", label: "⚙️ Réglages" },
] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<{ vue?: string; ok?: string; relance?: string; erreur?: string; source?: string; tous?: string; suivi?: string; du?: string; au?: string; sous?: string; filtre?: string; trouvee?: string; q?: string; annee?: string; admission?: string; stat_annee?: string; lstatut?: string; lformation?: string; lannee?: string; lorigine?: string; ecole?: string; cv?: string; entretien?: string; bilan?: string; statut?: string; offre?: string; origine?: string }> }) {
  const moi = await exigerAdmin();
  const sp = await searchParams;
  // Anciennes adresses : « offres » et « correspondances » sont maintenant dans « Mes entreprises »
  const vue = sp.vue === "offres" || sp.vue === "correspondances" ? "entreprises" : [...VUES, ...AUTRES].some((v) => v.id === sp.vue) ? sp.vue! : "accueil";
  const sous = sp.sous === "offres" || sp.sous === "candidats" ? sp.sous
    : sp.vue === "offres" ? (sp.suivi ? "candidats" : "offres") : sp.vue === "correspondances" ? "candidats" : "entreprises";
  const db = createAdminClient();
  await fermerOffresExpirees(); // les offres expirées se ferment toutes seules

  const [{ data: ecolesData, error: ecolesErreur }, { data: respData }, { data: entData, error: entErreur }] = await Promise.all([
    db.from("ecoles").select("*").order("nom"),
    db.from("responsables").select("email, nom, ecole_id"),
    db.from("entretiens_conseil").select("id, candidat_id, date_entretien, conseiller, bilan, prochaine_etape, partage").order("date_entretien", { ascending: false }),
  ]);
  // Dernier entretien de chaque candidat
  const entretiens = (entData ?? []) as { id: string; candidat_id: string; date_entretien: string; conseiller: string; bilan: string; prochaine_etape: string; partage: boolean }[];
  const dernierEntretien = new Map<string, (typeof entretiens)[number]>();
  for (const e of entretiens) if (!dernierEntretien.has(e.candidat_id)) dernierEntretien.set(e.candidat_id, e);
  const ecoles = (ecolesData ?? []) as { id: string; nom: string; code: string; formations?: unknown }[];
  const responsables = (respData ?? []) as { email: string; nom: string; ecole_id: string }[];
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const [{ frequence, tableOk }, { data: candidats }, { data: offres }, { data: matchs }] = await Promise.all([
    lireFrequence(),
    db.from("candidats").select("*").order("nom"),
    db.from("offres").select("*").not("source", "in", `(${SOURCES_AUTO.join(",")})`).order("created_at", { ascending: false }),
    db.from("correspondances").select("*").gte("score", SEUIL).order("score", { ascending: false }).limit(500),
  ]);
  const C = new Map(((candidats ?? []) as Candidat[]).map((c) => [c.user_id, c]));
  const M = (matchs ?? []) as Correspondance[];
  const idsOffres = [...new Set(M.map((m) => m.offre_id))];
  const { data: offresMatch } = idsOffres.length
    ? await db.from("offres").select("*").in("id", idsOffres)
    : { data: [] };
  const O = new Map(((offresMatch ?? []) as Offre[]).map((o) => [o.id, o]));
  const toutes = M.filter((m) => C.has(m.candidat_id) && O.get(m.offre_id)?.ouverte);
  const equipe = toutes.filter((m) => estOffreEquipe(O.get(m.offre_id)!.source));
  const voirToutes = false; // seules les offres de l'équipe
  // À traiter d'abord, puis les meilleures notes
  const filtreSuivi = SUIVIS.find((x) => x.id === sp.suivi) ?? null;
  const lignes = (voirToutes ? toutes : equipe).filter((m) => !filtreSuivi || m.suivi === filtreSuivi.id).sort(
    (a, b) => Number(b.suivi === "a_traiter") - Number(a.suivi === "a_traiter") || b.score - a.score,
  );
  const aTraiter = equipe.filter((m) => m.suivi === "a_traiter").length;

  // ---- Accueil : chiffres et graphiques ----
  const tousCandidats = [...C.values()] as (Candidat & { created_at?: string })[];
  const maintenant = maintenantMs();
  const SEMAINE = 7 * 864e5;
  const nouveaux = tousCandidats.filter((c) => c.created_at && new Date(c.created_at).getTime() >= maintenant - SEMAINE).length;
  const mesOffresOuvertes = ((offres ?? []) as Offre[]).filter((o) => o.ouverte).length;
  // Nouveaux candidats sur les 8 dernières semaines (de la plus ancienne à la plus récente)
  const semaines = Array.from({ length: 8 }, (_, i) => {
    const fin = maintenant - (7 - i) * SEMAINE, debut = fin - SEMAINE;
    const n = tousCandidats.filter((c) => { const t = c.created_at ? new Date(c.created_at).getTime() : 0; return t > debut && t <= fin; }).length;
    const jour = new Date(debut + 864e5).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
    return {
      label: i === 7 ? "Cette sem." : jour, valeur: n,
      detail: `Semaine du ${jour} : ${n} inscrit${n > 1 ? "s" : ""}`,
      href: `/admin?vue=candidats&du=${new Date(debut).toISOString()}&au=${new Date(fin).toISOString()}`,
    };
  });
  // Mes entreprises : rencontrées, avec ou sans offre
  const entreprises = await listeEntreprises();
  const offresEquipe = (offres ?? []) as Offre[];
  const parEntreprise = new Map((entreprises ?? []).map((e) => [e.id, offresDe(e, offresEquipe)]));
  const avecOffre = (entreprises ?? []).filter((e) => parEntreprise.get(e.id)!.some((o) => o.ouverte));
  // Une entreprise qui a une offre ouverte n'est plus seulement « Rencontrée » : elle passe en « Recrute »
  const aCorriger = avecOffre.filter((e) => e.statut === "rencontree");
  if (aCorriger.length) {
    await db.from("entreprises").update({ statut: "recrute" }).in("id", aCorriger.map((e) => e.id));
    for (const e of aCorriger) e.statut = "recrute";
  }
  const nbEntreprises = entreprises?.length ?? 0;
  const { data: echEnt } = vue === "entreprises" && sous === "entreprises" && entreprises?.length
    ? await db.from("echanges").select("entreprise_id, date_echange, action, action_a, action_le, action_faite").not("entreprise_id", "is", null).order("date_echange", { ascending: false }).limit(1000)
    : { data: [] };
  const echangesEnt = (echEnt ?? []) as { entreprise_id: string; date_echange: string; action: string; action_a: string | null; action_le: string | null; action_faite: boolean }[];
  // Filtres de « Mes entreprises » (les anciens liens ?filtre=… restent valables)
  const fStatut = STATUTS_ENTREPRISE.some((x) => x.id === (sp.statut || sp.filtre)) ? (sp.statut || sp.filtre)! : "";
  const fOffre = sp.offre === "avec" || sp.offre === "sans" ? sp.offre : sp.filtre === "avec" || sp.filtre === "sans" ? sp.filtre : "";
  const fOrigine = sp.origine ?? "";
  const fTrouvee = sp.trouvee === "etudiant" || sp.trouvee === "equipe" || sp.trouvee === "recrute" ? sp.trouvee : "";
  // Qui a trouvé chaque entreprise : le premier étudiant qui l'a notée dans ses prospections
  const decouvreurs = vue === "entreprises" || vue === "accueil" ? await decouvreursDesEntreprises(entreprises ?? []) : new Map<string, Decouvreur[]>();
  const q = (sp.q ?? "").trim().toLowerCase();
  const contient = (...v: (string | null | undefined)[]) => !q || v.some((x) => (x ?? "").toLowerCase().includes(q));
  const entreprisesAffichees = (entreprises ?? []).filter((e) =>
    contient(e.nom, e.secteur, e.ville, e.contact_nom, e.notes)
    && (!fStatut || e.statut === fStatut)
    && (!fOffre || (fOffre === "avec") === avecOffre.includes(e))
    && (!fOrigine || e.origine === fOrigine)
    && (!fTrouvee || (fTrouvee === "etudiant" ? !!decouvreurs.get(e.id)?.length
      : fTrouvee === "equipe" ? !decouvreurs.get(e.id)?.length
      : !!decouvreurs.get(e.id)?.some((d) => d.recrute === "oui"))));
  const filtresEntActifs = !!(q || fStatut || fOffre || fOrigine || fTrouvee);

  // 🧲 Leads (CRM)
  const leads = vue === "leads" || vue === "accueil" || vue === "candidats" ? await listeLeads() : [];
  // Leads admis à l'entretien qui n'ont pas encore créé leur espace : déjà candidats
  const admisSansEspace = (leads ?? []).filter((l) => estLeadAdmis(l) && !l.candidat_id);
  const { data: echLeadsData } = vue === "accueil" && leads?.length
    ? await db.from("echanges").select("lead_id, date_echange, auteur, resume").not("lead_id", "is", null).limit(5000)
    : { data: [] };
  const nbLeads = leads?.length ?? 0;
  const nouveauxLeads = (leads ?? []).filter((l) => l.statut === "nouveau").length;
  const ql = (sp.q ?? "").trim().toLowerCase();
  const leadsAffiches = (leads ?? []).filter((l) =>
    (!ql || [l.prenom, l.nom, l.email, l.telephone, l.notes].some((x) => (x ?? "").toLowerCase().includes(ql)))
    && (!sp.lstatut || l.statut === sp.lstatut)
    && (!sp.lformation || l.formation === sp.lformation)
    && (!sp.lannee || String(l.annee_rentree ?? "") === sp.lannee)
    && (!sp.lorigine || l.origine === sp.lorigine));
  const filtresLeadsActifs = !!(ql || sp.lstatut || sp.lformation || sp.lannee || sp.lorigine);
  const lienBrochure = `${site || "https://magnusmatch.vercel.app"}/brochure`;
  const formationsToutes = [...new Set(ecoles.flatMap((e) => lireFormations(e.formations).map((f) => f.nom)))];

  const pipeline = SUIVIS.map((x) => ({ label: x.label, valeur: equipe.filter((m) => m.suivi === x.id).length, href: `/admin?vue=entreprises&sous=candidats&suivi=${x.id}#a-traiter` }));
  const [mesRelances, { data: placesData }] = vue === "accueil"
    ? await Promise.all([
        relancesDe(moi.user.email ?? ""),
        db.from("correspondances").select("candidat_id, offre_id, score, offres(intitule, entreprise)").eq("suivi", "embauche").limit(50),
      ])
    : [[], { data: [] }];
  const places = ((placesData ?? []) as unknown as { candidat_id: string; offre_id: string; score: number; offres: { intitule: string; entreprise: string } | null }[])
    .filter((p) => C.has(p.candidat_id));
  const finJour = new Date(maintenant); finJour.setHours(23, 59, 59, 999);
  const rappels = mesRelances.filter((r) => { const d = echeance(r); return d && d <= finJour; });
  // Filtre « Mes candidats » par semaine d'inscription (depuis le graphique)
  const du = sp.du ? new Date(sp.du) : null, au = sp.au ? new Date(sp.au) : null;
  const filtreDates = du && au && !isNaN(+du) && !isNaN(+au);
  const qc = (sp.q ?? "").trim().toLowerCase();
  const bilanDe = (id: string) => dernierEntretien.get(id)?.bilan ?? "";
  const candidatsAffiches = tousCandidats.filter((c) => {
    const t = c.created_at ? new Date(c.created_at).getTime() : 0;
    if (filtreDates && !(t > +du! && t <= +au!)) return false;
    if (qc && ![c.nom, c.email, c.poste_vise, c.formation, c.ville].some((x) => (x ?? "").toLowerCase().includes(qc))) return false;
    if (sp.ecole && (sp.ecole === "aucune" ? !!c.ecole_id : c.ecole_id !== sp.ecole)) return false;
    if (sp.cv && (sp.cv === "avec") !== !!c.cv_chemin) return false;
    if (sp.entretien && (sp.entretien === "fait") !== dernierEntretien.has(c.user_id)) return false;
    if (sp.bilan && bilanDe(c.user_id) !== sp.bilan) return false;
    if (sp.annee && String(c.diplome_annee ?? "") !== sp.annee) return false;
    if (sp.admission && admission(c.statut_admission).id !== sp.admission) return false;
    return true;
  });
  const filtresCandActifs = !!(qc || sp.admission || sp.annee || sp.ecole || sp.cv || sp.entretien || sp.bilan || filtreDates);
  const meilleure = new Map<string, number>();
  for (const m of toutes) meilleure.set(m.candidat_id, Math.max(meilleure.get(m.candidat_id) ?? 0, m.score));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Espace équipe</span>
          <h1 className="text-3xl font-extrabold">Tableau de bord</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn" href="/admin/annonce">Coller une annonce</Link>
          <Link className="btn btn-primary" href="/admin/offres/nouvelle">Ajouter une offre</Link>
        </div>
      </div>

      {!iaConfiguree() && (
        <p className="rounded-xl bg-warn-soft p-4 text-sm">
          L&apos;IA n&apos;est pas encore branchée : les candidats peuvent s&apos;inscrire et déposer leur CV, mais aucune offre n&apos;est notée. Ajoute ANTHROPIC_API_KEY dans Vercel pour activer la notation, puis clique sur « Relancer la recherche pour tous » dans l&apos;onglet Candidats.
        </p>
      )}
      {!franceTravailConfigure() && !adzunaConfigure() && !lbaConfigure() && (
        <p className="rounded-xl bg-warn-soft p-4 text-sm">
          Aucune source d&apos;offres automatique n&apos;est branchée : ajoute les identifiants France Travail, Adzuna ou La bonne alternance dans Vercel (voir le guide). En attendant, seules tes offres sont proposées.
        </p>
      )}
      {sp.ok && vue !== "reglages" && vue !== "ecoles" && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Offre enregistrée. Elle est comparée aux candidats en arrière-plan.</p>}
      {sp.erreur === "fiche-base" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">📄 La fiche de poste ne peut pas encore être enregistrée : exécute la mise à jour SQL de la page /diagnostic, puis recommence.</p>}
      {sp.erreur === "fiche-ia" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">📄 MagnusMatch n&apos;a pas pu rédiger la fiche de poste (crédit Claude épuisé ou service indisponible). Réessaie dans un instant.</p>}
      {sp.relance && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Recherche relancée pour tous les candidats. Les résultats arrivent dans quelques minutes.</p>}

      <div className="flex flex-col gap-2">
        <OngletsCartes label="Espace équipe" onglets={[
          { href: "/admin", icone: "🏠", label: "Accueil", sous: "Mes chiffres", actif: vue === "accueil" },
          { href: "/admin?vue=leads", icone: "🎓", label: "Étudiants", sous: `${nouveauxLeads ? `${nouveauxLeads} nouveau${nouveauxLeads > 1 ? "x" : ""} lead${nouveauxLeads > 1 ? "s" : ""}` : `${nbLeads} leads`} · ${C.size} candidat${C.size > 1 ? "s" : ""}`, actif: vue === "leads" || vue === "candidats" },
          { href: "/admin?vue=entreprises", icone: "🏢", label: "Mes entreprises", sous: entreprises ? `${nbEntreprises} rencontrée${nbEntreprises > 1 ? "s" : ""}` : `${mesOffresOuvertes} offre${mesOffresOuvertes > 1 ? "s" : ""}`, actif: vue === "entreprises" },
        ]} />
        <nav className="flex flex-wrap justify-end gap-3 text-sm" aria-label="Autres pages">
          {AUTRES.map((v) => (
            <Link key={v.id} href={`/admin?vue=${v.id}`} className={vue === v.id ? "font-semibold text-ink underline underline-offset-4" : "text-muted hover:text-ink"}>{v.label}</Link>
          ))}
        </nav>
      </div>

      {vue === "accueil" && (
        <div className="flex flex-col gap-6">
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Chiffres clés">
            {([
              ["👥 Candidats", C.size, (() => { const p = tousCandidats.filter((c) => c.statut_admission === "prospect").length; return p ? `🌱 ${p} prospect${p > 1 ? "s" : ""} à étudier` : nouveaux ? `+${nouveaux} cette semaine` : "inscrits"; })(), tousCandidats.some((c) => c.statut_admission === "prospect") ? "/admin?vue=candidats&admission=prospect" : "/admin?vue=candidats"],
              ["🏢 Entreprises", nbEntreprises, `${avecOffre.length} avec une offre`, "/admin?vue=entreprises"],
              ["📥 À traiter", aTraiter, `candidats à ${SEUIL} % ou plus`, "/admin?vue=entreprises&sous=candidats&suivi=a_traiter#a-traiter"],
              ["🎉 Candidats placés", places.length, "candidats embauchés", "/admin?vue=entreprises&sous=candidats&suivi=embauche#a-traiter"],
            ] as const).map(([l, v, sous, href]) => (
              <Link key={l} href={href} className="card group flex flex-col gap-0.5 p-5 transition-colors hover:border-accent">
                <span className="eyebrow flex justify-between">{l}<span className="opacity-0 transition-opacity group-hover:opacity-100">→</span></span>
                <b className="text-4xl font-semibold tabular-nums">{v}</b>
                <span className="text-sm text-muted">{sous}</span>
              </Link>
            ))}
          </section>

          {leads && leads.length > 0 && (
            <StatsRecrutement leads={leads} echanges={(echLeadsData ?? []) as EchangeLead[]} maintenant={maintenant} annee={sp.stat_annee}
              annees={[...new Set(leads.map((l) => l.annee_rentree).filter((a): a is number => !!a))].sort()} />
          )}

          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <section className="card flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">📈 Nouveaux candidats par semaine</h2>
                <Link href="/admin?vue=candidats" className="text-sm font-semibold text-accent">Détail →</Link>
              </div>
              <Colonnes donnees={semaines} resume={`Inscriptions des 8 dernières semaines : ${semaines.map((x) => x.valeur).join(", ")}`} />
              <p className="text-xs text-muted">Clique sur une semaine pour voir les inscrits.</p>
            </section>

            <section className="card flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">🏢 Mes entreprises{entreprises ? ` (${nbEntreprises})` : ""}</h2>
                <Link href="/admin?vue=entreprises" className="text-sm font-semibold text-accent">Détail →</Link>
              </div>
              {entreprises === null ? (
                <p className="text-sm text-muted">Exécute la mise à jour SQL de la page /diagnostic pour activer « Mes entreprises ».</p>
              ) : (
                <Barres resume="Entreprises avec une offre, et rencontrées sans offre" donnees={[
                  { label: "💼 Avec une offre", valeur: avecOffre.length, href: "/admin?vue=entreprises&offre=avec" },
                  { label: "🤝 Rencontrées, sans offre", valeur: nbEntreprises - avecOffre.length, href: "/admin?vue=entreprises&offre=sans" },
                  { label: "⭐ Partenaires", valeur: (entreprises ?? []).filter((e) => e.statut === "partenaire").length, href: "/admin?vue=entreprises&statut=partenaire" },
                  { label: "🎓 Trouvées par les étudiants", valeur: (entreprises ?? []).filter((e) => decouvreurs.get(e.id)?.length).length, href: "/admin?vue=entreprises&trouvee=etudiant" },
                ]} />
              )}
            </section>

            <section className="card flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">🧲 Mes leads{leads ? ` (${nbLeads})` : ""}</h2>
                <Link href="/admin?vue=leads" className="text-sm font-semibold text-accent">Détail →</Link>
              </div>
              {leads === null ? (
                <p className="text-sm text-muted">Exécute la mise à jour SQL de la page /diagnostic pour activer les leads.</p>
              ) : (
                <Barres resume="Leads par étape" donnees={STATUTS_LEAD.map((x) => ({ label: x.label, valeur: leads.filter((l) => l.statut === x.id).length, href: `/admin?vue=leads&lstatut=${x.id}` }))} />
              )}
            </section>

            <section className="card flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">🤝 Suivi des mises en relation</h2>
                <Link href="/admin?vue=entreprises&sous=candidats#a-traiter" className="text-sm font-semibold text-accent">Détail →</Link>
              </div>
              <Barres donnees={pipeline} resume="Nombre de mises en relation à chaque étape" />
            </section>

            <section className="card flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">⏰ Mes rappels</h2>
                <Link href="/admin?vue=relances" className="text-sm font-semibold text-accent">Tous mes rappels →</Link>
              </div>
              {!rappels.length && (
                <p className="text-sm text-muted">Rien à faire aujourd&apos;hui. {mesRelances.length ? `${mesRelances.length} rappel(s) à venir.` : "Ajoute un rappel depuis l'onglet « Échanges » d'une fiche candidat."}</p>
              )}
              <ul className="flex flex-col gap-1">
                {rappels.slice(0, 6).map((r) => {
                  const d = echeance(r)!;
                  const retard = d.getTime() < maintenant;
                  return (
                    <li key={r.id}>
                      <Link href={lienRelance(r)} className="-mx-2 flex items-start justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-bg">
                        <span className="min-w-0"><b>{r.nom}</b><span className="block text-muted">{r.action}</span></span>
                        <span className={`chip shrink-0 ${retard ? "chip-minus" : "chip-tag"}`}>
                          {retard ? "En retard" : d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="card flex flex-col gap-3 p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">🎉 Candidats placés</h2>
                <Link href="/admin?vue=entreprises&sous=candidats&suivi=embauche#a-traiter" className="text-sm font-semibold text-accent">Détail →</Link>
              </div>
              {!places.length && <p className="text-sm text-muted">Pas encore de candidat placé. Passe une mise en relation en « Embauché » (Mes entreprises → Candidats à traiter) quand c&apos;est signé 🎉</p>}
              <ul className="flex flex-col gap-1">
                {places.slice(0, 6).map((p) => {
                  const c = C.get(p.candidat_id)!;
                  return (
                    <li key={`${p.candidat_id}-${p.offre_id}`}>
                      <Link href={`/admin/candidats/${c.user_id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-bg">
                        <span className="min-w-0"><b>{c.nom || c.email}</b><span className="block truncate text-muted">{p.offres ? `${p.offres.intitule} · ${p.offres.entreprise}` : "Offre supprimée"}</span></span>
                        <span className="chip chip-plus shrink-0">Placé ✓</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
      )}

      {(vue === "leads" || vue === "candidats") && (
        <nav className="flex flex-wrap gap-2" aria-label="Étudiants">
          {([
            ["leads", "🧲", "Leads", nbLeads],
            ["candidats", "👥", "Mes candidats", C.size + admisSansEspace.length],
          ] as const).map(([id, icone, label, n]) => (
            <Link key={id} href={`/admin?vue=${id}`} aria-current={vue === id ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${vue === id ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-muted hover:text-ink"}`}>
              <span aria-hidden>{icone}</span>{label}<span className="rounded-full bg-bg px-2 text-xs tabular-nums">{n}</span>
            </Link>
          ))}
          <span className="self-center text-xs text-muted">Un lead devient candidat quand il est admis à l&apos;entretien.</span>
        </nav>
      )}

      {vue === "leads" && (
        <div className="flex flex-col gap-3">
          {leads === null && <p className="rounded-xl bg-warn-soft p-4 text-sm">Les leads ne sont pas encore activés : exécute la mise à jour SQL affichée sur la page /diagnostic.</p>}
          <section className="card flex flex-col gap-2 p-4">
            <b>🔗 Lien du formulaire « Recevoir la brochure »</b>
            <p className="text-sm text-muted">À donner à la personne qui gère campus-magnus.fr pour le bouton « Brochure ». Utilisable aussi dans tes posts, emails ou en QR code au salon.</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="break-all rounded-lg bg-bg px-3 py-2 font-mono text-xs">{lienBrochure}</code>
              <Copier texte={lienBrochure} />
              <a href="/brochure" target="_blank" className="btn btn-sm">👁️ Voir le formulaire</a>
            </div>
            {!!formationsToutes.length && (
              <details className="text-sm">
                <summary className="cursor-pointer text-accent">Liens par formation (le diplôme est déjà coché)</summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {formationsToutes.map((f) => {
                    const lien = `${lienBrochure}?formation=${encodeURIComponent(f)}`;
                    return <li key={f} className="flex flex-wrap items-center gap-2"><b className="w-20">{f}</b><code className="break-all font-mono text-xs">{lien}</code><Copier texte={lien} /></li>;
                  })}
                </ul>
              </details>
            )}
          </section>

          <form method="get" action="/admin" className="card flex flex-wrap items-end gap-3 p-4">
            <input type="hidden" name="vue" value="leads" />
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
              <span className="font-semibold">🔎 Rechercher</span>
              <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Nom, email, téléphone…" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Où on en est</span>
              <select className="input" name="lstatut" defaultValue={sp.lstatut ?? ""}>
                <option value="">Tous</option>
                {STATUTS_LEAD.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">🎓 Formation</span>
              <select className="input" name="lformation" defaultValue={sp.lformation ?? ""}>
                <option value="">Toutes</option>
                {formationsToutes.map((f) => <option key={f}>{f}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">📅 Rentrée</span>
              <select className="input" name="lannee" defaultValue={sp.lannee ?? ""}>
                <option value="">Toutes</option>
                {[...new Set((leads ?? []).map((l) => l.annee_rentree).filter(Boolean))].sort().map((a) => <option key={a} value={String(a)}>{a}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">📍 Origine</span>
              <select className="input" name="lorigine" defaultValue={sp.lorigine ?? ""}>
                <option value="">Toutes</option>
                {ORIGINES_LEAD.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button className="btn btn-primary">Filtrer</button>
              {filtresLeadsActifs && <Link href="/admin?vue=leads" className="btn btn-ghost">Effacer</Link>}
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted"><b className="text-ink">{leadsAffiches.length}</b> lead{leadsAffiches.length > 1 ? "s" : ""}{filtresLeadsActifs ? ` sur ${nbLeads}` : ", les plus récents en premier"}</p>
            <Link href="/admin/leads/nouveau" className="btn btn-primary">➕ Ajouter un lead</Link>
          </div>

          {!!leadsAffiches.length && (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="p-3 font-semibold">Contact</th>
                    <th className="p-3 font-semibold">Où on en est</th>
                    <th className="p-3 font-semibold">Formation visée</th>
                    <th className="p-3 font-semibold">Rentrée</th>
                    <th className="p-3 font-semibold">Origine</th>
                    <th className="p-3 font-semibold">Brochure</th>
                    <th className="p-3 font-semibold">Reçu le</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {leadsAffiches.map((l) => (
                    <tr key={l.id} className="border-b border-line align-top last:border-0 hover:bg-bg">
                      <td className="p-3">
                        <Link href={`/admin/leads/${l.id}`} className="font-semibold hover:text-accent hover:underline">🧲 {nomLead(l)}</Link>
                        <div className="text-xs text-muted">{[l.email, l.telephone].filter(Boolean).join(" · ")}</div>
                        {l.candidat_id && <span className="chip chip-plus mt-1">🎓 Espace étudiant créé</span>}
                      </td>
                      <td className="p-3">
                        <form action={changerStatutLead}>
                          <input type="hidden" name="id" value={l.id} />
                          <SelectAuto name="statut" label={`Statut de ${nomLead(l)}`} defaultValue={l.statut} options={STATUTS_LEAD} />
                        </form>
                      </td>
                      <td className="p-3">{l.formation || "—"}</td>
                      <td className="p-3">{l.annee_rentree ?? "—"}</td>
                      <td className="p-3 text-xs text-muted">{l.origine}</td>
                      <td className="p-3">{l.brochure_envoyee_le ? <span className="chip chip-plus whitespace-nowrap">📬 Envoyée</span> : <span className="chip whitespace-nowrap">—</span>}</td>
                      <td className="p-3 text-muted">{new Date(l.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}</td>
                      <td className="p-3 text-right">
                        <span className="flex justify-end gap-2">
                          <Link href={`/admin/leads/${l.id}?onglet=echanges`} className="btn btn-sm whitespace-nowrap">💬 Échanges</Link>
                          <Link href={`/admin/leads/${l.id}`} className="btn btn-sm btn-primary whitespace-nowrap">Fiche →</Link>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {leads && !leadsAffiches.length && (
            <p className="card border-dashed p-6 text-sm text-muted">{nbLeads ? "Aucun lead ne correspond à ces filtres." : "Pas encore de lead. Ils arriveront ici dès qu'une personne demandera la brochure, ou ajoute-les toi-même (JPO, salon…)."}</p>
          )}
        </div>
      )}

      {vue === "candidats" && (
        <div className="flex flex-col gap-3">
          {admisSansEspace.length > 0 && (
            <section className="card flex flex-col gap-2 p-4">
              <h3 className="font-semibold">✅ Admis à l&apos;entretien, en attente de leur espace ({admisSansEspace.length})</h3>
              <p className="text-xs text-muted">Ils ont reçu le lien pour créer leur espace MagnusMatch. Dès qu&apos;ils s&apos;inscrivent avec cet email, ils rejoignent la liste ci-dessous, déjà « Admis ».</p>
              <ul className="flex flex-col divide-y divide-line">
                {admisSansEspace.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <span><Link href={`/admin/leads/${l.id}`} className="font-semibold hover:text-accent hover:underline">🎓 {nomLead(l)}</Link><span className="text-muted"> · {[l.formation, l.annee_rentree && `rentrée ${l.annee_rentree}`, l.email].filter(Boolean).join(" · ")}</span></span>
                    <form action={renvoyerInvitation}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="btn btn-sm">✉️ Renvoyer le lien</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <form method="get" action="/admin" className="card flex flex-wrap items-end gap-3 p-4">
            <input type="hidden" name="vue" value="candidats" />
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
              <span className="font-semibold">🔎 Rechercher</span>
              <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Nom, email, poste, diplôme, ville…" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">🎓 Admission</span>
              <select className="input" name="admission" defaultValue={sp.admission ?? ""}>
                <option value="">Toutes</option>
                {ADMISSIONS.map((a) => <option key={a.id} value={a.id}>{a.icone} {a.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">🏫 École</span>
              <select className="input" name="ecole" defaultValue={sp.ecole ?? ""}>
                <option value="">Toutes</option>
                {ecoles.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
                <option value="aucune">Sans école</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">📅 Année du diplôme</span>
              <select className="input" name="annee" defaultValue={sp.annee ?? ""}>
                <option value="">Toutes</option>
                {[...new Set(tousCandidats.map((c) => c.diplome_annee).filter(Boolean))].sort().map((a) => <option key={a} value={String(a)}>{a}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">📄 CV</span>
              <select className="input" name="cv" defaultValue={sp.cv ?? ""}>
                <option value="">Tous</option><option value="avec">Avec CV</option><option value="sans">Sans CV</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">🗣️ Entretien</span>
              <select className="input" name="entretien" defaultValue={sp.entretien ?? ""}>
                <option value="">Tous</option><option value="jamais">Jamais reçu</option><option value="fait">Déjà reçu</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">🧭 Bilan</span>
              <select className="input" name="bilan" defaultValue={sp.bilan ?? ""}>
                <option value="">Tous</option><option value="autonome">Autonome</option><option value="accompagner">À accompagner</option><option value="renforce">Renforcé</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button className="btn btn-primary">Filtrer</button>
              {filtresCandActifs && <Link href="/admin?vue=candidats" className="btn btn-ghost">Effacer</Link>}
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              <b className="text-ink">{candidatsAffiches.length}</b> candidat{candidatsAffiches.length > 1 ? "s" : ""}
              {filtreDates ? ` inscrit(s) la semaine du ${du!.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}` : filtresCandActifs ? ` sur ${C.size}` : ", les plus récents en premier"}
            </p>
            <form action={relancerTout}>
              <button className="btn btn-sm">🔄 Relancer la recherche pour tous</button>
            </form>
          </div>

          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="p-3 font-semibold">Candidat</th>
                  <th className="p-3 font-semibold">Admission</th>
                  <th className="p-3 font-semibold">Diplôme préparé</th>
                  <th className="p-3 font-semibold">École</th>
                  <th className="p-3 font-semibold">CV</th>
                  <th className="p-3 font-semibold">Meilleure offre</th>
                  <th className="p-3 font-semibold">Dernier entretien</th>
                  <th className="p-3 font-semibold">Bilan</th>
                  <th className="p-3 font-semibold">Inscrit le</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {[...candidatsAffiches].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")).map((c) => {
                  const e = dernierEntretien.get(c.user_id);
                  const best = meilleure.get(c.user_id);
                  const bilan = e?.bilan === "autonome" ? ["Autonome", "chip-plus"] : e?.bilan === "renforce" ? ["Renforcé", "chip-minus"] : e?.bilan === "accompagner" ? ["À accompagner", "chip-tag"] : null;
                  return (
                    <tr key={c.user_id} className="border-b border-line align-top last:border-0 hover:bg-bg">
                      <td className="p-3">
                        <Link href={`/admin/candidats/${c.user_id}`} className="font-semibold hover:text-accent hover:underline">{c.nom || c.email}</Link>
                        <div className="text-xs text-muted">{[c.poste_vise, c.ville].filter(Boolean).join(" · ") || "Profil à compléter"}</div>
                        {!c.consentement && <span className="chip chip-minus mt-1">Accord RGPD manquant</span>}
                      </td>
                      <td className="p-3">
                        <form action={changerAdmissionAdmin} className={`rounded-lg ${admission(c.statut_admission).id === "admis" ? "" : "ring-1 ring-line"}`}>
                          <input type="hidden" name="candidat_id" value={c.user_id} />
                          <SelectAuto name="statut_admission" label={`Admission de ${c.nom || c.email}`} defaultValue={admission(c.statut_admission).id}
                            options={ADMISSIONS.map((a) => ({ id: a.id, label: `${a.icone} ${a.label}` }))} />
                        </form>
                        {c.motif_admission && ["refus", "abandon"].includes(c.statut_admission ?? "") && <div className="mt-1 max-w-[180px] truncate text-xs text-muted" title={c.motif_admission}>Motif : {c.motif_admission}</div>}
                      </td>
                      <td className="p-3">{c.formation ? <>{c.formation}{c.diplome_annee ? <div className="text-xs text-muted">📅 {c.diplome_annee}</div> : null}</> : <span className="chip chip-minus">À compléter</span>}</td>
                      <td className="p-3 text-muted">{ecoles.find((x) => x.id === c.ecole_id)?.nom ?? "—"}</td>
                      <td className="p-3">{c.cv_chemin ? <a className="font-semibold text-accent" href={`/admin/cv/${c.user_id}`} target="_blank">📄 Ouvrir</a> : <span className="chip chip-minus">Sans CV</span>}</td>
                      <td className="p-3">{best != null ? <span className={`chip ${best >= 70 ? "chip-plus" : "chip-tag"}`}>{best} %</span> : <span className="text-muted">—</span>}</td>
                      <td className="p-3">
                        {e ? (
                          <Link href={`/admin/candidats/${c.user_id}/entretien/${e.id}`} className="text-accent hover:underline">
                            {new Date(e.date_entretien).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" })}
                          </Link>
                        ) : <span className="chip chip-minus">Jamais reçu</span>}
                      </td>
                      <td className="p-3">{bilan ? <span className={`chip ${bilan[1]}`}>{bilan[0]}</span> : "—"}</td>
                      <td className="p-3 text-muted">{c.created_at ? new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" }) : "—"}</td>
                      <td className="p-3 text-right">
                        <span className="flex justify-end gap-2">
                          <Link href={`/admin/candidats/${c.user_id}/entretien/nouveau`} className="btn btn-sm whitespace-nowrap">🗣️ Entretien</Link>
                          <Link href={`/admin/candidats/${c.user_id}`} className="btn btn-sm btn-primary whitespace-nowrap">Fiche →</Link>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!candidatsAffiches.length && (
              <p className="p-6 text-sm text-muted">{C.size ? "Aucun candidat ne correspond à ces filtres." : "Aucun candidat inscrit. Envoie le lien d'inscription à tes étudiants."}</p>
            )}
          </div>
        </div>
      )}

      {vue === "entretiens" && (
        <div className="flex flex-col gap-3">
          {entErreur && (
            <p className="rounded-xl bg-warn-soft p-4 text-sm">Les fiches d&apos;entretien ne sont pas encore activées : exécute la mise à jour SQL affichée sur la page /diagnostic.</p>
          )}
          <p className="text-sm text-muted">
            Tous les candidats, ceux jamais reçus en premier. {[...C.values()].filter((c) => !dernierEntretien.has(c.user_id)).length} candidat(s) n&apos;ont pas encore eu d&apos;entretien.
          </p>
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="p-3 font-semibold">Candidat</th>
                  <th className="p-3 font-semibold">École</th>
                  <th className="p-3 font-semibold">Dernier entretien</th>
                  <th className="p-3 font-semibold">Bilan</th>
                  <th className="p-3 font-semibold">Prochaine étape</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {[...C.values()]
                  .sort((a, b) => {
                    const da = dernierEntretien.get(a.user_id)?.date_entretien ?? "", dbb = dernierEntretien.get(b.user_id)?.date_entretien ?? "";
                    return da === dbb ? (a.nom || a.email).localeCompare(b.nom || b.email) : da < dbb ? -1 : 1;
                  })
                  .map((c) => {
                    const e = dernierEntretien.get(c.user_id);
                    const bilan = e?.bilan === "autonome" ? ["Autonome", "chip-plus"] : e?.bilan === "renforce" ? ["Renforcé", "chip-minus"] : e?.bilan === "accompagner" ? ["À accompagner", "chip-tag"] : null;
                    return (
                      <tr key={c.user_id} className="border-b border-line last:border-0 align-top">
                        <td className="p-3">
                          <Link href={`/admin/candidats/${c.user_id}`} className="font-semibold hover:text-accent hover:underline">{c.nom || c.email}</Link>
                          <div className="text-xs text-muted">{c.formation || "—"}</div>
                        </td>
                        <td className="p-3 text-muted">{ecoles.find((x) => x.id === c.ecole_id)?.nom ?? "—"}</td>
                        <td className="p-3">
                          {e ? (
                            <Link href={`/admin/candidats/${c.user_id}/entretien/${e.id}`} className="text-accent hover:underline">
                              {new Date(e.date_entretien).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" })}
                            </Link>
                          ) : <span className="chip chip-minus">Jamais reçu</span>}
                          {e?.conseiller && <div className="text-xs text-muted">{e.conseiller}</div>}
                        </td>
                        <td className="p-3">{bilan ? <span className={`chip ${bilan[1]}`}>{bilan[0]}</span> : "—"}</td>
                        <td className="max-w-[260px] p-3 text-muted">{e?.prochaine_etape ? e.prochaine_etape.slice(0, 140) : "—"}</td>
                        <td className="p-3 text-right">
                          <Link href={`/admin/candidats/${c.user_id}/entretien/nouveau`} className="btn btn-sm btn-primary whitespace-nowrap">Nouvel entretien</Link>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {!C.size && <p className="card border-dashed p-6 text-sm text-muted">Aucun candidat inscrit pour l&apos;instant.</p>}
        </div>
      )}

      {vue === "briefing" && (
        <BriefingSemaine base="/admin/candidats" lignes={await briefingEtudiants(tousCandidats, maintenant)} />
      )}

      {vue === "relances" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/admin?vue=relances" className={`chip ${sp.tous ? "chip-tag" : "chip-plus"}`}>Mes relances</Link>
            <Link href="/admin?vue=relances&tous=1" className={`chip ${sp.tous ? "chip-plus" : "chip-tag"}`}>Toute l&apos;équipe</Link>
            <span className="text-muted">La cloche 🔔 en haut à droite te prévient à l&apos;heure prévue.</span>
          </div>
          <ListeRelances relances={await relancesDe(sp.tous ? null : moi.user.email ?? "")} base="/admin/candidats" voirAuteur={!!sp.tous} />
        </div>
      )}

      {vue === "ecoles" && (
        <div className="flex flex-col gap-4">
          {ecolesErreur && (
            <p className="rounded-xl bg-warn-soft p-4 text-sm">
              Les tables des écoles n&apos;existent pas encore : exécute le bloc « Espace École » de <code>supabase/schema.sql</code> (il est aussi affiché sur la page /diagnostic).
            </p>
          )}
          {sp.ok && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Enregistré.</p>}
          <form action={creerEcole} className="card grid gap-3 p-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor="e_nom">Nouvelle école</label>
              <input className="input" id="e_nom" name="nom" placeholder="IFP Salon-de-Provence" required />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor="e_resp">Responsable entreprises</label>
              <input className="input" id="e_resp" name="responsable" placeholder="Nom (facultatif)" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor="e_email">Son email</label>
              <input className="input" id="e_email" name="email" type="email" placeholder="responsable@ecole.fr" />
            </div>
            <button className="btn btn-primary">Créer l&apos;école</button>
          </form>
          {ecoles.map((e) => {
            const resp = responsables.filter((r) => r.ecole_id === e.id);
            const nbEtudiants = [...C.values()].filter((c) => c.ecole_id === e.id).length;
            return (
              <article key={e.id} className="card flex flex-col gap-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{e.nom}</h2>
                    <p className="text-sm text-muted">{nbEtudiants} étudiant{nbEtudiants > 1 ? "s" : ""} inscrit{nbEtudiants > 1 ? "s" : ""}</p>
                  </div>
                  <span className="chip chip-tag font-mono">{e.code}</span>
                </div>
                <p className="text-sm">Lien d&apos;inscription des étudiants : <code className="break-all font-mono text-xs">{site}/inscription?ecole={e.code}</code></p>
                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  <span className="eyebrow">🎓 Formations et brochures</span>
                  {"formations" in e && (
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted">Brochure générale (si une formation n&apos;a pas la sienne) :</span>
                      <FormBrochure ecoleId={e.id} formation="" actuelle={(e as { brochure?: string | null }).brochure} />
                    </div>
                  )}
                  {!("formations" in e) && <p className="text-xs text-muted">Exécute la mise à jour SQL de /diagnostic pour ajouter des formations.</p>}
                  <ul className="flex flex-col gap-1.5">
                    {lireFormations(e.formations).map((fo) => (
                      <li key={fo.nom} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2 text-sm">
                        <span className="flex flex-col gap-1">
                          <span><b>{fo.nom}</b> · {fo.duree} an{fo.duree > 1 ? "s" : ""} ·{" "}
                          {Array.from({ length: fo.duree }, (_, i) => i + 1).map((n) => `${anneeLabel(n)} ${fo.alternance.includes(n) ? "alternance" : "initiale"}`).join(", ")}</span>
                          <FormBrochure ecoleId={e.id} formation={fo.nom} actuelle={fo.brochure} defaut={BROCHURES_PAR_DEFAUT[fo.nom.toUpperCase()]} />
                        </span>
                        <form action={retirerFormation}>
                          <input type="hidden" name="ecole_id" value={e.id} />
                          <input type="hidden" name="nom" value={fo.nom} />
                          <button className="btn btn-sm btn-ghost text-bad">Retirer</button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  {"formations" in e && (
                    <form action={ajouterFormation} className="flex flex-wrap items-end gap-2 text-sm">
                      <input type="hidden" name="ecole_id" value={e.id} />
                      <label className="flex flex-col gap-1"><span className="font-semibold">Nom</span><input className="input w-40" name="nom" placeholder="EGC" required /></label>
                      <label className="flex flex-col gap-1"><span className="font-semibold">Durée</span>
                        <select className="input" name="duree" defaultValue="2">{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} an{n > 1 ? "s" : ""}</option>)}</select>
                      </label>
                      <fieldset className="flex flex-wrap items-center gap-2 pb-2">
                        <legend className="mb-1 font-semibold">Années en alternance</legend>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <label key={n} className="flex items-center gap-1"><input type="checkbox" name="alternance" value={n} className="accent-[var(--accent)]" />{anneeLabel(n)}</label>
                        ))}
                      </fieldset>
                      <button className="btn btn-sm">➕ Ajouter la formation</button>
                    </form>
                  )}
                </div>
                <div className="flex flex-col gap-2 border-t border-line pt-3">
                  <span className="eyebrow">Responsables (accès à l&apos;espace École)</span>
                  {resp.map((r) => (
                    <form key={r.email} action={retirerResponsable} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>{r.nom ? `${r.nom} · ` : ""}{r.email}</span>
                      <input type="hidden" name="email" value={r.email} />
                      <button className="btn btn-sm btn-ghost">Retirer</button>
                    </form>
                  ))}
                  <form action={ajouterResponsable} className="flex flex-wrap gap-2">
                    <input type="hidden" name="ecole_id" value={e.id} />
                    <input className="input max-w-[12rem]" name="nom" placeholder="Nom" aria-label="Nom du responsable" />
                    <input className="input max-w-xs" name="email" type="email" placeholder="email@ecole.fr" aria-label="Email du responsable" required />
                    <button className="btn btn-sm">Ajouter</button>
                  </form>
                </div>
              </article>
            );
          })}
          {!ecoles.length && !ecolesErreur && <p className="card border-dashed p-6 text-sm text-muted">Aucune école pour l&apos;instant. Crée la première ci-dessus.</p>}
        </div>
      )}

      {vue === "reglages" && (
        <form action={changerFrequence} className="card flex max-w-2xl flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Fréquence de recherche automatique</h2>
            <p className="text-sm text-muted">
              À quelle fréquence le site cherche de nouvelles offres pour tous les candidats et les note.
              Moins souvent = moins de crédit Anthropic consommé. Les candidats peuvent toujours lancer une recherche eux-mêmes.
            </p>
          </div>
          {!tableOk && (
            <p className="rounded-lg bg-warn-soft p-3 text-sm">
              Pour enregistrer ce réglage, exécute d&apos;abord la fin du fichier <code>supabase/schema.sql</code> (bloc « Réglages ») dans Supabase &gt; SQL Editor.
            </p>
          )}
          {sp.ok && <p className="rounded-lg bg-good-soft p-3 text-sm text-good">Réglage enregistré.</p>}
          {sp.erreur && <p className="rounded-lg bg-bad-soft p-3 text-sm text-bad">L&apos;enregistrement a échoué. Vérifie que le bloc « Réglages » du fichier SQL a bien été exécuté.</p>}
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Fréquence</legend>
            {FREQUENCES.map((f) => (
              <label key={f.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3 has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
                <input type="radio" name="frequence" value={f.id} defaultChecked={frequence === f.id} className="mt-1 accent-[var(--accent)]" />
                <span className="flex flex-col">
                  <span className="font-semibold">{f.label}</span>
                  <span className="text-sm text-muted">{f.detail}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <div className="flex justify-end">
            <button className="btn btn-primary">Enregistrer</button>
          </div>
        </form>
      )}

      {vue === "entreprises" && (
        <nav className="flex flex-wrap gap-2" aria-label="Mes entreprises">
          {([
            ["entreprises", "🏢", "Entreprises", nbEntreprises],
            ["offres", "💼", "Offres", offresEquipe.length],
            ["candidats", "👥", "Candidats à traiter", aTraiter],
          ] as const).map(([id, icone, label, n]) => (
            <Link key={id} href={`/admin?vue=entreprises${id === "entreprises" ? "" : `&sous=${id}`}`} aria-current={sous === id ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${sous === id ? "border-accent bg-accent-soft text-ink" : "border-line bg-surface text-muted hover:text-ink"}`}>
              <span aria-hidden>{icone}</span>{label}<span className="rounded-full bg-bg px-2 text-xs tabular-nums">{n}</span>
            </Link>
          ))}
        </nav>
      )}

      {vue === "entreprises" && sous === "entreprises" && (
        <div className="flex flex-col gap-3">
          {entreprises === null && (
            <p className="rounded-xl bg-warn-soft p-4 text-sm">« Mes entreprises » n&apos;est pas encore activé : exécute la mise à jour SQL affichée sur la page /diagnostic.</p>
          )}
          <form method="get" action="/admin" className="card flex flex-wrap items-end gap-3 p-4">
            <input type="hidden" name="vue" value="entreprises" />
            <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
              <span className="font-semibold">🔎 Rechercher</span>
              <input className="input" name="q" defaultValue={sp.q ?? ""} placeholder="Nom, secteur, ville, contact…" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">🤝 Où on en est</span>
              <select className="input" name="statut" defaultValue={fStatut}>
                <option value="">Tous</option>
                {STATUTS_ENTREPRISE.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">💼 Offres</span>
              <select className="input" name="offre" defaultValue={fOffre}>
                <option value="">Toutes</option><option value="avec">Avec une offre</option><option value="sans">Sans offre</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">🎓 Trouvée par</span>
              <select className="input" name="trouvee" defaultValue={fTrouvee}>
                <option value="">Tous</option>
                <option value="etudiant">Un étudiant</option>
                <option value="recrute">Un étudiant · recrute ✅</option>
                <option value="equipe">L&apos;équipe</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">📍 Rencontrée par</span>
              <select className="input" name="origine" defaultValue={fOrigine}>
                <option value="">Toutes</option>
                {ORIGINES_ENTREPRISE.map((o) => <option key={o}>{o}</option>)}
              </select>
            </label>
            <div className="flex gap-2">
              <button className="btn btn-primary">Filtrer</button>
              {filtresEntActifs && <Link href="/admin?vue=entreprises" className="btn btn-ghost">Effacer</Link>}
            </div>
          </form>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted"><b className="text-ink">{entreprisesAffichees.length}</b> entreprise{entreprisesAffichees.length > 1 ? "s" : ""}{filtresEntActifs ? ` sur ${nbEntreprises}` : ""}</p>
            <Link href="/admin/entreprises/nouvelle" className="btn btn-primary">➕ Ajouter une entreprise</Link>
          </div>
          {entreprises && !entreprisesAffichees.length && (
            <p className="card border-dashed p-6 text-sm text-muted">
              {nbEntreprises ? "Aucune entreprise ne correspond à ces filtres." : "Ajoute les entreprises que tu as rencontrées, même sans offre : tu pourras suivre tes échanges et programmer des rappels."}
            </p>
          )}
          {!!entreprisesAffichees.length && (
            <div className="overflow-x-auto rounded-xl border border-line bg-surface">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="p-3 font-semibold">Entreprise</th>
                    <th className="p-3 font-semibold">Où on en est</th>
                    <th className="p-3 font-semibold">Trouvée par</th>
                    <th className="p-3 font-semibold">Contact</th>
                    <th className="p-3 font-semibold">Offres</th>
                    <th className="p-3 font-semibold">Fiche besoin</th>
                    <th className="p-3 font-semibold">Dernier échange</th>
                    <th className="p-3 font-semibold">Rappel</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {entreprisesAffichees.map((e) => {
                    const nOffres = parEntreprise.get(e.id)!.filter((o) => o.ouverte).length;
                    const ech = echangesEnt.filter((x) => x.entreprise_id === e.id);
                    const rappel = ech.filter((x) => x.action && !x.action_faite).map((x) => echeance(x)).filter((d): d is Date => !!d).sort((a, b) => +a - +b)[0];
                    const d = decouvreurs.get(e.id) ?? [];
                    const court = (iso: string | Date) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
                    return (
                      <tr key={e.id} className="border-b border-line align-top last:border-0 hover:bg-bg">
                        <td className="p-3">
                          <Link href={`/admin/entreprises/${e.id}`} className="font-semibold hover:text-accent hover:underline">🏢 {e.nom}</Link>
                          <div className="text-xs text-muted">{[e.secteur, e.ville].filter(Boolean).join(" · ") || "—"}</div>
                        </td>
                        <td className="p-3">
                          <form action={changerStatutEntreprise}>
                            <input type="hidden" name="id" value={e.id} />
                            <SelectAuto name="statut" label={`Statut de ${e.nom}`} defaultValue={e.statut} options={STATUTS_ENTREPRISE} />
                          </form>
                        </td>
                        <td className="p-3">
                          {d.length ? (
                            <>
                              <Link href={`/admin/candidats/${d[0].candidat_id}?onglet=prospections`} className="hover:text-accent hover:underline">🎓 {d[0].nom}</Link>
                              <div className="text-xs text-muted">{court(d[0].date)}{d[0].recrute === "oui" ? " · ✅ recrute" : ""}{d.length > 1 ? ` · +${d.length - 1}` : ""}</div>
                            </>
                          ) : <span className="text-xs text-muted">L&apos;équipe</span>}
                        </td>
                        <td className="p-3">
                          {e.contact_nom ? <>{e.contact_nom}<div className="text-xs text-muted">{e.contact_tel || e.contact_email || e.contact_fonction}</div></> : <span className="text-muted">—</span>}
                        </td>
                        <td className="p-3"><span className={`chip whitespace-nowrap ${nOffres ? "chip-plus" : ""}`}>💼 {nOffres || "Aucune"}</span></td>
                        <td className="p-3">{e.attentes ? <span className="chip whitespace-nowrap chip-plus">📋 Remplie</span> : <Link href={`/admin/entreprises/${e.id}?besoins=1#besoins`} className="chip whitespace-nowrap chip-minus">📋 À remplir</Link>}</td>
                        <td className="p-3 text-muted">{ech[0] ? court(ech[0].date_echange) : "—"}</td>
                        <td className="p-3">{rappel ? <span className={`chip whitespace-nowrap ${+rappel <= maintenant ? "chip-minus" : "chip-tag"}`}>⏰ {court(rappel)}</span> : <span className="text-muted">—</span>}</td>
                        <td className="p-3 text-right">
                          <span className="flex justify-end gap-2">
                            <Link href={`/admin/entreprises/${e.id}?onglet=echanges`} className="btn btn-sm whitespace-nowrap">💬 Échanges</Link>
                            <Link href={`/admin/entreprises/${e.id}`} className="btn btn-sm btn-primary whitespace-nowrap">Fiche →</Link>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {vue === "entreprises" && sous === "offres" && (
        <div className="grid gap-3 md:grid-cols-2">
          {((offres ?? []) as Offre[]).map((o) => (
            <article key={o.id} className="card flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{o.entreprise}</h2>
                  <p className="text-sm text-muted">{o.intitule}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <span className={`chip ${o.source === "partenaire" ? "chip-tag" : ""}`}>{sourceLabel(o.source)}</span>
                  {(() => { const x = texteExpiration(o.expire_le, maintenant); return x ? <span className={`chip ${x.chip}`}>{x.texte}</span> : null; })()}
                  {!o.ouverte && !estExpiree(o, maintenant) && <span className="chip chip-minus">Fermée</span>}
                </div>
              </div>
              <p className="text-sm">{[o.contrat_libelle || contratLabel(o.contrat), o.lieu].filter(Boolean).join(" · ")}</p>
              <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-2">
                <form action={genererFicheDePosteOffre}>
                  <input type="hidden" name="offre_id" value={o.id} />
                  <input type="hidden" name="retour" value="/admin?vue=entreprises&sous=offres" />
                  <button className="btn btn-sm btn-primary">📄 {o.fiche ? "Regénérer" : "Générer la fiche de poste"}</button>
                </form>
                {o.fiche && <Link className="btn btn-sm" href={`/admin/offres/${o.id}/fiche`}>👁️ Voir la fiche de poste</Link>}
                <Link className="btn btn-sm btn-ghost" href={`/admin/offres/${o.id}`}>Modifier</Link>
              </div>
            </article>
          ))}
          {!offres?.length && <p className="card border-dashed p-6 text-sm text-muted">Aucune offre ajoutée par l&apos;équipe. Les offres France Travail sont cherchées automatiquement pour chaque candidat.</p>}
        </div>
      )}

      {vue === "entreprises" && sous === "candidats" && (
        <div id="a-traiter" className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">👥 Candidats qui correspondent à mes offres</h2>
          <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrer par étape">
            <Link href="/admin?vue=entreprises&sous=candidats#a-traiter" className={`chip ${!filtreSuivi ? "chip-plus" : ""}`}>Toutes ({equipe.length})</Link>
            {SUIVIS.map((x) => (
              <Link key={x.id} href={`/admin?vue=entreprises&sous=candidats&suivi=${x.id}#a-traiter`} className={`chip ${filtreSuivi?.id === x.id ? "chip-plus" : ""}`}>
                {x.label} ({equipe.filter((m) => m.suivi === x.id).length})
              </Link>
            ))}
          </nav>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="max-w-[70ch] text-muted">
              Les candidats ne voient pas les offres de l&apos;équipe : c&apos;est toi qui fais le lien. Ouvre « Préparer les messages » pour écrire à l&apos;étudiant et à l&apos;entreprise{moyenEnvoi() ? ", et envoie-les directement d'ici" : ""}.
            </p>
          </div>
          {!lignes.length && (
            <p className="card border-dashed p-6 text-sm text-muted">
              {filtreSuivi ? `Aucune mise en relation à l'étape « ${filtreSuivi.label} ».` : `Aucune correspondance à ${SEUIL} % ou plus sur vos offres pour l'instant.`} Ajoute les offres de tes entreprises partenaires : elles sont comparées à tous les candidats.
            </p>
          )}
          {lignes.map((m) => {
            const c = C.get(m.candidat_id)!, o = O.get(m.offre_id)!;
            const signature = ecoles.find((e) => e.id === c.ecole_id)?.nom ?? "L'équipe MagnusMatch";
            const mEtu = messageEtudiant(c, o, m, signature), mEnt = messageEntreprise(c, o, m, signature);
            const aContacter = estOffreEquipe(o.source);
            return (
              <article key={m.candidat_id + m.offre_id} className={`card flex flex-col gap-4 p-5 ${m.suivi === "a_traiter" ? "" : "opacity-90"}`}>
                <div className="grid gap-4 md:grid-cols-[5rem_1fr_14rem]">
                  <Score score={m.score} seuil={SEUIL} />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <h2 className="text-lg font-semibold"><Link href={`/admin/candidats/${c.user_id}`} className="hover:text-accent hover:underline">{c.nom || c.email}</Link> <span className="text-muted">→</span> {o.entreprise || "Entreprise"}</h2>
                    <p className="text-sm text-muted">{[o.intitule, o.lieu, o.contrat_libelle || contratLabel(o.contrat)].filter(Boolean).join(" · ")}</p>
                    <p className="text-sm">{m.resume}</p>
                    <Chips forts={m.forts} manques={m.manques} />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className={`chip ${aContacter ? "chip-tag" : ""}`}>{aContacter ? "Votre offre" : sourceLabel(o.source)}</span>
                      {!c.consentement && <span className="chip chip-minus">Accord RGPD manquant</span>}
                      {o.lien && <a className="font-semibold text-accent" href={o.lien} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce</a>}
                      {c.cv_chemin && <a className="font-semibold text-accent" href={`/admin/cv/${c.user_id}`} target="_blank">CV du candidat</a>}
                      <a className="font-semibold text-accent" href={`/entretien/${c.user_id}/${o.id}`}>{m.preparation_le ? "Fiche entretien ✓" : "Fiche entretien"}</a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!aContacter && (
                      <>
                        <span className="eyebrow">Avis du candidat</span>
                        <span className={`chip w-fit ${m.avis_candidat === "interesse" || m.avis_candidat === "postule" ? "chip-plus" : ""}`}>
                          {AVIS.find((a) => a.id === m.avis_candidat)?.label}
                        </span>
                      </>
                    )}
                    <span className="eyebrow">Suivi</span>
                    <form action={changerSuivi}>
                      <input type="hidden" name="candidat_id" value={m.candidat_id} />
                      <input type="hidden" name="offre_id" value={m.offre_id} />
                      <SelectAuto name="suivi" label="Suivi" defaultValue={m.suivi} options={SUIVIS} />
                    </form>
                  </div>
                </div>
                <details className="rounded-lg border border-line p-3" open={aContacter && m.suivi === "a_traiter" && lignes.indexOf(m) === 0}>
                  <summary className="cursor-pointer text-sm font-semibold text-accent">Préparer les messages</summary>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <MessageEnvoyable
                      titre="Message étudiant" cible="etudiant" candidatId={c.user_id} offreId={o.id}
                      email={c.email} autresCoordonnees={c.telephone ? `Téléphone : ${c.telephone}` : ""}
                      objet={mEtu.objet} texte={mEtu.texte} action={envoyerMessageAdmin} envoiPossible={Boolean(moyenEnvoi())}
                    />
                    <MessageEnvoyable
                      titre="Message entreprise" cible="entreprise" candidatId={c.user_id} offreId={o.id}
                      email={o.contact_email}
                      autresCoordonnees={[o.contact_nom, o.contact_tel && `Téléphone : ${o.contact_tel}`, !o.contact_email && o.lien && "Pas d'email : postuler via le lien de l'annonce"].filter(Boolean).join(" · ")}
                      objet={mEnt.objet} texte={mEnt.texte} action={envoyerMessageAdmin} envoiPossible={Boolean(moyenEnvoi())}
                    />
                  </div>
                  {!c.consentement && <p className="mt-3 rounded-lg bg-warn-soft p-2 text-sm">Le candidat n&apos;a pas coché l&apos;accord RGPD : demande-lui avant de transmettre son profil.</p>}
                </details>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

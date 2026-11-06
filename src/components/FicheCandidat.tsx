import Link from "next/link";
import { OngletsCartes } from "@/components/OngletsCartes";
import { ADMISSIONS, admission } from "@/lib/admission";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chips, Score } from "@/components/Score";
import { SelectAuto } from "@/components/SelectAuto";
import { Carte, type PointOffre } from "@/components/Carte";
import { BILANS } from "@/lib/entretien-conseil";
import { derniersTests } from "@/lib/tests-serveur";
import { etatSynthese } from "@/lib/synthese";
import { BoutonSynthese } from "@/components/BoutonSynthese";
import { CvRendu } from "@/components/CvRendu";
import { ResultatLinkedin } from "@/components/ResultatLinkedin";
import { FormEchange } from "@/components/FormEchange";
import { TYPES_ECHANGE, echangesDuCandidat, echeance, maintenantMs } from "@/lib/echanges";
import { ResultatDisc, ResultatManagement } from "@/components/ResultatsTests";
import { COULEURS } from "@/lib/tests";
import {
  AVIS, SCORE_ORANGE, diplomeLabel, SEUIL, SUIVIS, contratLabel, estOffreEquipe, sourceLabel,
  type Candidat, type Correspondance, type Offre, type Piste, type Recherche,
} from "@/lib/types";

const PERMIS: Record<string, string> = { permis_vehicule: "Permis et véhicule", permis: "Permis, sans véhicule", non: "Pas de permis" };
const dateFr = (d?: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }) : "—");

function Bloc({ titre, children, action }: { titre: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{titre}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const Ligne = ({ l, v }: { l: string; v: React.ReactNode }) => (
  <><dt className="text-muted">{l}</dt><dd className="min-w-0 break-words">{v || "—"}</dd></>
);

/**
 * Fiche complète d'un candidat pour l'équipe : profil, CV, recherches, offres.
 * Les droits sont vérifiés par la page qui l'affiche.
 */
export async function FicheCandidat({ candidatId, cheminCV, retour, changerSuivi, baseFiche, onglet = "profil", autoriserTest, genererSynthese, genererCvAmeliore, ajouterEchange, supprimerEchange, actionFaite, changerAdmission }: {
  changerAdmission?: (f: FormData) => Promise<void>;
  candidatId: string;
  autoriserTest: (f: FormData) => Promise<void>;
  genererSynthese: (e: { erreur?: string }, f: FormData) => Promise<{ erreur?: string }>;
  onglet?: "profil" | "cv" | "offres" | "echanges" | "suivi";
  ajouterEchange: (e: { erreur?: string; ok?: boolean }, f: FormData) => Promise<{ erreur?: string; ok?: boolean }>;
  supprimerEchange: (f: FormData) => Promise<void>;
  actionFaite: (f: FormData) => Promise<void>;
  genererCvAmeliore: (e: { erreur?: string }, f: FormData) => Promise<{ erreur?: string }>;
  /** Adresse de cette fiche, pour les liens vers les entretiens (ex. /admin/candidats/<id>). */
  baseFiche: string;
  cheminCV: string;
  retour: { href: string; libelle: string };
  changerSuivi: (f: FormData) => Promise<void>;
}) {
  const db = createAdminClient();
  const { data: c } = await db.from("candidats").select("*").eq("user_id", candidatId).single<Candidat>();
  if (!c) return <p className="card p-6">Candidat introuvable.</p>;

  const [{ data: rData }, { data: mData }, { data: eData }, { data: entData }] = await Promise.all([
    db.from("recherches").select("*").eq("candidat_id", candidatId).order("created_at"),
    db.from("correspondances").select("*").eq("candidat_id", candidatId).order("score", { ascending: false }).limit(300),
    c.ecole_id ? db.from("ecoles").select("nom").eq("id", c.ecole_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from("entretiens_conseil").select("id, date_entretien, conseiller, bilan, partage, prochaine_etape").eq("candidat_id", candidatId).order("date_entretien", { ascending: false }),
  ]);
  const tests = await derniersTests(candidatId);
  const echanges = await echangesDuCandidat(candidatId);
  const maintenant = maintenantMs();
  const quand = (e: { action_a?: string | null; action_le?: string | null }) => echeance(e)?.getTime() ?? Infinity;
  const relances = echanges.filter((e) => e.action && !e.action_faite).sort((a, b) => quand(a) - quand(b));
  const dateRelance = (e: { action_a?: string | null; action_le?: string | null }, long = false) => {
    const d = echeance(e);
    if (!d) return "";
    return d.toLocaleString("fr-FR", { day: "numeric", month: long ? "long" : "short", timeZone: "Europe/Paris", ...(e.action_a ? { hour: "2-digit", minute: "2-digit" } : {}) });
  };
  const dernierEchange = echanges[0];
  // Lien temporaire (10 min) pour afficher le CV directement dans la page
  const urlCV = c.cv_chemin && onglet === "cv" ? (await db.storage.from("cv").createSignedUrl(c.cv_chemin, 600)).data?.signedUrl ?? null : null;
  const etat = await etatSynthese(candidatId);
  const syn = etat.synthese?.contenu;
  const pret = etat.entretien && etat.disc && etat.management;
  const { data: autoData } = await db.from("tests_autorisations").select("test").eq("candidat_id", candidatId);
  const autorises = new Set(((autoData ?? []) as { test: string }[]).map((a) => a.test));
  const boutonAutoriser = (test: string) =>
    autorises.has(test) ? (
      <span className="chip chip-plus">Autorisé à repasser</span>
    ) : (
      <form action={autoriserTest}>
        <input type="hidden" name="candidat_id" value={candidatId} />
        <input type="hidden" name="test" value={test} />
        <button className="btn btn-sm btn-ghost">Autoriser à repasser</button>
      </form>
    );
  const entretiens = (entData ?? []) as { id: string; date_entretien: string; conseiller: string; bilan: string; partage: boolean; prochaine_etape: string }[];
  const recherches = (rData ?? []) as Recherche[];
  const matchs = (mData ?? []) as Correspondance[];
  const ids = matchs.map((m) => m.offre_id);
  const { data: oData } = ids.length ? await db.from("offres").select("*").in("id", ids) : { data: [] };
  const O = new Map(((oData ?? []) as Offre[]).map((o) => [o.id, o]));
  const lignes = matchs.filter((m) => O.get(m.offre_id)?.ouverte && m.score >= SCORE_ORANGE).sort((a, b) => b.score - a.score);
  const pistes = (c.pistes ?? []) as Piste[];
  const k = c.cv_conseils;

  const points: PointOffre[] = lignes
    .map((m) => ({ m, o: O.get(m.offre_id)! }))
    .filter(({ o }) => o.latitude != null && o.longitude != null)
    .map(({ m, o }) => ({
      id: o.id, latitude: o.latitude!, longitude: o.longitude!, score: m.score,
      intitule: o.intitule, entreprise: o.entreprise, lieu: o.lieu, contrat: o.contrat_libelle || contratLabel(o.contrat), lien: o.lien,
    }));
  const nomRecherche = (m: Correspondance) =>
    m.piste ? `Piste : ${m.piste}` : m.recherche_id ? recherches.find((r) => r.id === m.recherche_id)?.poste ?? c.poste_vise : c.poste_vise;

  const stats = [
    ["Offres proposées", lignes.length],
    [`≥ ${SEUIL} %`, lignes.filter((m) => m.score >= SEUIL).length],
    ["Ça l'intéresse", lignes.filter((m) => m.avis_candidat === "interesse").length],
    ["Candidatures", lignes.filter((m) => m.avis_candidat === "postule").length],
    ["Écartées", matchs.filter((m) => m.avis_candidat === "pas_interesse").length],
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <Link href={retour.href} className="text-sm text-muted">← {retour.libelle}</Link>

      {changerAdmission && (() => {
        const actuel = admission(c.statut_admission);
        return (
          <form action={changerAdmission} className={`flex flex-wrap items-center gap-3 rounded-2xl border-2 p-3 ${c.statut_admission === "admis" || c.statut_admission == null ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
            <input type="hidden" name="candidat_id" value={candidatId} />
            <span className="text-sm font-semibold">🎓 Admission :</span>
            <div className="flex flex-wrap gap-2">
              {ADMISSIONS.map((a) => (
                <label key={a.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
                  <input type="radio" name="statut_admission" value={a.id} defaultChecked={actuel.id === a.id} className="sr-only" />
                  <span aria-hidden>{a.icone}</span>{a.label}
                </label>
              ))}
            </div>
            <button className="btn btn-sm btn-primary">Enregistrer</button>
            <span className="text-xs text-muted">{actuel.id === "admis" ? "L'étudiant a accès à ses offres." : "Tant qu'il n'est pas « Admis », l'étudiant ne voit pas d'offres (il peut remplir son profil, son CV et ses tests)."}</span>
          </form>
        );
      })()}

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Fiche candidat</span>
          <h1 className="text-3xl font-extrabold">{c.nom || c.email}</h1>
          <p className="text-muted">{[c.formation && `🎓 ${diplomeLabel(c)}`, c.poste_vise && `vise ${c.poste_vise}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tests.disc && (() => {
            const d = COULEURS.find((x) => x.id === tests.disc!.dominante.split(",")[0]);
            return d ? <span className="chip font-semibold text-white" style={{ background: d.hex, borderColor: d.hex }}>DISC : {d.nom}</span> : null;
          })()}
          {!c.consentement && <span className="chip chip-minus">Accord RGPD manquant</span>}
          {c.cv_chemin && <a className="btn btn-primary" href={cheminCV} target="_blank">Ouvrir le CV (PDF)</a>}
        </div>
      </header>

      {(relances.length > 0 || dernierEchange) && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {dernierEchange && (
            <span className="text-muted">
              Dernier échange : {TYPES_ECHANGE.find((t) => t.id === dernierEchange.type)?.icone} {new Date(dernierEchange.date_echange).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}
            </span>
          )}
          {relances.slice(0, 2).map((r) => (
            <Link key={r.id} href={`${baseFiche}?onglet=echanges`}
              className={`chip ${quand(r) <= maintenant ? "chip-minus" : "chip-tag"}`}>
              ⏰ {r.action}{echeance(r) ? ` · ${dateRelance(r)}` : ""}
            </Link>
          ))}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([l, v]) => (
          <div key={l} className="card flex flex-col p-4"><span className="eyebrow">{l}</span><b className="font-mono text-2xl tabular-nums">{v}</b></div>
        ))}
      </section>

      <OngletsCartes label="Onglets de la fiche" onglets={([
        ["profil", "🪪", "Profil", "Infos et projet"],
        ["cv", "📄", "CV", "CV et LinkedIn"],
        ["offres", "💼", "Offres", `${lignes.length} proposée${lignes.length > 1 ? "s" : ""}`],
        ["echanges", "💬", "Échanges", `${echanges.length} noté${echanges.length > 1 ? "s" : ""}`],
        ["suivi", "🧭", "Tests et entretien", "DISC, bilan"],
      ] as const).map(([id, icone, label, sous]) => ({
        href: id === "profil" ? baseFiche : `${baseFiche}?onglet=${id}`, icone, label, sous, actif: onglet === id,
      }))} />

      {onglet === "profil" && (
        <>
        <Bloc titre="Profil">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <Ligne l="Diplôme préparé" v={c.formation ? diplomeLabel(c) : <span className="text-bad">À compléter par l&apos;étudiant</span>} />
            <Ligne l="Email" v={<span className="select-all">{c.email}</span>} />
            <Ligne l="Téléphone" v={c.telephone && <span className="select-all">{c.telephone}</span>} />
            <Ligne l="Secteur" v={[c.ville, c.code_postal].filter(Boolean).join(" ") + ` · ${c.mobilite_km} km`} />
            <Ligne l="Permis" v={PERMIS[c.permis] ?? "Non précisé"} />
            <Ligne l="Contrats" v={c.contrats.map(contratLabel).join(", ")} />
            {c.contrats.includes("alternance") && <Ligne l="Rythme" v={c.rythme} />}
            <Ligne l="Disponible" v={c.disponibilite} />
            <Ligne l="École" v={(eData as { nom: string } | null)?.nom} />
            <Ligne l="Alertes email" v={c.alertes_email ? "Oui" : "Non"} />
            <Ligne l="Dernière recherche" v={dateFr(c.derniere_recherche)} />
          </dl>
          {c.projet && (
            <div className="flex flex-col gap-1 border-t border-line pt-3">
              <span className="eyebrow">Son projet</span>
              <p className="text-sm">{c.projet}</p>
            </div>
          )}
        </Bloc>

      <Bloc titre="Recherches">
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex flex-wrap items-center gap-2"><span className="chip chip-tag">Principale</span><b>{c.poste_vise || "—"}</b><span className="text-muted">{c.contrats.map(contratLabel).join(", ")} · {c.mobilite_km} km</span></li>
          {recherches.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center gap-2 ${r.active ? "" : "opacity-60"}`}>
              <span className="chip">{r.active ? "Active" : "En pause"}</span><b>{r.poste}</b><span className="text-muted">{r.contrats.map(contratLabel).join(", ")} · {r.mobilite_km} km</span>
            </li>
          ))}
        </ul>
        {!!pistes.length && (
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <span className="eyebrow">Pistes proposées par MagnusMatch</span>
            <ul className="flex flex-col gap-1.5 text-sm">
              {pistes.map((p) => (
                <li key={p.metier} className={p.ecartee ? "text-muted line-through" : ""}>
                  <b>{p.metier}</b> — {p.raison}{p.ecartee && " (écartée par le candidat)"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Bloc>

        </>
      )}

      {onglet === "cv" && (
        <>
      {urlCV && (
        <section className="card flex flex-col gap-2 p-3">
          <div className="flex items-center justify-between gap-2 px-2">
            <h2 className="text-lg font-semibold">CV d&apos;origine</h2>
            <a className="btn btn-sm" href={cheminCV} target="_blank">Ouvrir dans un onglet</a>
          </div>
          <iframe src={urlCV} title="CV du candidat" className="h-[75vh] min-h-[480px] w-full rounded-lg border border-line bg-white" />
        </section>
      )}
        <Bloc titre="Analyse du CV par MagnusMatch" action={c.cv_chemin ? <a className="btn btn-sm" href={cheminCV} target="_blank">Ouvrir le PDF</a> : undefined}>
          {!c.cv_chemin && <p className="text-sm text-muted">Pas encore de CV déposé.</p>}
          {k && (
            <div className="flex items-start gap-4">
              <b className={`font-mono text-4xl font-bold ${k.note >= 8 ? "text-good" : k.note >= 5 ? "text-warn" : "text-bad"}`}>{k.note}<small className="text-base text-muted">/10</small></b>
              <p className="text-sm">{k.resume}</p>
            </div>
          )}
          {k?.mise_en_page && (
            <p className="text-sm"><span className={`chip mr-2 ${k.mise_en_page.avis === "personnalisée" ? "chip-plus" : "chip-minus"}`}>Mise en page : {k.mise_en_page.avis}</span>{k.mise_en_page.explication}</p>
          )}
          {!!c.competences?.length && <div className="flex flex-wrap gap-1.5">{c.competences.map((x) => <span key={x} className="chip chip-tag">{x}</span>)}</div>}
          {k?.description_proposee && (
            <div className="flex flex-col gap-1 border-t border-line pt-3">
              <span className="eyebrow">Description proposée par MagnusMatch</span>
              <p className="text-sm italic">{k.description_proposee}</p>
            </div>
          )}
          {!!k?.ameliorations?.length && (
            <div className="flex flex-col gap-1 border-t border-line pt-3">
              <span className="eyebrow">Points à travailler</span>
              <ul className="flex flex-col gap-1 text-sm">
                {k.ameliorations.filter((a) => a.priorite === "important").map((a, i) => <li key={i}>• <b>{a.categorie} :</b> {a.conseil}</li>)}
              </ul>
            </div>
          )}
        </Bloc>

      <Bloc
        titre="CV amélioré par MagnusMatch"
        action={<BoutonSynthese candidatId={candidatId} action={genererCvAmeliore} actif={Boolean(c.cv_texte)} libelle={c.cv_ameliore ? "Le régénérer" : "Générer le CV amélioré"} />}
      >
        {!c.cv_texte && <p className="text-sm text-muted">Le CV doit d&apos;abord être déposé et analysé.</p>}
        {c.cv_ameliore ? (
          <>
            <p className="text-sm text-muted">
              Réécrit par MagnusMatch à partir de son CV et de son profil, sans rien inventer : les informations manquantes sont marquées « à compléter ».
              L&apos;étudiant le voit aussi dans « Mon CV ».
            </p>
            <div className="overflow-hidden rounded-lg border border-line"><CvRendu cv={c.cv_ameliore} compact /></div>
            <Link className="btn btn-sm w-fit" href={`/cv/${candidatId}`} target="_blank">Ouvrir pour imprimer ou enregistrer en PDF</Link>
          </>
        ) : c.cv_texte ? (
          <p className="text-sm text-muted">MagnusMatch réécrit le CV dans une mise en page sobre, avec une description du projet, des expériences détaillées et des compétences claires.</p>
        ) : null}
      </Bloc>
      <Bloc titre="Réseau · LinkedIn">
        {c.linkedin_url
          ? <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="w-fit font-semibold text-accent hover:underline">Ouvrir son profil LinkedIn ↗</a>
          : <p className="text-sm text-muted">Pas encore d&apos;adresse LinkedIn renseignée.</p>}
        {c.linkedin_analyse
          ? <ResultatLinkedin a={c.linkedin_analyse} le={c.linkedin_le} staff />
          : <p className="text-sm text-muted">L&apos;étudiant n&apos;a pas encore fait analyser son profil (Mon profil → CV et réseau → Réseau).</p>}
      </Bloc>
        </>
      )}

      {onglet === "offres" && (
        <>
      <Bloc titre={`Ses offres (${lignes.length})`}>
        {!!points.length && (
          <Carte
            offres={points}
            seuil={SEUIL}
            domicile={c.latitude != null && c.longitude != null ? { latitude: c.latitude, longitude: c.longitude, rayonKm: c.mobilite_km || 20, ville: c.ville || c.code_postal } : null}
            className="h-[380px] w-full overflow-hidden rounded-xl border border-line"
          />
        )}
        {!lignes.length && <p className="text-sm text-muted">Pas encore d&apos;offre à 65 % ou plus.</p>}
        <ul className="flex flex-col gap-2">
          {lignes.map((m) => {
            const o = O.get(m.offre_id)!;
            const avis = AVIS.find((a) => a.id === m.avis_candidat)?.label;
            return (
              <li key={m.offre_id} className={`grid gap-3 rounded-lg border border-line p-3 md:grid-cols-[5rem_1fr_13rem] ${m.avis_candidat === "pas_interesse" ? "opacity-70" : ""}`}>
                <Score score={m.score} />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-semibold">{o.intitule}</p>
                  <p className="text-sm text-muted">{[o.entreprise, o.lieu, o.contrat_libelle || contratLabel(o.contrat)].filter(Boolean).join(" · ")}</p>
                  <p className="text-sm">{m.resume}</p>
                  <Chips forts={m.forts} manques={m.manques} />
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className={`chip ${estOffreEquipe(o.source) ? "chip-tag" : ""}`}>{estOffreEquipe(o.source) ? "Offre de l'équipe" : sourceLabel(o.source)}</span>
                    <span className="chip">{nomRecherche(m)}</span>
                    {o.lien && <a className="font-semibold text-accent" href={o.lien} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce</a>}
                    <a className="font-semibold text-accent" href={`/entretien/${candidatId}/${o.id}`}>{m.preparation_le ? "Fiche entretien ✓" : "Fiche entretien"}</a>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 text-sm">
                  {!estOffreEquipe(o.source) && (
                    <>
                      <span className="eyebrow">Avis du candidat</span>
                      <span className={`chip w-fit ${m.avis_candidat === "interesse" || m.avis_candidat === "postule" ? "chip-plus" : m.avis_candidat === "pas_interesse" ? "chip-minus" : ""}`}>{avis}</span>
                      {m.avis_candidat === "pas_interesse" && (m as Correspondance & { raison_refus?: string }).raison_refus && (
                        <span className="text-xs text-muted">{(m as Correspondance & { raison_refus?: string }).raison_refus}</span>
                      )}
                    </>
                  )}
                  <span className="eyebrow mt-1">Suivi</span>
                  <form action={changerSuivi}>
                    <input type="hidden" name="candidat_id" value={candidatId} />
                    <input type="hidden" name="offre_id" value={m.offre_id} />
                    <SelectAuto name="suivi" label="Suivi" defaultValue={m.suivi} options={SUIVIS} />
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </Bloc>
        </>
      )}

      {onglet === "echanges" && (
        <>
      <Bloc titre="Noter un échange">
        <FormEchange candidatId={candidatId} action={ajouterEchange} />
      </Bloc>

      <Bloc titre={`Historique des échanges (${echanges.length})`}>
        <p className="text-xs text-muted">Visible uniquement par l&apos;équipe. Les emails envoyés depuis MagnusMatch s&apos;ajoutent automatiquement.</p>
        {!echanges.length && <p className="text-sm text-muted">Aucun échange noté pour l&apos;instant.</p>}
        <ol className="flex flex-col">
          {echanges.map((e) => {
            const t = TYPES_ECHANGE.find((x) => x.id === e.type) ?? TYPES_ECHANGE[4];
            const enRetard = e.action && !e.action_faite && quand(e) <= maintenant;
            return (
              <li key={e.id} className="relative flex gap-3 border-l-2 border-line pb-5 pl-5 last:pb-0">
                <span className="absolute -left-[13px] top-0 grid h-6 w-6 place-items-center rounded-full border border-line bg-surface text-xs" aria-hidden>{t.icone}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-sm">
                    <b>{t.label}</b>
                    <span className="text-muted"> · {new Date(e.date_echange).toLocaleString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}{e.auteur ? ` · ${e.auteur}` : ""}</span>
                  </p>
                  <p className="whitespace-pre-line text-sm">{e.resume}</p>
                  {e.action && (
                    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${e.action_faite ? "bg-bg text-muted line-through" : enRetard ? "bg-bad-soft" : "bg-accent-soft"}`}>
                      <span>⏰ {e.action}{echeance(e) ? ` · le ${dateRelance(e, true)}` : ""}{enRetard ? " (en retard)" : ""}</span>
                      {!e.action_faite && (
                        <span className="flex items-center gap-2">
                        {echeance(e) && <a href={`/api/relances/${e.id}/ics`} className="text-xs text-accent hover:underline">📅 Ajouter à mon agenda</a>}
                        <form action={actionFaite}>
                          <input type="hidden" name="candidat_id" value={candidatId} />
                          <input type="hidden" name="id" value={e.id} />
                          <button className="btn btn-sm">Fait ✓</button>
                        </form>
                        </span>
                      )}
                    </div>
                  )}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted">Supprimer</summary>
                    <form action={supprimerEchange} className="mt-1">
                      <input type="hidden" name="candidat_id" value={candidatId} />
                      <input type="hidden" name="id" value={e.id} />
                      <button className="btn btn-sm text-bad">Confirmer la suppression</button>
                    </form>
                  </details>
                </div>
              </li>
            );
          })}
        </ol>
      </Bloc>
        </>
      )}

      {onglet === "suivi" && (
        <>
      <Bloc
        titre="Synthèse globale"
        action={<BoutonSynthese candidatId={candidatId} action={genererSynthese} actif={pret} libelle={syn ? "Mettre à jour la synthèse" : "Générer la synthèse"} />}
      >
        <ul className="flex flex-wrap gap-2 text-sm">
          {([["Entretien", etat.entretien], ["Test DISC", etat.disc], ["Style de management", etat.management]] as const).map(([l, ok]) => (
            <li key={l} className={`chip ${ok ? "chip-plus" : "chip-minus"}`}>{ok ? "✓" : "✕"} {l}</li>
          ))}
        </ul>
        {!pret && <p className="text-sm text-muted">La synthèse se génère une fois l&apos;entretien et les deux tests faits.</p>}
        {syn && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted">Rédigée par MagnusMatch le {dateFr(etat.synthese!.created_at)}. Version équipe : confidentielle.</p>
            <p className="text-sm">{syn.equipe.portrait}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {([["Points forts", syn.equipe.points_forts], ["Points de vigilance", syn.equipe.vigilance], ["Postes adaptés", syn.equipe.postes_adaptes], ["Prochaines étapes", syn.equipe.prochaines_etapes]] as const).map(([t, items]) => (
                <div key={t} className="rounded-lg border border-line p-3">
                  <h3 className="mb-1 text-sm font-semibold">{t}</h3>
                  <ul className="flex flex-col gap-1 text-sm">{items.map((x) => <li key={x}>• {x}</li>)}</ul>
                </div>
              ))}
            </div>
            <p className="text-sm"><b>Accompagnement recommandé :</b> {syn.equipe.accompagnement}</p>
            <p className="text-sm"><b>Entreprise et tuteur adaptés :</b> {syn.equipe.entreprises_adaptees}</p>
            <details className="rounded-lg border border-line p-3">
              <summary className="cursor-pointer text-sm font-semibold text-accent">Voir ce que l&apos;étudiant voit (son bilan)</summary>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <p>{syn.etudiant.message}</p>
                <p><b>Ses atouts :</b> {syn.etudiant.points_forts.join(" · ")}</p>
                <p><b>Pour progresser :</b> {syn.etudiant.axes_progres.join(" · ")}</p>
                <p><b>Postes :</b> {syn.etudiant.postes_adaptes.join(" · ")}</p>
                <p><b>Conseils :</b> {syn.etudiant.conseils.join(" · ")}</p>
              </div>
            </details>
          </div>
        )}
      </Bloc>

      <Bloc titre="Entretiens avec l'école" action={<Link className="btn btn-primary btn-sm" href={`${baseFiche}/entretien/nouveau`}>Nouvel entretien</Link>}>
        {!entretiens.length && <p className="text-sm text-muted">Aucun entretien enregistré. Clique sur « Nouvel entretien » pendant ou après ton rendez-vous avec l&apos;étudiant.</p>}
        <ul className="flex flex-col gap-2">
          {entretiens.map((e) => (
            <li key={e.id}>
              <Link href={`${baseFiche}/entretien/${e.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3 text-sm hover:border-accent">
                <span className="flex flex-col">
                  <b>{dateFr(e.date_entretien)}{e.conseiller ? ` · ${e.conseiller}` : ""}</b>
                  {e.prochaine_etape && <span className="text-muted">Prochaine étape : {e.prochaine_etape.slice(0, 120)}</span>}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {e.bilan && <span className={`chip ${e.bilan === "autonome" ? "chip-plus" : e.bilan === "renforce" ? "chip-minus" : "chip-tag"}`}>{BILANS.find((b) => b.id === e.bilan)?.label.split(" :")[0]}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Bloc>

      <Bloc titre="Test DISC" action={<span className="flex flex-wrap items-center gap-2">{tests.disc && boutonAutoriser("disc")}<Link className="btn btn-sm" href={`${baseFiche}/test/disc`}>{tests.disc ? "Le refaire passer" : "Faire passer le test"}</Link></span>}>
        {tests.disc ? <ResultatDisc r={tests.disc} tutoie={false} /> : <p className="text-sm text-muted">Pas encore passé. L&apos;étudiant peut le faire dans son espace (« Mes tests »), ou tu peux le lui faire passer pendant un entretien.</p>}
      </Bloc>

      <Bloc titre="Style de management" action={<span className="flex flex-wrap items-center gap-2">{tests.management && boutonAutoriser("management")}<Link className="btn btn-sm" href={`${baseFiche}/test/management`}>{tests.management ? "Le refaire passer" : "Faire passer le test"}</Link></span>}>
        {tests.management ? <ResultatManagement r={tests.management} tutoie={false} /> : <p className="text-sm text-muted">Pas encore passé.</p>}
      </Bloc>
        </>
      )}
    </div>
  );
}

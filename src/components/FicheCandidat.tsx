import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chips, Score } from "@/components/Score";
import { SelectAuto } from "@/components/SelectAuto";
import { Carte, type PointOffre } from "@/components/Carte";
import { BILANS } from "@/lib/entretien-conseil";
import {
  AVIS, SCORE_ORANGE, SEUIL, SUIVIS, contratLabel, estOffreEquipe, sourceLabel,
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
export async function FicheCandidat({ candidatId, cheminCV, retour, changerSuivi, baseFiche }: {
  candidatId: string;
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

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Fiche candidat</span>
          <h1 className="text-3xl font-extrabold">{c.nom || c.email}</h1>
          <p className="text-muted">{[c.formation, c.poste_vise && `vise ${c.poste_vise}`].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!c.consentement && <span className="chip chip-minus">Accord RGPD manquant</span>}
          {c.cv_chemin && <a className="btn btn-primary" href={cheminCV} target="_blank">Ouvrir le CV (PDF)</a>}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map(([l, v]) => (
          <div key={l} className="card flex flex-col p-4"><span className="eyebrow">{l}</span><b className="font-mono text-2xl tabular-nums">{v}</b></div>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Bloc titre="Profil">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
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

        <Bloc titre="CV" action={c.cv_chemin ? <a className="btn btn-sm" href={cheminCV} target="_blank">Ouvrir le PDF</a> : undefined}>
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
              <span className="eyebrow">Description proposée par Jobaprox</span>
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
      </div>

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
                  <span className="chip">{e.partage ? "Partagé avec l'étudiant" : "Privé"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
            <span className="eyebrow">Pistes proposées par Jobaprox</span>
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
    </div>
  );
}

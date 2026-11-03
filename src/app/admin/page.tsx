import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { franceTravailConfigure } from "@/lib/france-travail";
import { iaConfiguree } from "@/lib/ia";
import { adzunaConfigure } from "@/lib/adzuna";
import { Chips, Score } from "@/components/Score";
import { SelectAuto } from "@/components/SelectAuto";
import { MessageEnvoyable } from "@/components/MessageEnvoyable";
import { ListeRelances } from "@/components/ListeRelances";
import { relancesDe } from "@/lib/echanges";
import { moyenEnvoi } from "@/lib/email";
import { messageEntreprise, messageEtudiant } from "@/lib/messages";
import { ajouterResponsable, changerFrequence, changerSuivi, creerEcole, envoyerMessageAdmin, relancerTout, retirerResponsable } from "./actions";
import { FREQUENCES, lireFrequence } from "@/lib/reglages";
import { AVIS, SEUIL, SOURCES_AUTO, SUIVIS, estOffreEquipe, contratLabel, sourceLabel, type Candidat, type Offre, type Correspondance } from "@/lib/types";

export const metadata = { title: "Admin · MagnusMatch" };
export const maxDuration = 300;

const VUES = [
  { id: "correspondances", label: "Correspondances" },
  { id: "candidats", label: "Candidats" },
  { id: "offres", label: "Offres" },
  { id: "entretiens", label: "Entretiens" },
  { id: "relances", label: "Relances" },
  { id: "ecoles", label: "Écoles" },
  { id: "reglages", label: "Réglages" },
] as const;

export default async function Admin({ searchParams }: { searchParams: Promise<{ vue?: string; ok?: string; relance?: string; erreur?: string; source?: string; tous?: string }> }) {
  const moi = await exigerAdmin();
  const sp = await searchParams;
  const vue = VUES.some((v) => v.id === sp.vue) ? sp.vue! : "correspondances";
  const db = createAdminClient();

  const [{ data: ecolesData, error: ecolesErreur }, { data: respData }, { data: entData, error: entErreur }] = await Promise.all([
    db.from("ecoles").select("id, nom, code").order("nom"),
    db.from("responsables").select("email, nom, ecole_id"),
    db.from("entretiens_conseil").select("id, candidat_id, date_entretien, conseiller, bilan, prochaine_etape, partage").order("date_entretien", { ascending: false }),
  ]);
  // Dernier entretien de chaque candidat
  const entretiens = (entData ?? []) as { id: string; candidat_id: string; date_entretien: string; conseiller: string; bilan: string; prochaine_etape: string; partage: boolean }[];
  const dernierEntretien = new Map<string, (typeof entretiens)[number]>();
  for (const e of entretiens) if (!dernierEntretien.has(e.candidat_id)) dernierEntretien.set(e.candidat_id, e);
  const ecoles = (ecolesData ?? []) as { id: string; nom: string; code: string }[];
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
  const voirToutes = sp.source === "toutes";
  // À traiter d'abord, puis les meilleures notes
  const lignes = (voirToutes ? toutes : equipe).sort(
    (a, b) => Number(b.suivi === "a_traiter") - Number(a.suivi === "a_traiter") || b.score - a.score,
  );
  const aTraiter = equipe.filter((m) => m.suivi === "a_traiter").length;
  const interesses = lignes.filter((m) => m.avis_candidat === "interesse" || m.avis_candidat === "postule").length;

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
      {!franceTravailConfigure() && !adzunaConfigure() && (
        <p className="rounded-xl bg-warn-soft p-4 text-sm">
          Aucune source d&apos;offres automatique n&apos;est branchée : ajoute les identifiants France Travail et/ou Adzuna dans Vercel (voir le guide). En attendant, seules tes offres sont proposées.
        </p>
      )}
      {sp.ok && vue !== "reglages" && vue !== "ecoles" && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Offre enregistrée. Elle est comparée aux candidats en arrière-plan.</p>}
      {sp.relance && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Recherche relancée pour tous les candidats. Les résultats arrivent dans quelques minutes.</p>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Candidats", C.size],
          [`Duos ≥ ${SEUIL} % sur vos offres`, equipe.length],
          ["À traiter", aTraiter],
          ["Candidats intéressés", interesses],
        ].map(([l, v]) => (
          <div key={l} className="card flex flex-col p-4">
            <span className="eyebrow">{l}</span>
            <b className="font-mono text-2xl tabular-nums">{v}</b>
          </div>
        ))}
      </section>

      <nav className="flex gap-1 overflow-x-auto border-b border-line">
        {VUES.map((v) => (
          <Link key={v.id} href={`/admin?vue=${v.id}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${vue === v.id ? "border-accent text-ink" : "border-transparent text-muted"}`}>
            {v.label}
          </Link>
        ))}
      </nav>

      {vue === "correspondances" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="max-w-[70ch] text-muted">
              Les candidats ne voient pas les offres de l&apos;équipe : c&apos;est toi qui fais le lien. Ouvre « Préparer les messages » pour écrire à l&apos;étudiant et à l&apos;entreprise{moyenEnvoi() ? ", et envoie-les directement d'ici" : ""}.
            </p>
            <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Offres affichées">
              <Link href="/admin" aria-current={!voirToutes} className={`rounded-md px-3 py-1 font-semibold ${!voirToutes ? "bg-accent text-accent-ink" : "text-muted"}`}>Vos offres ({equipe.length})</Link>
              <Link href="/admin?source=toutes" aria-current={voirToutes} className={`rounded-md px-3 py-1 font-semibold ${voirToutes ? "bg-accent text-accent-ink" : "text-muted"}`}>Toutes les sources ({toutes.length})</Link>
            </div>
          </div>
          {!lignes.length && (
            <p className="card border-dashed p-6 text-sm text-muted">
              Aucune correspondance à {SEUIL} % ou plus {voirToutes ? "" : "sur vos offres "}pour l&apos;instant. Ajoute les offres de tes entreprises partenaires : elles sont comparées à tous les candidats.
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

      {vue === "candidats" && (
        <div className="flex flex-col gap-3">
          <form action={relancerTout} className="flex justify-end">
            <button className="btn btn-sm">Relancer la recherche pour tous</button>
          </form>
          <div className="grid gap-3 md:grid-cols-2">
            {[...C.values()].map((c) => {
              // Toutes les sources (France Travail, Adzuna et vos offres), quel que soit le filtre des correspondances
              const n = toutes.filter((m) => m.candidat_id === c.user_id).length;
              const nEquipe = equipe.filter((m) => m.candidat_id === c.user_id).length;
              return (
                <article key={c.user_id} className="card flex flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold"><Link href={`/admin/candidats/${c.user_id}`} className="hover:text-accent hover:underline">{c.nom || c.email}</Link></h2>
                      <p className="text-sm text-muted">{c.formation || "Formation non précisée"}</p>
                    </div>
                    <span className="flex flex-col items-end text-right font-mono text-sm">
                      <span>{n} offre{n > 1 ? "s" : ""} ≥ {SEUIL} %</span>
                      {nEquipe > 0 && <span className="text-xs text-accent">dont {nEquipe} sur vos offres</span>}
                    </span>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted">Vise</dt><dd>{c.poste_vise}</dd>
                    <dt className="text-muted">Contrats</dt><dd>{c.contrats.map(contratLabel).join(", ")}</dd>
                    <dt className="text-muted">Secteur</dt><dd>{c.ville} {c.code_postal} · {c.mobilite_km} km</dd>
                    <dt className="text-muted">Contact</dt><dd className="break-all">{c.email}{c.telephone && ` · ${c.telephone}`}</dd>
                  </dl>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-sm">
                    {c.cv_chemin ? <a className="font-semibold text-accent" href={`/admin/cv/${c.user_id}`} target="_blank">Ouvrir le CV</a> : <span className="text-muted">Pas de CV</span>}
                    <span className="flex flex-wrap gap-2">
                      <Link className="btn btn-sm" href={`/admin/candidats/${c.user_id}/entretien/nouveau`}>Entretien</Link>
                      <Link className="btn btn-sm" href={`/admin/candidats/${c.user_id}`}>Voir la fiche complète →</Link>
                    </span>
                    {!c.consentement && <span className="chip chip-minus">Accord RGPD manquant</span>}
                  </div>
                </article>
              );
            })}
            {!C.size && <p className="card border-dashed p-6 text-sm text-muted">Aucun candidat inscrit. Envoie le lien d&apos;inscription à tes étudiants.</p>}
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

      {vue === "offres" && (
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
                  {!o.ouverte && <span className="chip chip-minus">Fermée</span>}
                </div>
              </div>
              <p className="text-sm">{[o.contrat_libelle || contratLabel(o.contrat), o.lieu].filter(Boolean).join(" · ")}</p>
              <div className="flex justify-end border-t border-line pt-2">
                <Link className="btn btn-sm btn-ghost" href={`/admin/offres/${o.id}`}>Modifier</Link>
              </div>
            </article>
          ))}
          {!offres?.length && <p className="card border-dashed p-6 text-sm text-muted">Aucune offre ajoutée par l&apos;équipe. Les offres France Travail sont cherchées automatiquement pour chaque candidat.</p>}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import { OngletsCartes } from "@/components/OngletsCartes";
import { exigerResponsable } from "@/lib/ecoles";
import { createAdminClient } from "@/lib/supabase/admin";
import { Chips, Score } from "@/components/Score";
import { SelectAuto } from "@/components/SelectAuto";
import { Copier } from "@/components/Copier";
import { MessageEnvoyable } from "@/components/MessageEnvoyable";
import { ListeRelances } from "@/components/ListeRelances";
import { maintenantMs, relancesDe } from "@/lib/echanges";
import { BriefingSemaine } from "@/components/BriefingSemaine";
import { briefingEtudiants } from "@/lib/briefing";
import { moyenEnvoi } from "@/lib/email";
import { messageEntreprise, messageEtudiant } from "@/lib/messages";
import { changerSuiviEcole, envoyerMessageEcole, relancerEcole } from "./actions";
import { AVIS, SEUIL, SUIVIS, contratLabel, sourceLabel, type Candidat, type Correspondance, type Offre } from "@/lib/types";
import { toutLire } from "@/lib/tout-lire";

export const metadata = { title: "Espace École · MagnusMatch" };
export const maxDuration = 300;

const VUES = [
  { id: "correspondances", label: "Correspondances", icone: "🤝", sous: "Étudiants × offres" },
  { id: "etudiants", label: "Étudiants", icone: "👥", sous: "" },
  { id: "entreprises", label: "Entreprises & offres", icone: "💼", sous: "Mes offres" },
  { id: "briefing", label: "Briefing", icone: "📋", sous: "Cette semaine" },
  { id: "relances", label: "Mes relances", icone: "🔔", sous: "À rappeler" },
  { id: "inviter", label: "Inviter", icone: "✉️", sous: "Lien et code" },
] as const;

export default async function EspaceEcole({ searchParams }: { searchParams: Promise<{ vue?: string; ok?: string; relance?: string; tout?: string; source?: string }> }) {
  const { ecole, user } = await exigerResponsable();
  const sp = await searchParams;
  const vue = VUES.some((v) => v.id === sp.vue) ? sp.vue! : "correspondances";
  const db = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const lien = `${site}/inscription?ecole=${ecole.code}`;

  const [{ data: cData }, { data: oEcole }] = await Promise.all([
    toutLire<Candidat>((de, a) => db.from("candidats").select("*").eq("ecole_id", ecole.id).order("nom").order("user_id").range(de, a)),
    db.from("offres").select("*").eq("ecole_id", ecole.id).order("created_at", { ascending: false }),
  ]);
  const etudiants = (cData ?? []) as Candidat[];
  const C = new Map(etudiants.map((c) => [c.user_id, c]));
  const ids = [...C.keys()];
  const { data: mData } = ids.length
    ? await db.from("correspondances").select("*").in("candidat_id", ids).gte("score", sp.tout ? 0 : SEUIL).order("score", { ascending: false }).limit(800)
    : { data: [] };
  const matchs = (mData ?? []) as Correspondance[];
  const idsOffres = [...new Set(matchs.map((m) => m.offre_id))];
  const { data: offresData } = idsOffres.length ? await db.from("offres").select("*").in("id", idsOffres) : { data: [] };
  const O = new Map(((offresData ?? []) as Offre[]).map((o) => [o.id, o]));
  const interesse = (m: Correspondance) => m.avis_candidat === "interesse" || m.avis_candidat === "postule";
  const voirToutes = sp.source === "toutes";
  const lignes = matchs
    .filter((m) => O.get(m.offre_id)?.ouverte && m.avis_candidat !== "pas_interesse")
    .filter((m) => voirToutes || O.get(m.offre_id)!.ecole_id === ecole.id) // par défaut : les offres de l'école
    .sort((a, b) => Number(b.suivi === "a_traiter") - Number(a.suivi === "a_traiter") || Number(interesse(b)) - Number(interesse(a)) || b.score - a.score);
  const aTraiter = lignes.filter((m) => m.suivi === "a_traiter" && m.score >= SEUIL).length;
  const nbInteresses = lignes.filter(interesse).length;
  const embauches = matchs.filter((m) => m.suivi === "embauche").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Espace École</span>
          <h1 className="text-3xl font-extrabold">{ecole.nom}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn" href="/ecole/annonce">Coller une annonce</Link>
          <Link className="btn btn-primary" href="/ecole/offres/nouvelle">Ajouter une offre</Link>
        </div>
      </div>

      {sp.ok && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Offre enregistrée : elle est comparée à tes étudiants en arrière-plan.</p>}
      {sp.relance && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Recherche relancée pour tes étudiants. Les résultats arrivent dans quelques minutes.</p>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["Étudiants inscrits", etudiants.length], [`Duos ≥ ${SEUIL} % à traiter`, aTraiter], ["Étudiants intéressés", nbInteresses], ["Embauches", embauches]] as const).map(([l, v]) => (
          <div key={l} className="card flex flex-col p-4">
            <span className="eyebrow">{l}</span>
            <b className="font-mono text-2xl tabular-nums">{v}</b>
          </div>
        ))}
      </section>

      <OngletsCartes label="Espace école" onglets={VUES.map((v) => ({
        href: `/ecole?vue=${v.id}`, icone: v.icone, label: v.label,
        sous: v.id === "etudiants" ? `${etudiants.length} inscrit${etudiants.length > 1 ? "s" : ""}` : v.sous,
        actif: vue === v.id,
      }))} />

      {vue === "correspondances" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="max-w-[60ch] text-muted">Tes étudiants ne voient pas les offres de l&apos;école : c&apos;est toi qui fais le lien. Ouvre « Préparer les messages » pour les contacter.</p>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Offres affichées">
                <Link href="/ecole" aria-current={!voirToutes} className={`rounded-md px-3 py-1 font-semibold ${!voirToutes ? "bg-accent text-accent-ink" : "text-muted"}`}>Offres de l&apos;école</Link>
                <Link href="/ecole?source=toutes" aria-current={voirToutes} className={`rounded-md px-3 py-1 font-semibold ${voirToutes ? "bg-accent text-accent-ink" : "text-muted"}`}>Toutes les sources</Link>
              </div>
              <Link href={`/ecole?${voirToutes ? "source=toutes&" : ""}${sp.tout ? "" : "tout=1"}`} className="btn btn-sm">{sp.tout ? `Seulement ≥ ${SEUIL} %` : "Aussi sous le seuil"}</Link>
            </div>
          </div>
          {!lignes.length && (
            <div className="card border-dashed p-6 text-sm text-muted">
              {etudiants.length
                ? "Pas encore de correspondance. Ajoute les offres de tes entreprises partenaires : elles seront comparées à tes étudiants."
                : "Aucun étudiant inscrit pour l'instant. Envoie-leur ton lien d'inscription (onglet « Inviter mes étudiants »)."}
            </div>
          )}
          {lignes.map((m) => {
            const c = C.get(m.candidat_id)!, o = O.get(m.offre_id)!;
            const mEtu = messageEtudiant(c, o, m, ecole.nom), mEnt = messageEntreprise(c, o, m, ecole.nom);
            const partenaire = o.ecole_id === ecole.id;
            return (
              <article key={m.candidat_id + m.offre_id} className={`card flex flex-col gap-4 p-5 ${m.score < SEUIL ? "opacity-80" : ""}`}>
                <div className="grid gap-4 md:grid-cols-[5rem_1fr_14rem]">
                  <Score score={m.score} seuil={SEUIL} />
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <h2 className="text-lg font-semibold"><Link href={`/ecole/etudiants/${c.user_id}`} className="hover:text-accent hover:underline">{c.nom || c.email}</Link> <span className="text-muted">→</span> {o.entreprise || "Entreprise"}</h2>
                    <p className="text-sm text-muted">{[o.intitule, o.lieu, o.contrat_libelle || contratLabel(o.contrat)].filter(Boolean).join(" · ")}</p>
                    <p className="text-sm">{m.resume}</p>
                    <Chips forts={m.forts} manques={m.manques} />
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span className={`chip ${partenaire ? "chip-tag" : ""}`}>{partenaire ? "Votre partenaire" : sourceLabel(o.source)}</span>
                      {!c.consentement && <span className="chip chip-minus">Accord RGPD manquant</span>}
                      {o.lien && <a className="font-semibold text-accent" href={o.lien} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce</a>}
                      {c.cv_chemin && <a className="font-semibold text-accent" href={`/ecole/cv/${c.user_id}`} target="_blank">CV de l&apos;étudiant</a>}
                      <a className="font-semibold text-accent" href={`/entretien/${c.user_id}/${o.id}`}>{m.preparation_le ? "Fiche entretien ✓" : "Fiche entretien"}</a>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="eyebrow">Avis de l&apos;étudiant</span>
                    <span className={`chip w-fit ${interesse(m) ? "chip-plus" : ""}`}>{AVIS.find((a) => a.id === m.avis_candidat)?.label}</span>
                    <span className="eyebrow mt-1">Suivi</span>
                    <form action={changerSuiviEcole}>
                      <input type="hidden" name="candidat_id" value={m.candidat_id} />
                      <input type="hidden" name="offre_id" value={m.offre_id} />
                      <SelectAuto name="suivi" label="Suivi" defaultValue={m.suivi} options={SUIVIS} />
                    </form>
                  </div>
                </div>
                <details className="rounded-lg border border-line p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-accent">Préparer les messages</summary>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <MessageEnvoyable
                      titre="Message étudiant" cible="etudiant" candidatId={c.user_id} offreId={o.id}
                      email={c.email} autresCoordonnees={c.telephone ? `Téléphone : ${c.telephone}` : ""}
                      objet={mEtu.objet} texte={mEtu.texte} action={envoyerMessageEcole} envoiPossible={Boolean(moyenEnvoi())}
                    />
                    <MessageEnvoyable
                      titre="Message entreprise" cible="entreprise" candidatId={c.user_id} offreId={o.id}
                      email={o.contact_email}
                      autresCoordonnees={[o.contact_nom, o.contact_tel && `Téléphone : ${o.contact_tel}`, !o.contact_email && o.lien && "Pas d'email : postuler via le lien de l'annonce"].filter(Boolean).join(" · ")}
                      objet={mEnt.objet} texte={mEnt.texte} action={envoyerMessageEcole} envoiPossible={Boolean(moyenEnvoi())}
                    />
                  </div>
                  {!c.consentement && <p className="mt-3 rounded-lg bg-warn-soft p-2 text-sm">L&apos;étudiant n&apos;a pas coché l&apos;accord RGPD : demande-lui avant de transmettre son profil.</p>}
                </details>
              </article>
            );
          })}
        </div>
      )}

      {vue === "etudiants" && (
        <div className="flex flex-col gap-3">
          <form action={relancerEcole} className="flex justify-end">
            <button className="btn btn-sm">Relancer la recherche pour mes étudiants</button>
          </form>
          <div className="grid gap-3 md:grid-cols-2">
            {etudiants.map((c) => {
              const n = matchs.filter((m) => m.candidat_id === c.user_id && m.score >= SEUIL).length;
              return (
                <article key={c.user_id} className="card flex flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-lg font-semibold"><Link href={`/ecole/etudiants/${c.user_id}`} className="hover:text-accent hover:underline">{c.nom || c.email}</Link></h2>
                      <p className="text-sm text-muted">{c.formation || "Formation non précisée"}</p>
                    </div>
                    <span className="font-mono text-sm">{n} offre{n > 1 ? "s" : ""} ≥ {SEUIL} %</span>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-muted">Vise</dt><dd>{c.poste_vise || "—"}</dd>
                    <dt className="text-muted">Contrats</dt><dd>{c.contrats.map(contratLabel).join(", ") || "—"}</dd>
                    <dt className="text-muted">Secteur</dt><dd>{[c.ville, c.code_postal].filter(Boolean).join(" ") || "—"} · {c.mobilite_km} km</dd>
                    <dt className="text-muted">Contact</dt><dd className="break-all">{c.email}{c.telephone && ` · ${c.telephone}`}</dd>
                    {c.cv_conseils && <><dt className="text-muted">CV</dt><dd>{c.cv_conseils.note}/10 selon MagnusMatch</dd></>}
                  </dl>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-sm">
                    {c.cv_chemin ? <a className="font-semibold text-accent" href={`/ecole/cv/${c.user_id}`} target="_blank">Ouvrir le CV</a> : <span className="text-muted">Pas de CV</span>}
                    <Link className="btn btn-sm" href={`/ecole/etudiants/${c.user_id}`}>Voir la fiche complète →</Link>
                    {!c.consentement && <span className="chip chip-minus">Accord RGPD manquant</span>}
                  </div>
                </article>
              );
            })}
          </div>
          {!etudiants.length && <p className="card border-dashed p-6 text-sm text-muted">Aucun étudiant inscrit. Envoie-leur ton lien d&apos;inscription (onglet « Inviter mes étudiants »).</p>}
        </div>
      )}

      {vue === "entreprises" && (
        <div className="grid gap-3 md:grid-cols-2">
          {((oEcole ?? []) as Offre[]).map((o) => {
            const nb = matchs.filter((m) => m.offre_id === o.id && m.score >= SEUIL).length;
            return (
              <article key={o.id} className="card flex flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-semibold">{o.entreprise}</h2>
                    <p className="text-sm text-muted">{o.intitule}</p>
                  </div>
                  {!o.ouverte && <span className="chip chip-minus">Fermée</span>}
                </div>
                <p className="text-sm">{[o.contrat_libelle || contratLabel(o.contrat), o.lieu].filter(Boolean).join(" · ")}</p>
                <p className="text-sm text-muted">{o.contact_nom || o.contact_email || o.contact_tel ? `Contact : ${[o.contact_nom, o.contact_email, o.contact_tel].filter(Boolean).join(" · ")}` : "Pas de contact renseigné"}</p>
                <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
                  <span className="font-mono">{nb} étudiant{nb > 1 ? "s" : ""} ≥ {SEUIL} %</span>
                  <Link className="btn btn-sm btn-ghost" href={`/ecole/offres/${o.id}`}>Modifier</Link>
                </div>
              </article>
            );
          })}
          {!oEcole?.length && (
            <p className="card border-dashed p-6 text-sm text-muted md:col-span-2">
              Ajoute les besoins de tes entreprises partenaires : chaque offre est comparée à tes étudiants, et seuls eux la voient.
            </p>
          )}
        </div>
      )}

      {vue === "briefing" && (
        <BriefingSemaine base="/ecole/etudiants" lignes={await briefingEtudiants(etudiants, maintenantMs())} />
      )}

      {vue === "relances" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">Les relances que tu as prévues sur les fiches de tes étudiants. La cloche 🔔 en haut à droite te prévient à l&apos;heure prévue.</p>
          <ListeRelances relances={(await relancesDe(user.email ?? "")).filter((r) => !!r.candidat_id && C.has(r.candidat_id))} base="/ecole/etudiants" />
        </div>
      )}

      {vue === "inviter" && (
        <section className="card flex max-w-2xl flex-col gap-4 p-5">
          <h2 className="text-lg font-semibold">Inviter mes étudiants</h2>
          <p className="text-sm text-muted">Envoie ce lien à tes étudiants. En s&apos;inscrivant avec, ils sont automatiquement rattachés à {ecole.nom}.</p>
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Lien d&apos;inscription</span>
            <code className="select-all break-all rounded-lg border border-line bg-bg p-3 font-mono text-sm">{lien}</code>
            <div><Copier texte={lien} /></div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Ou le code école, à saisir dans « Mon profil »</span>
            <code className="w-fit select-all rounded-lg border border-line bg-bg px-3 py-2 font-mono text-lg font-bold tracking-wider">{ecole.code}</code>
          </div>
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Message à envoyer</span>
            {(() => {
              const msg = `Bonjour à tous,\n\nPour vous aider dans votre recherche d'alternance ou d'emploi, inscrivez-vous sur MagnusMatch avec ce lien :\n${lien}\n\nDéposez votre CV et décrivez votre projet : vous recevrez les offres qui vous correspondent (celles de nos entreprises partenaires et de France Travail), et des conseils pour améliorer votre CV.\n\nÀ bientôt,\n${ecole.nom}`;
              return (
                <>
                  <pre className="whitespace-pre-wrap rounded-lg border border-line bg-bg p-3 font-sans text-sm">{msg}</pre>
                  <div><Copier texte={msg} /></div>
                </>
              );
            })()}
          </div>
        </section>
      )}
    </div>
  );
}

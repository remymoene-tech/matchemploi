import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORIGINES_ENTREPRISE, STATUTS_ENTREPRISE, entrepriseParId, offresDe, statutEntreprise, type Entreprise } from "@/lib/entreprises";
import { echangesDeLEntreprise, echeance, maintenantMs } from "@/lib/echanges";
import { OngletsCartes } from "@/components/OngletsCartes";
import { Copier } from "@/components/Copier";
import { QuestionnaireAttentes } from "@/components/QuestionnaireAttentes";
import { texteExpiration } from "@/lib/expiration";
import { FormEchange } from "@/components/FormEchange";
import { JournalEchanges } from "@/components/JournalEchanges";
import { chercherCandidatsEntreprise, envoyerFicheBesoin, actionFaiteEntreprise, ajouterEchangeEntreprise, enregistrerEntreprise, supprimerEchangeEntreprise, supprimerEntreprise } from "../../actions";
import { SCORE_VERT, SOURCES_AUTO, SUIVIS, contratLabel, diplomeLabel, type Offre } from "@/lib/types";
import { Chips, Score } from "@/components/Score";
import { Rafraichir } from "@/components/Rafraichir";
import { RECRUTE, echangesDeProspections, prospectionsDeLEntreprise } from "@/lib/prospections";
import { HistoriqueProspection } from "@/components/HistoriqueProspection";

export const metadata = { title: "Entreprise · MagnusMatch" };

export default async function FicheEntreprise({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string; ok?: string; erreur?: string; besoins?: string; besoin?: string; recherche?: string }>;
}) {
  await exigerAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const nouvelle = id === "nouvelle";
  const e = nouvelle ? null : await entrepriseParId(id);
  if (!nouvelle && !e) notFound();
  const onglet = nouvelle ? "infos" : sp.onglet === "etudiants" ? "echanges" : sp.onglet === "offres" || sp.onglet === "echanges" || sp.onglet === "candidats" ? sp.onglet : "infos";
  const base = `/admin/entreprises/${id}`;

  const db = createAdminClient();
  const { data: oData } = nouvelle ? { data: [] } : await db.from("offres").select("*").not("source", "in", `(${SOURCES_AUTO.join(",")})`);
  const offres = e ? offresDe(e, (oData ?? []) as Offre[]) : [];
  const ids = offres.map((o) => o.id);
  const { data: mData } = ids.length ? await db.from("correspondances").select("candidat_id, offre_id, suivi, score, forts, manques, resume, calcule_le, candidats(nom, email, formation, annee_cursus, rythme_cursus, diplome_annee, ville)").in("offre_id", ids) : { data: [] };
  const matchs = (mData ?? []) as unknown as {
    candidat_id: string; offre_id: string; suivi: string; score: number; forts: string[]; manques: string[]; resume: string; calcule_le: string;
    candidats: (Parameters<typeof diplomeLabel>[0] & { nom: string; email: string; ville: string }) | null;
  }[];
  const echanges = e ? await echangesDeLEntreprise(e.id) : [];
  const maintenant = maintenantMs();
  const rappels = echanges.filter((x) => x.action && !x.action_faite).sort((a, b) => (echeance(a)?.getTime() ?? 9e15) - (echeance(b)?.getTime() ?? 9e15));
  const statut = statutEntreprise(e?.statut ?? "rencontree");
  // Les candidats à 70 % et plus proposés par MagnusMatch sur les offres de cette entreprise (le meilleur score par étudiant)
  const meilleurs = new Map<string, (typeof matchs)[number]>();
  for (const m of matchs) if (m.score >= SCORE_VERT && (!meilleurs.has(m.candidat_id) || meilleurs.get(m.candidat_id)!.score < m.score)) meilleurs.set(m.candidat_id, m);
  const candidatsProposes = [...meilleurs.values()].sort((a, b) => b.score - a.score);
  // Prospections des étudiants pour cette entreprise : leurs contacts et relances
  const prospEtudiants = e ? await prospectionsDeLEntreprise(e).catch(() => []) : [];
  const echProsp = onglet === "echanges" ? await echangesDeProspections(prospEtudiants.map((p) => p.id)) : [];
  // L'onglet « Candidats » apparaît dès que l'entreprise recrute
  const recrute = !!e && (prospEtudiants.some((p) => p.recrute === "oui") || offres.some((o) => o.ouverte) || e.statut === "partenaire" || e.statut === "en_discussion" || !!e.attentes);

  const champ = (nom: keyof Entreprise, label: string, placeholder = "", type = "text") => (
    <div className="flex flex-col gap-1">
      <label className="label" htmlFor={nom}>{label}</label>
      <input className="input" id={nom} name={nom} type={type} defaultValue={(e?.[nom] as string) ?? ""} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link href="/admin?vue=entreprises" className="text-sm text-muted">← Mes entreprises</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">🏢 Fiche entreprise</span>
          <h1 className="text-3xl font-extrabold">{e?.nom ?? "Nouvelle entreprise"}</h1>
          {e && <p className="text-muted">{[e.secteur, e.ville].filter(Boolean).join(" · ") || "Secteur et ville à compléter"}</p>}
          {e && (() => {
            const premier = [...prospEtudiants].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
            return premier ? (
              <Link href={`/admin/candidats/${premier.candidat_id}?onglet=prospections`} className="mt-1 w-fit rounded-lg bg-accent-soft px-3 py-1.5 text-sm hover:underline">
                🎓 Trouvée par <b>{premier.candidats?.nom || premier.candidats?.email || "un étudiant"}</b> le {new Date(premier.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}
                {premier.recrute === "oui" ? " · ✅ recrute" : ""}
              </Link>
            ) : e.auteur ? <p className="text-xs text-muted">Ajoutée par l&apos;équipe ({e.auteur})</p> : null;
          })()}
        </div>
        {e && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`chip ${statut.chip}`}>{statut.label}</span>
            {!e.attentes && <Link href={`${base}?besoins=1#besoins`} className="chip chip-minus">📋 Fiche besoin à remplir</Link>}
            <Link href={`/admin/offres/nouvelle?entreprise=${e.id}`} className="btn btn-primary">➕ Ajouter une offre</Link>
          </div>
        )}
      </header>

      {e && rappels.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          {rappels.slice(0, 3).map((r) => {
            const d = echeance(r);
            return (
              <Link key={r.id} href={`${base}?onglet=echanges`} className={`chip ${d && d.getTime() <= maintenant ? "chip-minus" : "chip-tag"}`}>
                ⏰ {r.action}{d ? ` · ${d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` : ""}
              </Link>
            );
          })}
        </div>
      )}

      {sp.ok && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Enregistré ✓</p>}
      {sp.erreur === "nom" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Indique au moins le nom de l&apos;entreprise.</p>}
      {sp.erreur === "base" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">L&apos;enregistrement a échoué : exécute la mise à jour SQL de la page /diagnostic (« Mes entreprises »).</p>}

      {e && (
        <OngletsCartes label="Onglets de la fiche entreprise" onglets={[
          { href: base, icone: "🪪", label: "Infos", sous: "Contact et suivi", actif: onglet === "infos" },
          { href: `${base}?onglet=offres`, icone: "💼", label: "Offres", sous: `${offres.length} offre${offres.length > 1 ? "s" : ""}`, actif: onglet === "offres" },
          ...(recrute ? [{ href: `${base}?onglet=candidats`, icone: "🎯", label: "Candidats", sous: `${candidatsProposes.length} à 70 % et +`, actif: onglet === "candidats" }] : []),
          { href: `${base}?onglet=echanges`, icone: "💬", label: "Échanges", sous: rappels.length ? `${rappels.length} rappel${rappels.length > 1 ? "s" : ""}` : prospEtudiants.length ? `équipe et ${prospEtudiants.length} étudiant${prospEtudiants.length > 1 ? "s" : ""}` : `${echanges.length} noté${echanges.length > 1 ? "s" : ""}`, actif: onglet === "echanges" },
        ]} />
      )}

      {e && onglet === "infos" && (() => {
        const x = e as typeof e & { jeton_besoin?: string | null; besoin_envoye_le?: string | null; besoin_rempli_le?: string | null };
        const lien = x.jeton_besoin ? `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/besoin/${x.jeton_besoin}` : "";
        const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }) : "");
        return (
          <section className="card flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">✉️ Faire remplir la fiche besoin par l&apos;entreprise</h2>
              {x.besoin_rempli_le ? <span className="chip chip-plus">✅ Remplie par l&apos;entreprise le {date(x.besoin_rempli_le)}</span>
                : x.besoin_envoye_le ? <span className="chip chip-tag">✉️ Envoyée le {date(x.besoin_envoye_le)}, en attente</span> : null}
            </div>
            {sp.besoin === "envoye" && <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">Email envoyé à {e.contact_email} ✓ Tu recevras une notification 🔔 quand l&apos;entreprise aura répondu.</p>}
            {sp.besoin === "lien" && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">Lien créé ✓ Copie-le et envoie-le à l&apos;entreprise (email, SMS, WhatsApp…).</p>}
            <p className="text-sm text-muted">L&apos;entreprise reçoit un lien personnel, sans compte ni mot de passe, valable 60 jours. Ses réponses arrivent directement dans la fiche besoin ci-dessous.</p>
            <div className="flex flex-wrap items-center gap-2">
              {e.contact_email && (
                <form action={envoyerFicheBesoin}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="par_email" value="1" />
                  <button className="btn btn-primary">✉️ Envoyer par email à {e.contact_email}</button>
                </form>
              )}
              <form action={envoyerFicheBesoin}>
                <input type="hidden" name="id" value={e.id} />
                <button className="btn">{lien ? "🔄 Créer un nouveau lien" : "🔗 Créer le lien à envoyer moi-même"}</button>
              </form>
            </div>
            {lien && (
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded-lg bg-bg px-3 py-2 font-mono text-xs">{lien}</code>
                <Copier texte={lien} />
              </div>
            )}
          </section>
        );
      })()}

      {onglet === "infos" && (
        <form action={enregistrerEntreprise} className="card flex flex-col gap-5 p-5">
          <input type="hidden" name="id" value={e?.id ?? ""} />
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">🏢 L&apos;entreprise</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="label" htmlFor="nom">Nom <span className="text-bad">*</span></label>
                <input className="input" id="nom" name="nom" required defaultValue={e?.nom ?? ""} placeholder="Agence Provence Immo" />
              </div>
              {champ("secteur", "Secteur", "Immobilier, banque, commerce…")}
              {champ("ville", "Ville", "Salon-de-Provence")}
              {champ("site", "Site internet", "https://…", "url")}
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">👤 Le contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {champ("contact_nom", "Nom", "Mme Durand")}
              {champ("contact_fonction", "Fonction", "Responsable RH")}
              {champ("contact_email", "Email", "rh@entreprise.fr", "email")}
              {champ("contact_tel", "Téléphone", "04 90 00 00 00", "tel")}
            </div>
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">🤝 La rencontre</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="label" htmlFor="statut">Où on en est</label>
                <select className="input" id="statut" name="statut" defaultValue={e?.statut ?? "rencontree"}>
                  {STATUTS_ENTREPRISE.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="label" htmlFor="origine">Rencontrée par</label>
                <select className="input" id="origine" name="origine" defaultValue={e?.origine ?? ""}>
                  <option value="">—</option>
                  {ORIGINES_ENTREPRISE.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
              {champ("rencontre_le", "Date de la rencontre", "", "date")}
            </div>
            <div className="flex flex-col gap-1">
              <label className="label" htmlFor="notes">Notes</label>
              <textarea className="input min-h-28 text-sm" id="notes" name="notes" defaultValue={e?.notes ?? ""} placeholder="Ce qu'ils recherchent, les périodes de recrutement, les métiers…" />
            </div>
          </section>
          <section id="besoins" className="flex scroll-mt-4 flex-col gap-2">
            <h2 className="font-semibold">📋 Fiche besoin</h2>
            {sp.besoins && e && (
              <div className="flex flex-col gap-1 rounded-xl border-2 border-accent bg-accent-soft p-4 text-sm">
                <b>📞 Remplis la fiche besoin avec {e.contact_nom || "l'entreprise"}</b>
                <span>
                  {e.contact_tel ? <>Téléphone : <a className="font-semibold text-accent underline" href={`tel:${e.contact_tel.replace(/\s/g, "")}`}>{e.contact_tel}</a></> : "Pas de téléphone noté"}
                  {e.contact_email ? <> · Email : <a className="font-semibold text-accent underline" href={`mailto:${e.contact_email}`}>{e.contact_email}</a></> : null}
                </span>
                <span className="text-muted">Coche leurs réponses ci-dessous puis clique sur « Enregistrer ». Elles seront reprises dans chaque offre de cette entreprise.</span>
              </div>
            )}
            <QuestionnaireAttentes a={e?.attentes} ouvert={!!sp.besoins} titre="Le questionnaire des besoins de l'entreprise"
              sousTitre="(facultatif : il sera repris automatiquement dans chaque nouvelle offre de cette entreprise)" />
          </section>
          <div className="flex justify-end"><button className="btn btn-primary">{e ? "Enregistrer" : "Ajouter l'entreprise"}</button></div>
        </form>
      )}

      {e && onglet === "offres" && (
        <section className="flex flex-col gap-3">
          {!offres.length && (
            <p className="card border-dashed p-6 text-sm text-muted">Pas encore d&apos;offre pour cette entreprise. Ajoute-en une quand elle recrute : elle sera comparée à tous les candidats.</p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {offres.map((o) => {
              const m = matchs.filter((x) => x.offre_id === o.id);
              return (
                <article key={o.id} className="card flex flex-col gap-2 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">💼 {o.intitule}</h3>
                    {(() => { const x = texteExpiration(o.expire_le, maintenant); return x ? <span className={`chip ${x.chip}`}>{x.texte}</span> : !o.ouverte ? <span className="chip chip-minus">Fermée</span> : null; })()}
                  </div>
                  <p className="text-sm text-muted">{[o.contrat_libelle || contratLabel(o.contrat), o.lieu].filter(Boolean).join(" · ")}</p>
                  <p className="text-sm">👥 {m.filter((x) => x.score >= 75).length} candidat(s) à 75 % ou plus · {m.filter((x) => x.suivi === "embauche").length} embauché(s)</p>
                  <div className="flex justify-end gap-2 border-t border-line pt-2">
                    <Link className="btn btn-sm" href={`/admin?vue=entreprises&sous=candidats#a-traiter`}>Voir les candidats</Link>
                    <Link className="btn btn-sm btn-ghost" href={`/admin/offres/${o.id}`}>Modifier</Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {e && onglet === "candidats" && (
        <section className="card flex flex-col gap-4 p-5">
          {sp.recherche && !candidatsProposes.length && <Rafraichir />}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">🎯 Les candidats que MagnusMatch te propose pour {e.nom}</h2>
              <p className="text-sm text-muted">Les étudiants à {SCORE_VERT} % et plus, notés par MagnusMatch à partir de la fiche besoin, des offres et de leur profil.</p>
            </div>
            <form action={chercherCandidatsEntreprise}>
              <input type="hidden" name="id" value={e.id} />
              <button className="btn btn-primary">🤖 {offres.some((o) => o.ouverte) ? "Relancer la recherche" : "Chercher les candidats"}</button>
            </form>
          </div>
          {sp.recherche && <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">🤖 MagnusMatch compare les profils des étudiants admis… Les résultats apparaissent ici dans 1 à 2 minutes (la page se met à jour toute seule).</p>}
          {!offres.some((o) => o.ouverte) && !sp.recherche && (
            <p className="rounded-lg bg-bg px-3 py-2 text-sm">Pas encore d&apos;offre ouverte pour cette entreprise : « Chercher les candidats » crée un besoin de recrutement à partir de sa fiche besoin et de tes notes, puis MagnusMatch note tous les étudiants admis.</p>
          )}
          {!e.attentes && <p className="text-xs text-muted">💡 Remplis d&apos;abord la <Link href={`${base}?besoins=1#besoins`} className="underline">fiche besoin</Link> : les % seront bien plus justes.</p>}
          {!candidatsProposes.length && offres.some((o) => o.ouverte) && !sp.recherche && <p className="text-sm text-muted">Aucun étudiant à {SCORE_VERT} % ou plus pour l&apos;instant.</p>}
          <ul className="flex flex-col gap-3">
            {candidatsProposes.map((m) => {
              const o = offres.find((x) => x.id === m.offre_id);
              return (
                <li key={m.candidat_id} className="flex flex-wrap items-start gap-4 rounded-xl border border-line p-4">
                  <Score score={m.score} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link href={`/admin/candidats/${m.candidat_id}`} className="font-semibold hover:text-accent hover:underline">👤 {m.candidats?.nom || m.candidats?.email || "Étudiant"}</Link>
                    <p className="text-xs text-muted">{[m.candidats?.formation && `🎓 ${diplomeLabel(m.candidats)}`, m.candidats?.ville, o && `pour « ${o.intitule} »`].filter(Boolean).join(" · ")}</p>
                    {m.resume && <p className="text-sm">{m.resume}</p>}
                    <Chips forts={m.forts ?? []} manques={m.manques ?? []} />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="chip">{SUIVIS.find((x) => x.id === m.suivi)?.label ?? "À traiter"}</span>
                    <Link href={`/admin?vue=entreprises&sous=candidats#a-traiter`} className="btn btn-sm">✉️ Mettre en relation</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {e && onglet === "echanges" && (
        <>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">✍️ Noter un échange</h2>
            <FormEchange candidatId={e.id} champ="entreprise_id" action={ajouterEchangeEntreprise}
              exemple="Ex. Appel avec Mme Durand : 2 postes d'alternance en vente à la rentrée, veut recevoir 3 profils avant fin mai." />
          </section>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">📜 Mes échanges avec l&apos;entreprise ({echanges.length})</h2>
            <p className="text-xs text-muted">Visible uniquement par l&apos;équipe.</p>
            <JournalEchanges echanges={echanges} champ="entreprise_id" cibleId={e.id} actionFaite={actionFaiteEntreprise} supprimer={supprimerEchangeEntreprise} />
          </section>
          {prospEtudiants.length > 0 && (
          <section className="card flex flex-col gap-4 p-5">
            <h2 className="text-lg font-semibold">🎓 Les échanges des étudiants avec {e.nom} ({prospEtudiants.length})</h2>
            <p className="text-xs text-muted">Notés par les étudiants dans « Mes prospections ». Leurs contacts et leurs relances s&apos;ajoutent ici automatiquement.</p>
            {[...prospEtudiants].sort((a, b) => a.created_at.localeCompare(b.created_at)).map((p, i) => {
              const r = RECRUTE.find((x) => x.id === p.recrute);
              return (
                <article key={p.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/candidats/${p.candidat_id}?onglet=prospections`} className="font-semibold hover:text-accent hover:underline">👤 {p.candidats?.nom || p.candidats?.email || "Étudiant"}</Link>
                    <span className="flex flex-wrap gap-2">
                      {i === 0 && <span className="chip chip-plus">🥇 A trouvé l&apos;entreprise</span>}
                      {r && <span className={`chip ${r.chip}`}>{r.icone} {r.label}</span>}
                    </span>
                  </div>
                  {p.justification && <p className="rounded-lg bg-bg p-3 text-sm"><b>Pourquoi :</b> {p.justification}</p>}
                  <p className="text-sm text-muted">{[p.contact_nom && `👤 ${p.contact_nom}`, p.contact_tel && `📞 ${p.contact_tel}`, p.contact_email && `✉️ ${p.contact_email}`].filter(Boolean).join(" · ")}</p>
                  <HistoriqueProspection echanges={echProsp.filter((x) => x.prospection_id === p.id)} prospectionId={p.id} />
                </article>
              );
            })}
          </section>
          )}
        </>
      )}

      {e && onglet === "infos" && (
        <details className="rounded-xl border border-line p-4 text-sm">
          <summary className="cursor-pointer text-muted">Supprimer cette entreprise</summary>
          <form action={supprimerEntreprise} className="mt-3 flex items-center justify-between gap-3">
            <input type="hidden" name="id" value={e.id} />
            <span>Ses échanges seront supprimés. Ses offres restent, sans lien avec l&apos;entreprise.</span>
            <button className="btn btn-sm text-bad">Confirmer</button>
          </form>
        </details>
      )}
    </div>
  );
}

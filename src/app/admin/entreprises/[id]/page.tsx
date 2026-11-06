import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORIGINES_ENTREPRISE, STATUTS_ENTREPRISE, entrepriseParId, offresDe, statutEntreprise, type Entreprise } from "@/lib/entreprises";
import { echangesDeLEntreprise, echeance, maintenantMs } from "@/lib/echanges";
import { OngletsCartes } from "@/components/OngletsCartes";
import { FormEchange } from "@/components/FormEchange";
import { JournalEchanges } from "@/components/JournalEchanges";
import { actionFaiteEntreprise, ajouterEchangeEntreprise, enregistrerEntreprise, supprimerEchangeEntreprise, supprimerEntreprise } from "../../actions";
import { SOURCES_AUTO, contratLabel, type Offre } from "@/lib/types";

export const metadata = { title: "Entreprise · MagnusMatch" };

export default async function FicheEntreprise({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string; ok?: string; erreur?: string }>;
}) {
  await exigerAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const nouvelle = id === "nouvelle";
  const e = nouvelle ? null : await entrepriseParId(id);
  if (!nouvelle && !e) notFound();
  const onglet = nouvelle ? "infos" : sp.onglet === "offres" || sp.onglet === "echanges" ? sp.onglet : "infos";
  const base = `/admin/entreprises/${id}`;

  const db = createAdminClient();
  const { data: oData } = nouvelle ? { data: [] } : await db.from("offres").select("*").not("source", "in", `(${SOURCES_AUTO.join(",")})`);
  const offres = e ? offresDe(e, (oData ?? []) as Offre[]) : [];
  const ids = offres.map((o) => o.id);
  const { data: mData } = ids.length ? await db.from("correspondances").select("offre_id, suivi, score").in("offre_id", ids) : { data: [] };
  const matchs = (mData ?? []) as { offre_id: string; suivi: string; score: number }[];
  const echanges = e ? await echangesDeLEntreprise(e.id) : [];
  const maintenant = maintenantMs();
  const rappels = echanges.filter((x) => x.action && !x.action_faite).sort((a, b) => (echeance(a)?.getTime() ?? 9e15) - (echeance(b)?.getTime() ?? 9e15));
  const statut = statutEntreprise(e?.statut ?? "rencontree");

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
        </div>
        {e && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`chip ${statut.chip}`}>{statut.label}</span>
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
          { href: `${base}?onglet=echanges`, icone: "💬", label: "Échanges", sous: rappels.length ? `${rappels.length} rappel${rappels.length > 1 ? "s" : ""}` : `${echanges.length} noté${echanges.length > 1 ? "s" : ""}`, actif: onglet === "echanges" },
        ]} />
      )}

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
                    {!o.ouverte && <span className="chip chip-minus">Fermée</span>}
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

      {e && onglet === "echanges" && (
        <>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">✍️ Noter un échange</h2>
            <FormEchange candidatId={e.id} champ="entreprise_id" action={ajouterEchangeEntreprise}
              exemple="Ex. Appel avec Mme Durand : 2 postes d'alternance en vente à la rentrée, veut recevoir 3 profils avant fin mai." />
          </section>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">📜 Historique des échanges ({echanges.length})</h2>
            <p className="text-xs text-muted">Visible uniquement par l&apos;équipe.</p>
            <JournalEchanges echanges={echanges} champ="entreprise_id" cibleId={e.id} actionFaite={actionFaiteEntreprise} supprimer={supprimerEchangeEntreprise} />
          </section>
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { RECRUTE, TYPES_PROSPECTION, dateEntretien, echangesDeProspections, prospection } from "@/lib/prospections";
import { FormProspection } from "@/components/FormProspection";
import { FormEchange } from "@/components/FormEchange";
import { HistoriqueProspection } from "@/components/HistoriqueProspection";
import { ajouterEchangeProspection, relanceFaiteProspection, supprimerEchangeProspection, supprimerProspection } from "../actions";

export const metadata = { title: "Entreprise prospectée · MagnusMatch" };

export default async function FicheProspection({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nouveau?: string; modifier?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { user } = await exigerUtilisateur();
  const p = await prospection(id);
  if (!p || p.candidat_id !== user.id) notFound();
  const echanges = await echangesDeProspections([p.id]);
  const r = RECRUTE.find((x) => x.id === p.recrute);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href="/espace/prospections" className="text-sm text-muted">← Mes prospections</Link>
      {sp.nouveau && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Entreprise ajoutée ✓ Note ici chaque nouveau contact avec elle.</p>}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="eyebrow">🚪 Entreprise prospectée</span>
          <h1 className="text-3xl font-extrabold">{p.entreprise}</h1>
          <p className="text-muted">{[p.ville, p.contact_nom, p.contact_tel, p.contact_email].filter(Boolean).join(" · ") || "Coordonnées à compléter"}</p>
        </div>
        {r && <span className={`chip ${r.chip}`}>{r.icone} {r.label}</span>}
      </header>
      {p.entretien_a && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-accent bg-accent-soft p-4">
          <p><b>🤝 Entretien {dateEntretien(p.entretien_a)}</b><br /><span className="text-sm text-muted">Tu recevras une notification 🔔 la veille.</span></p>
          <Link href={`/espace/prospections/${p.id}?modifier=1`} className="btn btn-sm">Changer la date</Link>
        </div>
      )}
      {p.justification && <p className="rounded-xl bg-bg p-4 text-sm"><b>Pourquoi :</b> {p.justification}</p>}

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">✍️ Nouveau contact avec l&apos;entreprise</h2>
        <FormEchange candidatId={p.id} champ="prospection_id" action={ajouterEchangeProspection} types={TYPES_PROSPECTION}
          exemple="Ex. J'ai rappelé la responsable : elle a lu mon CV et me propose un entretien jeudi à 14 h."
          exempleRelance="Ex. Rappeler pour confirmer l'entretien" />
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-semibold">📜 Mon historique avec {p.entreprise} ({echanges.length})</h2>
        <HistoriqueProspection echanges={echanges} prospectionId={p.id} relanceFaite={relanceFaiteProspection} supprimer={supprimerEchangeProspection} />
      </section>

      <details className="card p-5" open={!!sp.modifier}>
        <summary className="cursor-pointer font-semibold">✏️ Modifier les infos (recrute ou pas, contact…)</summary>
        <div className="mt-4"><FormProspection v={p} /></div>
      </details>

      <details className="rounded-xl border border-line p-4 text-sm">
        <summary className="cursor-pointer text-muted">Supprimer cette entreprise</summary>
        <form action={supprimerProspection} className="mt-3 flex items-center justify-between gap-3">
          <input type="hidden" name="id" value={p.id} />
          <span>Son historique sera supprimé.</span>
          <button className="btn btn-sm text-bad">Confirmer</button>
        </form>
      </details>
    </div>
  );
}

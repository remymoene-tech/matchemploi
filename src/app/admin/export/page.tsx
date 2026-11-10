import Link from "next/link";
import { exigerSuperAdmin } from "@/lib/auth";
import { COLONNES, TYPES_EXPORT, libelleClasse, type TypeExport } from "@/lib/export";
import { STATUTS_LEAD } from "@/lib/leads";
import { STATUTS_ENTREPRISE } from "@/lib/entreprises";
import { ADMISSIONS } from "@/lib/admission";
import { SPECIALITES } from "@/lib/intervenants";
import { listeClasses } from "@/lib/classes";
import { formationsDeLEcole } from "@/lib/ecoles";

export const metadata = { title: "Export Excel · MagnusMatch" };

export default async function ExportExcel({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await exigerSuperAdmin();
  const sp = await searchParams;
  const type = (TYPES_EXPORT.some((t) => t.id === sp.type) ? sp.type : "candidats") as TypeExport;
  const classes = (await listeClasses().catch(() => null)) ?? [];
  const formations = (await formationsDeLEcole(null).catch(() => [])).map((f) => f.nom);
  const an = new Date().getFullYear();
  const annees = Array.from({ length: 8 }, (_, i) => an - 5 + i);
  const choix = (nom: string, label: string, options: { id: string; label: string }[]) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      <select className="input" name={nom} defaultValue=""><option value="">Tous</option>{options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select>
    </label>
  );
  const optFormations = formations.map((f) => ({ id: f, label: f }));
  const optAnnees = annees.map((a) => ({ id: String(a), label: String(a) }));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div>
        <Link href="/admin/parametres" className="text-sm text-muted hover:text-ink">← ⚙️ Paramètres</Link>
        <h1 className="text-3xl font-extrabold">📤 Export Excel</h1>
        <p className="text-muted">Choisis quoi exporter, filtre, coche les colonnes : tu télécharges un fichier Excel prêt à trier.</p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Quoi exporter">
        {TYPES_EXPORT.map((t) => (
          <Link key={t.id} href={`/admin/export?type=${t.id}`} aria-current={t.id === type ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${t.id === type ? "border-accent bg-accent-soft" : "border-line bg-surface text-muted hover:text-ink"}`}>{t.label}</Link>
        ))}
      </nav>
      <p className="text-sm text-muted">{TYPES_EXPORT.find((t) => t.id === type)!.aide}</p>

      <form action="/admin/export/fichier" method="get" className="card flex flex-col gap-5 p-6">
        <input type="hidden" name="type" value={type} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">🔎 Filtres</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {type === "leads" && <>{choix("statut", "Où on en est", STATUTS_LEAD.map((s) => ({ id: s.id, label: s.label })))}{choix("formation", "Formation", optFormations)}{choix("rentree", "Rentrée", optAnnees)}</>}
            {type === "candidats" && <>
              {choix("admission", "Admission", ADMISSIONS.filter((a) => a.id !== "intervenant").map((a) => ({ id: a.id, label: `${a.icone} ${a.label}` })))}
              {choix("classe", "Classe", [{ id: "sans", label: "Sans classe" }, ...classes.map((k) => ({ id: k.id, label: libelleClasse(k) }))])}
              {choix("formation", "Formation", optFormations)}
              {choix("rentree", "Rentrée", optAnnees)}
            </>}
            {type === "alumni" && <>{choix("promo", "Promo", optAnnees)}{choix("formation", "Formation", optFormations)}</>}
            {type === "entreprises" && choix("statut", "Statut", STATUTS_ENTREPRISE.map((s) => ({ id: s.id, label: s.label })))}
            {type === "intervenants" && choix("specialite", "Spécialité", SPECIALITES.map((s) => ({ id: s, label: s })))}
          </div>
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-semibold">📋 Colonnes</legend>
          <div className="flex flex-wrap gap-2">
            {COLONNES[type].map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
                <input type="checkbox" name="col" value={c.id} defaultChecked={!!c.parDefaut} className="sr-only" />{c.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">Clique sur une colonne pour l&apos;ajouter ou l&apos;enlever. Les colonnes en vert seront dans le fichier.</p>
        </fieldset>
        <button className="btn btn-primary w-fit">📥 Télécharger l&apos;Excel</button>
        <p className="text-xs text-muted">Le fichier contient des données personnelles : range-le dans un endroit sûr et ne l&apos;envoie pas par email.</p>
      </form>
    </div>
  );
}

import Link from "next/link";
import { AIDES, AVEC_ENTREPRISE, lireParcours, moisTexte, situation } from "@/lib/alumni";
import type { Candidat } from "@/lib/types";

type Ent = { id: string; nom: string; statut: string };

/** Tableau de bord : les alumni, ce qu'ils deviennent et ce qu'ils peuvent apporter au Campus. */
export function VueAlumni({ candidats, entreprises, promo, aide }: { candidats: Candidat[]; entreprises: Ent[]; promo?: string; aide?: string }) {
  const alumni = candidats.filter((c) => c.statut_admission === "alumni").map((c) => ({ c, p: lireParcours((c as { parcours?: unknown }).parcours) }));
  const promos = [...new Set(alumni.map((a) => a.c.diplome_annee).filter(Boolean))].sort((a, b) => b! - a!) as number[];
  const liste = alumni
    .filter((a) => !promo || String(a.c.diplome_annee ?? "") === promo)
    .filter((a) => !aide || a.p?.aides.includes(aide))
    .sort((a, b) => (b.c.diplome_annee ?? 0) - (a.c.diplome_annee ?? 0) || a.c.nom.localeCompare(b.c.nom));

  const renseignes = liste.filter((a) => a.p?.situation);
  const enPoste = renseignes.filter((a) => AVEC_ENTREPRISE.includes(a.p!.situation));
  const E = new Map(entreprises.map((e) => [e.id, e]));
  const chezPartenaire = enPoste.filter((a) => a.p!.entreprise_id && ["recrute", "partenaire"].includes(E.get(a.p!.entreprise_id)?.statut ?? ""));
  const aidants = liste.filter((a) => a.p?.aides.length);
  const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)} %` : "—");

  const tuiles = [
    ["🎓 Alumni", String(liste.length), promo ? `promo ${promo}` : "au total"],
    ["📝 Parcours renseigné", String(renseignes.length), pct(renseignes.length, liste.length)],
    ["💼 En poste ou en alternance", String(enPoste.length), `${pct(enPoste.length, renseignes.length)} des parcours renseignés`],
    ["🤝 Chez une entreprise partenaire", String(chezPartenaire.length), "statut Recrute ou Partenaire"],
    ["🙌 Prêts à aider", String(aidants.length), "JPO, parrainage, alternants…"],
  ];

  return (
    <div className="flex flex-col gap-4">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tuiles.map(([t, v, s]) => (
          <div key={t} className="card flex flex-col gap-1 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t}</span>
            <span className="font-mono text-2xl font-bold">{v}</span>
            <span className="text-xs text-muted">{s}</span>
          </div>
        ))}
      </section>

      <form className="flex flex-wrap items-end gap-2 text-sm">
        <input type="hidden" name="vue" value="alumni" />
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-muted">Promo</span>
          <select name="apromo" defaultValue={promo ?? ""} className="input py-1.5"><option value="">Toutes</option>{promos.map((p) => <option key={p} value={p}>{p}</option>)}</select>
        </label>
        <label className="flex flex-col gap-1"><span className="text-xs font-semibold text-muted">Peut aider pour</span>
          <select name="aaide" defaultValue={aide ?? ""} className="input py-1.5"><option value="">Tout</option>{AIDES.map((a) => <option key={a.id} value={a.id}>{a.icone} {a.label}</option>)}</select>
        </label>
        <button className="btn btn-sm">Filtrer</button>
        {(promo || aide) && <Link href="/admin?vue=alumni" className="btn btn-sm btn-ghost">Effacer</Link>}
      </form>

      {liste.length === 0 ? (
        <p className="card p-5 text-sm text-muted">Aucun alumni pour le moment. Pour en ajouter un, ouvre la fiche d&apos;un étudiant et passe son statut en <b>🎓 Alumni</b> : il reçoit un email de bienvenue et garde son espace à vie.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr><th className="p-3">Alumni</th><th className="p-3">Promo</th><th className="p-3">Situation</th><th className="p-3">Poste · entreprise</th><th className="p-3">Peut aider</th><th className="p-3">Mis à jour</th></tr>
            </thead>
            <tbody>
              {liste.map(({ c, p }) => {
                const s = situation(p?.situation);
                return (
                  <tr key={c.user_id} className="border-b border-line align-top last:border-0 hover:bg-bg">
                    <td className="p-3"><Link href={`/admin/candidats/${c.user_id}`} className="font-semibold hover:text-accent hover:underline">{c.nom || c.email}</Link><div className="text-xs text-muted">{c.email}{c.telephone ? ` · ${c.telephone}` : ""}</div></td>
                    <td className="p-3">{[c.formation, c.diplome_annee].filter(Boolean).join(" ") || "—"}</td>
                    <td className="p-3">{s ? `${s.icone} ${s.label}` : <span className="text-muted">À renseigner</span>}</td>
                    <td className="p-3">
                      {p?.poste || "—"}
                      {p?.entreprise && <div>{p.entreprise_id ? <Link href={`/admin/entreprises/${p.entreprise_id}`} className="text-accent hover:underline">🏢 {p.entreprise}</Link> : p.entreprise}</div>}
                      {(p?.ville || p?.depuis) && <div className="text-xs text-muted">{[p.ville, p.depuis && `depuis ${moisTexte(p.depuis)}`].filter(Boolean).join(" · ")}</div>}
                    </td>
                    <td className="p-3"><div className="flex flex-wrap gap-1">{AIDES.filter((a) => p?.aides.includes(a.id)).map((a) => <span key={a.id} className="chip text-xs" title={a.label}>{a.icone} {a.court}</span>)}</div></td>
                    <td className="p-3 text-xs text-muted">{p?.maj_le ? new Date(p.maj_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" }) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted">Chaque alumni reçoit un email « Où en es-tu ? » une fois par an s&apos;il n&apos;a pas mis son parcours à jour. Quand il indique son entreprise, elle arrive dans 🏢 Mes entreprises.</p>
    </div>
  );
}

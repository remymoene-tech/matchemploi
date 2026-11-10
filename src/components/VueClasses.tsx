import Link from "next/link";
import { anneeScolaire, type Classe } from "@/lib/classes";
import { SelectEnregistrer } from "@/components/SelectEnregistrer";
import type { Candidat } from "@/lib/types";

type Action = (f: FormData) => Promise<void>;

/** 📚 Pédagogie → Classes : créer des classes et rattacher chaque admis à une classe. */
export function VueClasses({ classes, admis, formations, filtre, creer, supprimer, attribuer, message }: {
  classes: Classe[] | null; admis: Candidat[]; formations: string[]; filtre?: string;
  creer: Action; supprimer?: Action; attribuer: Action; message?: string;
}) {
  if (classes === null) {
    return <p className="rounded-xl bg-warn-soft p-4 text-sm">Les classes ne sont pas encore activées : exécute la mise à jour SQL de la page <a href="/diagnostic" className="underline">/diagnostic</a> (lignes « Classes »).</p>;
  }
  const annee = new Date().getFullYear();
  const debutScolaire = new Date().getMonth() >= 8 ? annee : annee - 1;
  const sansClasse = admis.filter((c) => !c.classe_id || !classes.some((k) => k.id === c.classe_id));
  const liste = filtre === "sans" ? sansClasse : filtre ? admis.filter((c) => c.classe_id === filtre) : admis;
  const options = [{ id: "", label: "— Sans classe —" }, ...classes.map((k) => ({ id: k.id, label: `${k.nom} · ${anneeScolaire(k.annee)}` }))];

  return (
    <div className="flex flex-col gap-5">
      {message === "classe" && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">✅ Classe créée. Attribue-la maintenant aux étudiants admis ci-dessous.</p>}
      {message === "erreur-classe" && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">Indique le nom de la classe et son année.</p>}

      <form action={creer} className="card flex flex-wrap items-end gap-3 p-5">
        <div className="w-full">
          <h2 className="text-lg font-semibold">🏫 Nouvelle classe</h2>
          <p className="text-sm text-muted">Un nom et une année scolaire. Tu attribues ensuite la classe à chaque étudiant admis.</p>
        </div>
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm"><span className="font-semibold">Nom de la classe</span><input className="input" name="nom" required maxLength={120} placeholder="Ex. EGC 1A · Groupe 1" /></label>
        <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Année scolaire</span>
          <select className="input" name="annee" defaultValue={debutScolaire}>
            {Array.from({ length: 5 }, (_, i) => debutScolaire - 1 + i).map((a) => <option key={a} value={a}>{anneeScolaire(a)}</option>)}
          </select>
        </label>
        {formations.length > 0 && (
          <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Formation <span className="font-normal text-muted">(facultatif)</span></span>
            <select className="input" name="formation" defaultValue=""><option value="">—</option>{formations.map((f) => <option key={f} value={f}>{f}</option>)}</select>
          </label>
        )}
        <button className="btn btn-primary">➕ Créer la classe</button>
      </form>

      {classes.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((k) => {
            const eleves = admis.filter((c) => c.classe_id === k.id);
            return (
              <article key={k.id} className={`card flex flex-col gap-2 p-4 ${filtre === k.id ? "border-2 border-accent" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/admin?vue=classes&classe=${k.id}`} className="text-lg font-semibold hover:text-accent hover:underline">🏫 {k.nom}</Link>
                    <p className="text-xs text-muted">{[anneeScolaire(k.annee), k.formation].filter(Boolean).join(" · ")}</p>
                  </div>
                  <span className="chip chip-tag tabular-nums">{eleves.length} étudiant{eleves.length > 1 ? "s" : ""}</span>
                </div>
                {eleves.length > 0 && <p className="line-clamp-2 text-sm text-muted">{eleves.map((c) => c.nom || c.email).join(", ")}</p>}
                {supprimer && <form action={supprimer} className="mt-auto">
                  <input type="hidden" name="id" value={k.id} />
                  <button className="text-xs text-muted hover:text-bad">Supprimer la classe{eleves.length ? " (les étudiants restent, sans classe)" : ""}</button>
                </form>}
              </article>
            );
          })}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex flex-wrap items-center gap-3 text-lg font-semibold">🎓 Étudiants admis ({admis.length}) <Link href="/admin/export?type=candidats" className="btn btn-sm">📤 Exporter en Excel</Link></h2>
          <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrer par classe">
            <Link href="/admin?vue=classes" className={`rounded-full border px-3 py-1 ${!filtre ? "border-accent bg-accent-soft font-semibold" : "border-line text-muted hover:text-ink"}`}>Tous ({admis.length})</Link>
            <Link href="/admin?vue=classes&classe=sans" className={`rounded-full border px-3 py-1 ${filtre === "sans" ? "border-bad bg-bad-soft font-semibold" : sansClasse.length ? "border-bad text-bad" : "border-line text-muted"}`}>Sans classe ({sansClasse.length})</Link>
          </nav>
        </div>
        {liste.length === 0 ? (
          <p className="card border-dashed p-5 text-sm text-muted">{admis.length ? "Aucun étudiant dans cette sélection." : "Pas encore d'étudiant admis."}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr><th className="p-3">Étudiant</th><th className="p-3">Formation</th><th className="p-3">Classe</th></tr>
              </thead>
              <tbody>
                {liste.map((c) => (
                  <tr key={c.user_id} className="border-b border-line align-top last:border-0 hover:bg-bg">
                    <td className="p-3"><Link href={`/admin/candidats/${c.user_id}`} className="font-semibold hover:text-accent hover:underline">{c.nom || c.email}</Link><div className="text-xs text-muted">{c.email}</div></td>
                    <td className="p-3">{[c.formation, c.annee_cursus ? `${c.annee_cursus === 1 ? "1re" : `${c.annee_cursus}e`} année` : "", c.annee_rentree ? `rentrée ${c.annee_rentree}` : ""].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="p-3">
                      {classes.length ? (
                        <form action={attribuer}>
                          <input type="hidden" name="candidat_id" value={c.user_id} />
                          <input type="hidden" name="retour" value={`/admin?vue=classes${filtre ? `&classe=${filtre}` : ""}`} />
                          <SelectEnregistrer name="classe_id" label={`Classe de ${c.nom || c.email}`} defaultValue={c.classe_id ?? ""} options={options} />
                        </form>
                      ) : <span className="text-xs text-muted">Crée d&apos;abord une classe</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

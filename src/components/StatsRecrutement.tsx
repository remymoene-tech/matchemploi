import Link from "next/link";
import { aEteAdmis, aEteConvoque, aEtePresent, nomLead, premierContact, statutLead, type EchangeLead, type Lead } from "@/lib/leads";

/** Tableaux de recrutement : délai de rappel des leads et conversion lead → convoqué → présent → admis. */
export function StatsRecrutement({ leads, echanges, maintenant, annee, annees }: { leads: Lead[]; echanges: EchangeLead[]; maintenant: number; annee?: string; annees: number[] }) {
  const liste = annee ? leads.filter((l) => String(l.annee_rentree ?? "") === annee) : leads;
  if (!leads.length) {
    return (
      <section id="recrutement" className="card flex flex-col gap-1 p-5">
        <h2 className="text-lg font-semibold">📊 Recrutement : du lead à l&apos;admission</h2>
        <p className="text-sm text-muted">⏱️ Pas encore de lead : le temps moyen de réponse et les taux de conversion s&apos;afficheront ici dès le premier lead (formulaire brochure ou ➕ Ajouter un lead).</p>
      </section>
    );
  }
  const duree = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : h < 48 ? `${Math.round(h * 10) / 10} h` : `${Math.round((h / 24) * 10) / 10} j`);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)} %` : "—");

  // 1. Délai de rappel
  const delais = liste.map((l) => {
    const c = premierContact(l, echanges);
    return { l, h: c ? (new Date(c).getTime() - new Date(l.created_at).getTime()) / 3600e3 : null };
  });
  const rappeles = delais.filter((d) => d.h != null).map((d) => d.h!) .sort((a, b) => a - b);
  const moyenne = rappeles.length ? rappeles.reduce((s, x) => s + x, 0) / rappeles.length : null;
  const milieu = Math.floor(rappeles.length / 2);
  const mediane = !rappeles.length ? null : rappeles.length % 2 ? rappeles[milieu] : (rappeles[milieu - 1] + rappeles[milieu]) / 2;
  // Pas encore rappelés : aucun échange noté et toujours « Nouveau »
  const enAttente = delais.filter((d) => d.h == null && statutLead(d.l.statut).id === "nouveau")
    .sort((a, b) => a.l.created_at.localeCompare(b.l.created_at));
  // Statut changé sans échange noté : on ne connaît pas l'heure du rappel, ils ne comptent pas dans les %
  const sansEchange = delais.filter((d) => d.h == null && statutLead(d.l.statut).id !== "nouveau");
  const base = rappeles.length + enAttente.length;

  // 2. Conversion
  const etapes = [
    { label: "🧲 Leads", n: liste.length },
    { label: "📞 Rappelés", n: delais.filter((d) => d.h != null || statutLead(d.l.statut).id !== "nouveau").length },
    { label: "📨 Convoqués au concours", n: liste.filter(aEteConvoque).length },
    { label: "✍️ Présents au concours", n: liste.filter(aEtePresent).length },
    { label: "✅ Admis", n: liste.filter(aEteAdmis).length },
  ];
  const absents = liste.filter((l) => l.statut === "absent").length;

  // 3. Par formation
  const formations = [...new Set(liste.map((l) => l.formation || "Non précisée"))].sort();
  const parFormation = formations.map((f) => {
    const x = liste.filter((l) => (l.formation || "Non précisée") === f);
    return { f, leads: x.length, conv: x.filter(aEteConvoque).length, pres: x.filter(aEtePresent).length, adm: x.filter(aEteAdmis).length };
  });

  const th = "p-3 font-semibold";
  const td = "p-3 tabular-nums";
  return (
    <section id="recrutement" className="card flex scroll-mt-4 flex-col gap-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">📊 Recrutement : du lead à l&apos;admission</h2>
        <form method="get" action="/admin" className="flex items-center gap-2 text-sm">
          <label htmlFor="stat_annee" className="text-muted">Rentrée</label>
          <select id="stat_annee" name="stat_annee" defaultValue={annee ?? ""} className="input py-1.5">
            <option value="">Toutes</option>
            {annees.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button className="btn btn-sm">OK</button>
        </form>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">⏱️ Temps de réponse aux leads</h3>
          <div className="flex items-center gap-4 rounded-xl bg-accent-soft p-4">
            <b className="text-4xl font-semibold tabular-nums">{moyenne != null ? duree(moyenne) : "—"}</b>
            <span className="text-sm">
              <b>Temps moyen de réponse</b><br />
              <span className="text-muted">Ex. lead reçu à 12 h 00, rappelé à 12 h 20 → 20 min</span>
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <tbody>
                <tr className="border-b border-line"><th className={th}>Temps de réponse le plus rapide</th><td className={td}>{rappeles.length ? duree(rappeles[0]) : "—"}</td></tr>
                <tr className="border-b border-line"><th className={th}>Temps de réponse médian</th><td className={td}>{mediane != null ? duree(mediane) : "—"}</td></tr>
                <tr className="border-b border-line"><th className={th}>Rappelés en moins de 24 h</th><td className={td}>{pct(rappeles.filter((h) => h <= 24).length, base)}</td></tr>
                <tr className="border-b border-line"><th className={th}>Rappelés en moins de 48 h</th><td className={td}>{pct(rappeles.filter((h) => h <= 48).length, base)}</td></tr>
                <tr><th className={th}>Pas encore rappelés</th><td className={`${td} ${enAttente.length ? "font-semibold text-bad" : ""}`}>{enAttente.length}</td></tr>
                {sansEchange.length > 0 && <tr className="border-t border-line"><th className={th}>Statut changé sans appel noté <span className="block text-xs font-normal text-muted">pas comptés dans les temps et les %</span></th><td className={`${td} font-semibold text-warn`}>{sansEchange.length}</td></tr>}
              </tbody>
            </table>
          </div>
          {enAttente.length > 0 && (
            <p className="text-xs text-muted">
              À rappeler en priorité :{" "}
              {enAttente.slice(0, 5).map((d, i) => (
                <span key={d.l.id}>{i ? ", " : ""}<Link href={`/admin/leads/${d.l.id}?onglet=echanges`} className="text-accent underline">{nomLead(d.l)}</Link> ({duree((maintenant - new Date(d.l.created_at).getTime()) / 3600e3)})</span>
              ))}
            </p>
          )}
          {sansEchange.length > 0 && (
            <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs">
              ⚠️ Pour {sansEchange.length > 1 ? "ces leads" : "ce lead"}, le statut a changé mais aucun appel, email, SMS ou rendez-vous n&apos;est noté : ajoute-le dans « 💬 Échanges » avec la bonne heure pour qu&apos;il compte →{" "}
              {sansEchange.map((d, i) => <span key={d.l.id}>{i ? ", " : ""}<Link href={`/admin/leads/${d.l.id}?onglet=echanges`} className="font-semibold underline">{nomLead(d.l)}</Link></span>)}
            </p>
          )}
          <p className="text-xs text-muted">La réponse compte à l&apos;heure du premier échange noté dans la fiche du lead (appel, email, SMS, rendez-vous) : pense à mettre la bonne heure dans « Date et heure ».</p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-semibold">🔁 Taux de conversion</h3>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr><th className={th}>Étape</th><th className={th}>Nombre</th><th className={th}>% des leads</th><th className={th}>% étape précédente</th></tr>
              </thead>
              <tbody>
                {etapes.map((e, i) => (
                  <tr key={e.label} className="border-b border-line last:border-0">
                    <td className="p-3">{e.label}</td>
                    <td className={`${td} font-semibold`}>{e.n}</td>
                    <td className={td}>{i ? pct(e.n, etapes[0].n) : "100 %"}</td>
                    <td className={td}>{i ? pct(e.n, etapes[i - 1].n) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {absents > 0 && <p className="text-xs text-muted">🚫 {absents} absent{absents > 1 ? "s" : ""} au concours ({pct(absents, etapes[2].n)} des convoqués).</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="font-semibold">🎓 Par formation</h3>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <tr><th className={th}>Formation</th><th className={th}>Leads</th><th className={th}>Convoqués</th><th className={th}>Présents</th><th className={th}>Admis</th><th className={th}>Lead → admis</th><th className={th}>Présence</th></tr>
            </thead>
            <tbody>
              {parFormation.map((x) => (
                <tr key={x.f} className="border-b border-line last:border-0">
                  <td className="p-3 font-semibold"><Link href={`/admin?vue=leads&lformation=${encodeURIComponent(x.f)}`} className="hover:text-accent hover:underline">{x.f}</Link></td>
                  <td className={td}>{x.leads}</td><td className={td}>{x.conv}</td><td className={td}>{x.pres}</td><td className={`${td} font-semibold`}>{x.adm}</td>
                  <td className={td}>{pct(x.adm, x.leads)}</td><td className={td}>{pct(x.pres, x.conv)}</td>
                </tr>
              ))}
              {!parFormation.length && <tr><td className="p-3 text-muted" colSpan={7}>Pas encore de lead.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

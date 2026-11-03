import { COULEURS, STYLES } from "@/lib/tests";

type Res = { scores: Record<string, number>; dominante: string; passe_par: string; created_at: string } | null;
const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

function Barres({ items, max }: { items: { nom: string; hex: string; v: number }[]; max: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => (
        <li key={it.nom} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm">
          <span className="font-semibold">{it.nom}</span>
          <span className="h-3 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full" style={{ width: `${(it.v / max) * 100}%`, background: it.hex }} /></span>
          <span className="text-right font-mono tabular-nums">{it.v}</span>
        </li>
      ))}
    </ul>
  );
}

/** Résultat du test DISC : barres de couleurs + description de la dominante. */
export function ResultatDisc({ r, tutoie = true }: { r: Res; tutoie?: boolean }) {
  if (!r) return null;
  const [dom, sec] = r.dominante.split(",");
  const D = COULEURS.find((c) => c.id === dom)!, S = COULEURS.find((c) => c.id === sec);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full text-lg font-extrabold text-white" style={{ background: D.hex }}>{D.lettre}</span>
        <div>
          <p className="text-lg font-semibold">{tutoie ? "Ta couleur" : "Couleur dominante"} : {D.nom}{S ? ` · secondaire ${S.nom}` : ""}</p>
          <p className="text-xs text-muted">Passé le {dateFr(r.created_at)}{r.passe_par === "conseiller" ? " avec un conseiller" : ""}</p>
        </div>
      </div>
      <Barres max={15} items={COULEURS.map((c) => ({ nom: c.nom, hex: c.hex, v: r.scores[c.id] ?? 0 }))} />
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p><b>{D.nom} :</b> {D.resume}</p>
        <p><b>Points forts :</b> {D.forces}</p>
        <p><b>À travailler :</b> {D.vigilance}</p>
        <p><b>Environnements où {tutoie ? "tu es" : "il est"} à l&apos;aise :</b> {D.environnements}</p>
      </div>
    </div>
  );
}

/** Résultat du style de management : 4 styles sur 40, total 100. */
export function ResultatManagement({ r, tutoie = true }: { r: Res; tutoie?: boolean }) {
  if (!r) return null;
  const D = STYLES.find((s) => s.id === r.dominante)!;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-lg font-semibold">{tutoie ? "Ton style" : "Style dominant"} : {D.nom}</p>
        <p className="text-xs text-muted">{D.mots} · passé le {dateFr(r.created_at)}{r.passe_par === "conseiller" ? " avec un conseiller" : ""}</p>
      </div>
      <Barres max={40} items={STYLES.map((s) => ({ nom: s.nom, hex: s.hex, v: r.scores[s.id] ?? 0 }))} />
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {STYLES.map((s) => <li key={s.id}><b>{s.nom}</b> ({s.mots}) : <span className="text-muted">{s.resume}</span></li>)}
      </ul>
    </div>
  );
}

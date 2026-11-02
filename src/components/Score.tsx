import { tonScore } from "@/lib/types";

/** Note sur 100 : vert à partir de 70 %, orange de 65 à 69 %, rouge en dessous. */
export function Score({ score, grand }: { score: number; seuil?: number; grand?: boolean }) {
  const t = tonScore(score);
  const ton = t === "good" ? "text-good" : t === "warn" ? "text-warn" : "text-bad";
  const barre = t === "good" ? "bg-good" : t === "warn" ? "bg-warn" : "bg-bad";
  return (
    <div className="flex w-20 flex-col gap-1.5">
      <b className={`font-mono font-bold tabular-nums leading-none ${ton} ${grand ? "text-3xl" : "text-2xl"}`}>
        {score}<small className="text-sm">%</small>
      </b>
      <div className="h-1.5 overflow-hidden rounded bg-line">
        <i className={`block h-full ${barre}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export function Chips({ forts, manques }: { forts: string[]; manques: string[] }) {
  if (!forts.length && !manques.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {forts.map((f) => <span key={"+" + f} className="chip chip-plus">+ {f}</span>)}
      {manques.map((m) => <span key={"-" + m} className="chip chip-minus">− {m}</span>)}
    </div>
  );
}

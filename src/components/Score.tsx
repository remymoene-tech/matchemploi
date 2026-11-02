export function Score({ score, seuil, grand }: { score: number; seuil: number; grand?: boolean }) {
  const ton = score >= seuil ? "text-good" : score >= seuil - 20 ? "text-warn" : "text-bad";
  const barre = score >= seuil ? "bg-good" : score >= seuil - 20 ? "bg-warn" : "bg-bad";
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

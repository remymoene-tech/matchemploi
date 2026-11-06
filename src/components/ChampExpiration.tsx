import { DUREES_OFFRE, texteExpiration } from "@/lib/expiration";
import { maintenantMs } from "@/lib/echanges";

/** Choix de la durée de l'offre (formulaire d'offre de l'équipe ou de l'école). */
export function ChampExpiration({ expire, nouvelle }: { expire?: string | null; nouvelle: boolean }) {
  const actuel = texteExpiration(expire, maintenantMs());
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-3">
      <legend className="px-1 text-sm font-semibold">⏳ Durée de l&apos;offre</legend>
      {actuel && <p className="text-sm"><span className={`chip ${actuel.chip}`}>{actuel.texte}</span></p>}
      <div className="flex flex-wrap gap-2">
        {!nouvelle && (
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
            <input type="radio" name="duree_offre" value="garder" defaultChecked className="sr-only" />
            {expire ? "Garder cette date" : "Garder : sans limite"}
          </label>
        )}
        {DUREES_OFFRE.map((d) => (
          <label key={d.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
            <input type="radio" name="duree_offre" value={d.id} defaultChecked={nouvelle && d.id === "30"} className="sr-only" />
            {d.id === "aucune" ? d.label : `${nouvelle ? "" : "Prolonger de "}${d.label}`}
          </label>
        ))}
      </div>
      <span className="hint">À la date d&apos;expiration, l&apos;offre se ferme toute seule : elle n&apos;est plus proposée aux étudiants.</span>
    </fieldset>
  );
}

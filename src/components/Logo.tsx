/** Logo MagnusMatch, dans l'esprit de l'École EGC – Campus Magnus :
 *  lettres fines très espacées et petits traits pastel sous le mot. */
const TRAITS = ["var(--rose)", "var(--jaune)", "var(--sauge)", "var(--bleu)"];

export function Logo({ taille = "md" }: { taille?: "md" | "lg" }) {
  const grand = taille === "lg";
  return (
    <span className="inline-flex flex-col items-center leading-none text-ink">
      <span className={`font-display font-light tracking-[.32em] ${grand ? "text-5xl" : "text-[22px]"}`} style={{ marginRight: "-.32em" }}>
        MAGNUS
      </span>
      <span className={`flex w-full ${grand ? "mt-1.5 h-[3px] gap-3" : "mt-1 h-[2px] gap-1.5"}`} aria-hidden>
        {TRAITS.map((c) => <span key={c} className="flex-1 rounded-full" style={{ background: c }} />)}
      </span>
      <span className={`font-display font-normal tracking-[.42em] text-muted ${grand ? "mt-3 text-base" : "mt-1.5 text-[9.5px]"}`} style={{ marginRight: "-.42em" }}>
        MATCH
      </span>
    </span>
  );
}

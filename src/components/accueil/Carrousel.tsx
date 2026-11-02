"use client";

import { useEffect, useRef, useState } from "react";

/** Carrousel qui défile tout seul (pause au survol), glissable au doigt, avec points de navigation. */
export function Carrousel({ diapos, intervalle = 4500 }: { diapos: { titre: string; contenu: React.ReactNode }[]; intervalle?: number }) {
  const piste = useRef<HTMLDivElement>(null);
  const [actif, setActif] = useState(0);
  const [pause, setPause] = useState(false);

  const aller = (i: number) => {
    const el = piste.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  // Suit la diapo visible quand on fait glisser
  useEffect(() => {
    const el = piste.current;
    if (!el) return;
    const surScroll = () => setActif(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", surScroll, { passive: true });
    return () => el.removeEventListener("scroll", surScroll);
  }, []);

  // Défilement automatique (désactivé si l'utilisateur préfère moins d'animations)
  useEffect(() => {
    if (pause || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => aller((actif + 1) % diapos.length), intervalle);
    return () => clearInterval(t);
  }, [actif, pause, diapos.length, intervalle]);

  return (
    <div
      className="flex flex-col gap-3"
      onMouseEnter={() => setPause(true)}
      onMouseLeave={() => setPause(false)}
      onFocus={() => setPause(true)}
      onBlur={() => setPause(false)}
      aria-roledescription="carrousel"
    >
      <div ref={piste} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {diapos.map((d, i) => (
          <div key={d.titre} className="w-full shrink-0 snap-center px-1" aria-roledescription="diapositive" aria-label={`${i + 1} sur ${diapos.length} : ${d.titre}`}>
            {d.contenu}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold" aria-live="polite">{diapos[actif]?.titre}</p>
        <div className="flex items-center gap-1.5">
          {diapos.map((d, i) => (
            <button
              key={d.titre}
              type="button"
              onClick={() => aller(i)}
              aria-label={`Voir : ${d.titre}`}
              aria-current={i === actif}
              className={`h-2 rounded-full transition-all ${i === actif ? "w-6 bg-accent" : "w-2 bg-line hover:bg-muted"}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

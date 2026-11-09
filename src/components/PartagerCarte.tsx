"use client";

import { useState } from "react";

/** Partage du lien de la carte (menu de partage du téléphone, sinon copie). */
export function PartagerCarte({ lien, nom }: { lien: string; nom: string }) {
  const [fait, setFait] = useState(false);
  return (
    <button
      type="button"
      className="btn w-full justify-center"
      onClick={async () => {
        try {
          if (navigator.share) {
            await navigator.share({ title: `Carte de visite · ${nom}`, url: lien });
            return;
          }
          await navigator.clipboard.writeText(lien);
          setFait(true);
          setTimeout(() => setFait(false), 2000);
        } catch {
          /* partage annulé */
        }
      }}
    >
      {fait ? "Lien copié ✓" : "🔗 Partager le lien"}
    </button>
  );
}

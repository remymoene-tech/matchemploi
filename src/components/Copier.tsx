"use client";

import { useState } from "react";

export function Copier({ texte }: { texte: string }) {
  const [fait, setFait] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texte);
          setFait(true);
          setTimeout(() => setFait(false), 2000);
        } catch {
          /* le texte reste sélectionnable à la main */
        }
      }}
    >
      {fait ? "Copié ✓" : "Copier le texte"}
    </button>
  );
}

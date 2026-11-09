"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enregistrerBrochure, preparerDepotBrochure } from "@/app/admin/actions";

/** Dépôt (ou retrait) d'une brochure PDF pour une formation, ou la brochure générale de l'école. */
export function FormBrochure({ ecoleId, formation, actuelle }: { ecoleId: string; formation: string; actuelle?: string | null }) {
  const [etat, setEtat] = useState<"" | "envoi" | "ok">("");
  const [erreur, setErreur] = useState("");
  const router = useRouter();
  const deposer = async (f: File) => {
    setErreur("");
    if (f.type !== "application/pdf") return setErreur("La brochure doit être un PDF.");
    if (f.size > 25 * 1024 * 1024) return setErreur("25 Mo maximum.");
    setEtat("envoi");
    const p = await preparerDepotBrochure(ecoleId, formation);
    if ("erreur" in p) { setEtat(""); return setErreur(p.erreur); }
    const { error } = await createClient().storage.from("brochures").uploadToSignedUrl(p.chemin, p.jeton, f, { contentType: "application/pdf" });
    if (error) { setEtat(""); return setErreur(`L'envoi a échoué (${error.message}).`); }
    const r = await enregistrerBrochure(ecoleId, formation, p.chemin);
    if (r.erreur) { setEtat(""); return setErreur(r.erreur); }
    setEtat("ok");
    router.refresh();
  };
  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      {actuelle ? <span className="chip chip-plus">📄 Brochure en ligne</span> : <span className="chip">📄 Pas de brochure</span>}
      <label className="btn btn-sm cursor-pointer">
        {etat === "envoi" ? "Envoi…" : actuelle ? "Remplacer" : "Déposer le PDF"}
        <input type="file" accept="application/pdf" className="sr-only" disabled={etat === "envoi"} onChange={(e) => e.target.files?.[0] && deposer(e.target.files[0])} />
      </label>
      {actuelle && (
        <button type="button" className="btn btn-sm btn-ghost text-bad" onClick={async () => { await enregistrerBrochure(ecoleId, formation, null); router.refresh(); }}>Retirer</button>
      )}
      {erreur && <span className="text-bad">{erreur}</span>}
    </span>
  );
}

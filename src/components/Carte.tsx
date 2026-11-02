"use client";

import dynamic from "next/dynamic";

// La carte a besoin du navigateur : on la charge seulement côté client.
export const Carte = dynamic(() => import("./CarteOffres"), {
  ssr: false,
  loading: () => <div className="grid h-[60vh] min-h-[360px] place-items-center rounded-xl border border-line text-sm text-muted">Chargement de la carte…</div>,
});
export type { PointOffre, Domicile } from "./CarteOffres";

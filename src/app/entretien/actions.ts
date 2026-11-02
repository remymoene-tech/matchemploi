"use server";

import { revalidatePath } from "next/cache";
import { genererPreparation } from "@/lib/preparation";
import { accesFiche } from "./acces";

export type EtatFiche = { erreur?: string };

export async function preparerFiche(_: EtatFiche, f: FormData): Promise<EtatFiche> {
  const candidat = String(f.get("candidat_id") ?? "");
  const offre = String(f.get("offre_id") ?? "");
  if (!(await accesFiche(candidat))) return { erreur: "Accès refusé." };
  const r = await genererPreparation(candidat, offre, f.get("forcer") === "1");
  if (!r.ok) return { erreur: r.message };
  revalidatePath(`/entretien/${candidat}/${offre}`);
  return {};
}

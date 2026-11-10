import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Classes de l'école (pédagogie) : un nom et une année scolaire ; chaque admis est rattaché à une classe. */
export type Classe = { id: string; nom: string; annee: number; formation: string; created_at: string };

/** 2026 → « 2026-2027 » */
export const anneeScolaire = (a: number) => `${a}-${a + 1}`;

export async function listeClasses(): Promise<Classe[] | null> {
  const { data, error } = await createAdminClient().from("classes").select("*").order("annee", { ascending: false }).order("nom");
  return error ? null : ((data ?? []) as Classe[]);
}

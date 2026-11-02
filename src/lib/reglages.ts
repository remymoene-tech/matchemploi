import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const FREQUENCES = [
  { id: "quotidienne", label: "Tous les jours", detail: "Chaque matin" },
  { id: "deux_par_semaine", label: "2 fois par semaine", detail: "Lundi et jeudi" },
  { id: "hebdomadaire", label: "1 fois par semaine", detail: "Le lundi" },
  { id: "manuelle", label: "Seulement à la demande", detail: "Quand un candidat ou l'équipe clique sur « Chercher »" },
] as const;
export type Frequence = (typeof FREQUENCES)[number]["id"];

/** Lit la fréquence choisie (tous les jours par défaut, y compris si la table n'existe pas encore). */
export async function lireFrequence(): Promise<{ frequence: Frequence; tableOk: boolean }> {
  const { data, error } = await createAdminClient().from("reglages").select("valeur").eq("cle", "frequence").maybeSingle();
  const v = data?.valeur as Frequence | undefined;
  return { frequence: FREQUENCES.some((f) => f.id === v) ? v! : "quotidienne", tableOk: !error };
}

export async function ecrireFrequence(frequence: Frequence) {
  const { error } = await createAdminClient().from("reglages").upsert({ cle: "frequence", valeur: frequence });
  return !error;
}

/** La tâche planifiée tourne chaque matin : doit-elle chercher aujourd'hui ? */
export function rechercheAujourdhui(frequence: Frequence, date = new Date()) {
  const jour = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "Europe/Paris" }).format(date);
  if (frequence === "quotidienne") return true;
  if (frequence === "deux_par_semaine") return jour === "Mon" || jour === "Thu";
  if (frequence === "hebdomadaire") return jour === "Mon";
  return false;
}

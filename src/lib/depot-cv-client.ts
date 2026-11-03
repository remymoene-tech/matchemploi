"use client";

import { createClient } from "@/lib/supabase/client";
import { preparerDepotCV } from "@/app/espace/actions";

export const TAILLE_MAX_CV = 10 * 1024 * 1024;

/**
 * Envoie le CV directement du navigateur vers le stockage privé (sans passer par le serveur du site,
 * limité à ~4 Mo). Renvoie un message d'erreur, ou null si c'est bon.
 */
export async function envoyerCV(fichier: File): Promise<string | null> {
  if (fichier.type !== "application/pdf" && !/\.pdf$/i.test(fichier.name)) return "Le CV doit être un fichier PDF (pas une photo ni un document Word).";
  if (fichier.size > TAILLE_MAX_CV) return `Ton CV fait ${(fichier.size / 1024 / 1024).toFixed(1)} Mo : 10 Mo maximum. Exporte-le à nouveau en PDF « qualité standard ».`;
  const p = await preparerDepotCV();
  if ("erreur" in p) return p.erreur;
  const { error } = await createClient().storage.from("cv").uploadToSignedUrl(p.chemin, p.jeton, fichier, { contentType: "application/pdf", upsert: true });
  return error ? `L'envoi du CV a échoué (${error.message}). Vérifie ta connexion et réessaie.` : null;
}

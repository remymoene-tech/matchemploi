"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EtatForm = { erreur?: string; info?: string };

function traduire(message: string) {
  if (/invalid login credentials/i.test(message)) return "Email ou mot de passe incorrect.";
  if (/email not confirmed/i.test(message)) return "Confirme d'abord ton adresse : clique sur le lien reçu par email.";
  if (/already registered/i.test(message)) return "Un compte existe déjà avec cet email. Connecte-toi.";
  if (/password/i.test(message)) return "Le mot de passe doit faire au moins 8 caractères.";
  return "Une erreur est survenue. Réessaie dans un instant.";
}

export async function inscription(_: EtatForm, form: FormData): Promise<EtatForm> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || password.length < 8) return { erreur: "Indique ton email et un mot de passe d'au moins 8 caractères." };

  const supabase = await createClient();
  const origine = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${(await headers()).get("host")}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origine}/auth/callback?next=/espace/profil` },
  });
  if (error) return { erreur: traduire(error.message) };
  if (data.session) redirect("/espace/profil"); // confirmation d'email désactivée
  return { info: `C'est presque fini : clique sur le lien envoyé à ${email} pour activer ton compte.` };
}

export async function connexion(_: EtatForm, form: FormData): Promise<EtatForm> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { erreur: traduire(error.message) };
  redirect("/espace");
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

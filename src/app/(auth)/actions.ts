"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EtatForm = { erreur?: string; info?: string };

function traduire(message: string) {
  console.error("[auth]", message); // visible dans Vercel → Logs
  if (/rate limit|too many|security purposes|after \d+ seconds/i.test(message))
    return "Trop d'inscriptions en peu de temps : le service d'emails est saturé. Réessaie dans une heure, ou préviens ton conseiller. (limite d'emails)";
  if (/invalid.*email|email.*invalid|unable to validate email/i.test(message)) return "Cette adresse email n'est pas valide. Vérifie-la (pas d'espace, pas d'accent).";
  if (/signups? not allowed|signup.*disabled/i.test(message)) return "Les inscriptions sont fermées pour le moment. Préviens ton conseiller.";
  if (/error sending|smtp|confirmation email/i.test(message)) return "L'email de confirmation n'a pas pu partir. Préviens ton conseiller. (envoi d'email)";
  if (/invalid login credentials/i.test(message)) return "Email ou mot de passe incorrect.";
  if (/email not confirmed/i.test(message)) return "Confirme d'abord ton adresse : clique sur le lien reçu par email.";
  if (/already registered/i.test(message)) return "Un compte existe déjà avec cet email. Connecte-toi.";
  if (/password/i.test(message)) return "Le mot de passe doit faire au moins 8 caractères.";
  return `Une erreur est survenue. Réessaie dans un instant. (détail : ${message.slice(0, 120)})`;
}

export async function inscription(_: EtatForm, form: FormData): Promise<EtatForm> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || password.length < 8) return { erreur: "Indique ton email et un mot de passe d'au moins 8 caractères." };

  const supabase = await createClient();
  const origine = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${(await headers()).get("host")}`;
  const ecole = String(form.get("ecole") ?? "").trim().replace(/[^A-Za-z0-9-]/g, "");
  const { roleDe } = await import("@/lib/equipe");
  const suite = (await roleDe(email)) ? "/admin" : `/espace/profil${ecole ? `?ecole=${ecole}` : ""}`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origine}/auth/callback?next=${encodeURIComponent(suite)}` },
  });
  if (error) return { erreur: traduire(error.message) };
  if (data.session) redirect(suite); // confirmation d'email désactivée
  return { info: `C'est presque fini : clique sur le lien envoyé à ${email} pour activer ton compte.` };
}

export async function connexion(_: EtatForm, form: FormData): Promise<EtatForm> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { erreur: traduire(error.message) };
  const { roleDe } = await import("@/lib/equipe");
  redirect((await roleDe(String(form.get("email") ?? "").trim())) ? "/admin" : "/espace");
}

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

import "server-only";

/**
 * Envoi d'emails via Resend (https://resend.com, offre gratuite).
 * Sans RESEND_API_KEY, aucun email n'est envoyé (le site fonctionne quand même).
 */
export async function envoyerEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_EXPEDITEUR ?? "MatchEmploi <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });
  return res.ok;
}

export const echapper = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

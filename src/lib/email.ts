import "server-only";
import nodemailer from "nodemailer";

/**
 * Envoi d'emails, par l'un de ces deux moyens (le premier configuré est utilisé) :
 * 1. Ta propre boîte (Gmail, Outlook…) via SMTP : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *    (pour Gmail : smtp.gmail.com, 465, ton adresse, un « mot de passe d'application »).
 * 2. Resend (https://resend.com) avec un nom de domaine vérifié : RESEND_API_KEY, EMAIL_EXPEDITEUR.
 * Sans configuration, aucun email ne part (le site fonctionne quand même).
 */
export type OptionsEmail = {
  /** Nom affiché comme expéditeur, ex. « IFP Salon – MagnusMatch ». */
  nomExpediteur?: string;
  /** Adresse qui reçoit les réponses. */
  repondreA?: string;
  /** Copie cachée (ex. l'expéditeur, pour garder une trace). */
  copieCachee?: string;
  /** Version texte du message. */
  texte?: string;
};

export function moyenEnvoi(): "smtp" | "resend" | null {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

let transport: nodemailer.Transporter | null = null;
function smtp() {
  const port = Number(process.env.SMTP_PORT ?? 465);
  return (transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }));
}

export async function envoyerEmail(to: string, subject: string, html: string, o: OptionsEmail = {}): Promise<boolean> {
  const moyen = moyenEnvoi();
  try {
    if (moyen === "smtp") {
      const adresse = process.env.SMTP_USER!;
      await smtp().sendMail({
        from: { name: o.nomExpediteur ?? "MagnusMatch", address: adresse },
        to,
        subject,
        html,
        text: o.texte,
        replyTo: o.repondreA,
        bcc: o.copieCachee,
      });
      return true;
    }
    if (moyen === "resend") {
      const exp = process.env.EMAIL_EXPEDITEUR ?? "MagnusMatch <onboarding@resend.dev>";
      const adresse = exp.match(/<([^>]+)>/)?.[1] ?? exp;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: o.nomExpediteur ? `${o.nomExpediteur} <${adresse}>` : exp,
          to,
          subject,
          html,
          text: o.texte,
          reply_to: o.repondreA,
          bcc: o.copieCachee,
        }),
      });
      return res.ok;
    }
  } catch (e) {
    console.error("Envoi d'email impossible", e);
  }
  return false;
}

/** Transforme un texte simple en HTML lisible (paragraphes, retours à la ligne, liens). */
export function texteEnHtml(texte: string) {
  return echapper(texte)
    .replace(/(https?:\/\/[^\s<]*[^\s<.,;:!?)])/g, '<a href="$1">$1</a>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export const echapper = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

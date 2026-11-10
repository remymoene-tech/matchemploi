/**
 * Mise en page « pro » des emails écrits en texte simple (modèles et « Noter un échange ») :
 *   « ## Titre »                      → titre de section
 *   lignes « - … »                    → liste à puces
 *   lignes « 1. … »                   → étapes numérotées
 *   lignes qui commencent par un emoji → encadré d'infos (date, lieu…)
 *   « 👉 Libellé : https://… »         → bouton
 *   dernier bloc « Nom / Poste · Campus Magnus » → signature
 */
const echapper = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const liens = (s: string) => echapper(s).replace(/(https?:\/\/[^\s<]*[^\s<.,;:!?)])/g, '<a href="$1" style="color:#56664b">$1</a>');
const EMOJI = /^\p{Extended_Pictographic}/u;
const POLICE = "font-family:Arial,Helvetica,sans-serif";

function bloc(p: string, dernier: boolean): string {
  const lignes = p.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lignes.length) return "";
  const bouton = lignes.length === 1 && lignes[0].match(/^👉\s*(.+?)\s*:\s*(https?:\/\/\S+)$/u);
  if (bouton) {
    return `<p style="margin:24px 0"><a href="${echapper(bouton[2])}" style="display:inline-block;background:#56664b;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:8px">${echapper(bouton[1])}</a></p>`;
  }
  if (lignes.length === 1 && lignes[0].startsWith("## ")) {
    return `<h2 style="margin:28px 0 10px;font-size:16px;color:#111111;border-bottom:2px solid #aebaa2;padding-bottom:6px">${echapper(lignes[0].slice(3))}</h2>`;
  }
  if (lignes.every((l) => l.startsWith("- "))) {
    return `<ul style="margin:0 0 16px;padding-left:22px">${lignes.map((l) => `<li style="margin:0 0 6px">${liens(l.slice(2))}</li>`).join("")}</ul>`;
  }
  if (lignes.every((l) => /^\d+\.\s/.test(l))) {
    return `<table role="presentation" style="margin:0 0 16px;border-collapse:collapse">${lignes.map((l) => {
      const [, n, t] = l.match(/^(\d+)\.\s+(.*)$/)!;
      return `<tr><td style="vertical-align:top;padding:0 10px 8px 0"><span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;border-radius:12px;background:#aebaa2;color:#111111;font-weight:bold;font-size:13px">${n}</span></td><td style="vertical-align:top;padding:2px 0 8px">${liens(t)}</td></tr>`;
    }).join("")}</table>`;
  }
  if (lignes.every((l) => EMOJI.test(l))) {
    return `<div style="margin:0 0 16px;padding:14px 18px;background:#f1f4ee;border-left:4px solid #56664b;border-radius:6px">${lignes.map((l) => `<p style="margin:4px 0">${liens(l)}</p>`).join("")}</div>`;
  }
  if (dernier && lignes.length <= 3 && /Campus Magnus$/.test(lignes[lignes.length - 1])) {
    return `<table role="presentation" style="margin:8px 0 0;border-collapse:collapse"><tr><td style="border-left:3px solid #aebaa2;padding:2px 0 2px 12px"><p style="margin:0;font-weight:bold;color:#111111">${echapper(lignes[0])}</p>${lignes.slice(1).map((l) => `<p style="margin:2px 0 0;color:#5c5c5c;font-size:14px">${echapper(l)}</p>`).join("")}</td></tr></table>`;
  }
  return `<p style="margin:0 0 14px">${lignes.map(liens).join("<br>")}</p>`;
}

/** Mise en page complète. `vous` : pied de page au vouvoiement (entreprises). */
export function emailPro(texte: string, o: { vous?: boolean } = {}): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://magnusmatch.vercel.app";
  const paras = texte.replace(/\r/g, "").split(/\n{2,}/);
  const corps = paras.map((p, i) => bloc(p, i === paras.length - 1)).join("");
  return `<!doctype html><html lang="fr"><body style="margin:0;padding:0;background:#f4f4f1">
<table role="presentation" width="100%" style="background:#f4f4f1;border-collapse:collapse"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;border-collapse:separate;overflow:hidden;${POLICE}">
<tr><td style="background:#aebaa2;height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>
<tr><td align="center" style="padding:22px 28px 14px;border-bottom:1px solid #e6e8e2">
<img src="${site}/email-logo.png" width="172" height="60" alt="Magnus Global Business School · Arles" style="display:block;border:0;width:172px;height:60px">
</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6;color:#222222">${corps}</td></tr>
<tr><td style="background:#f7f7f4;padding:16px 28px;font-size:12px;line-height:1.5;color:#777777">
Campus Magnus · CCI du Pays d'Arles · 45 boulevard Marcellin Berthelot, 13200 Arles<br>${o.vous ? "Vous pouvez répondre directement à cet email." : "Tu peux répondre directement à cet email."}
</td></tr>
</table></td></tr></table></body></html>`;
}

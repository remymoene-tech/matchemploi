import { NextResponse } from "next/server";
import { exigerSuperAdmin } from "@/lib/auth";
import { emailPro } from "@/lib/email-pro";
import { remplir } from "@/lib/modeles";
import { modelesActifs, valeursCommunes } from "@/lib/modeles-serveur";

/** Aperçu d'un modèle d'email, rempli avec des exemples (administrateur). */
export async function GET(req: Request) {
  const { user } = await exigerSuperAdmin();
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const m = (await modelesActifs()).find((x) => x.id === id);
  if (!m) return new NextResponse("Modèle introuvable", { status: 404 });
  const v = {
    ...(await valeursCommunes(user.email)), prenom: "Lucas", formation: "EGC", rentree: String(new Date().getFullYear() + 1),
    entretien: "mercredi 11 novembre à 14:00", contact: "Mme Durand", entreprise: "Agence Provence Immo",
  };
  const html = emailPro(remplir(m.email, v), { vous: m.cible === "entreprise" })
    .replace("<body", `<body><p style="margin:0;padding:10px;background:#111;color:#fff;font:14px Arial;text-align:center">Aperçu · Objet : ${remplir(m.sujet, v).replace(/</g, "&lt;")}</p><div`)
    .replace("</body>", "</div></body>");
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

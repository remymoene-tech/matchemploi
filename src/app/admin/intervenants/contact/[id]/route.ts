import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { droitsDe, peut } from "@/lib/equipe";
import type { Lead } from "@/lib/leads";

// Carte de visite (.vcf) d'un intervenant : sur iPhone, « Créer un nouveau contact ». Pédagogie et administrateur.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || !peut(await droitsDe(user.email), "intervenants")) return new NextResponse("Accès réservé", { status: 403 });
  const { data } = await createAdminClient().from("leads").select("*").eq("id", id).eq("categorie", "intervenant").maybeSingle();
  if (!data) return new NextResponse("Introuvable", { status: 404 });
  const l = data as Lead;
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  const linkedin = (l.message ?? "").match(/LinkedIn : (\S+)/)?.[1] ?? "";
  const lignes = [
    "BEGIN:VCARD", "VERSION:3.0",
    `N:${esc(l.nom)};${esc(l.prenom)};;;`,
    `FN:${esc([l.prenom, l.nom].filter(Boolean).join(" ") || l.email)}`,
    l.entreprise ? `ORG:${esc(l.entreprise)}` : "",
    `TITLE:${esc(`Intervenant Campus Magnus${l.formation ? ` · ${l.formation}` : ""}`)}`,
    l.telephone ? `TEL;TYPE=CELL:${esc(l.telephone)}` : "",
    l.email ? `EMAIL;TYPE=INTERNET:${esc(l.email)}` : "",
    linkedin ? `URL:${esc(linkedin)}` : "",
    `NOTE:${esc(`Intervenant · ${l.formation}${l.recrute ? " · recrute" : ""}`)}`,
    "END:VCARD",
  ].filter(Boolean);
  const fichier = [l.prenom, l.nom].join("-").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9-]+/g, "") || "intervenant";
  return new Response(lignes.join("\r\n") + "\r\n", { headers: { "Content-Type": "text/vcard; charset=utf-8", "Content-Disposition": `inline; filename="${fichier}.vcf"`, "Cache-Control": "no-store" } });
}

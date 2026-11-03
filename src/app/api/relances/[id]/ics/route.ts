import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estAdmin } from "@/lib/auth";
import { ecoleDuResponsable } from "@/lib/ecoles";
import { echeance } from "@/lib/echanges";

// Fichier agenda (.ics) pour ajouter une relance à Google Agenda, Outlook ou l'iPhone.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user?.email || !(estAdmin(user.email) || (await ecoleDuResponsable(user.email)))) return new NextResponse("Accès réservé", { status: 403 });
  const { data: e } = await createAdminClient().from("echanges").select("id, candidat_id, action, action_a, action_le, candidats(nom)").eq("id", id).maybeSingle();
  const debut = e && echeance(e);
  if (!e || !debut) return new NextResponse("Relance introuvable", { status: 404 });
  const fin = new Date(debut.getTime() + 15 * 60000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const nom = (e.candidats as unknown as { nom: string } | null)?.nom ?? "candidat";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MagnusJob//Relances//FR", "BEGIN:VEVENT",
    `UID:${e.id}@magnusjob`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(debut)}`, `DTEND:${f(fin)}`,
    `SUMMARY:${esc(`MagnusJob – ${nom} : ${e.action}`)}`,
    `DESCRIPTION:${esc(`${e.action}\n${site}/admin/candidats/${e.candidat_id}?onglet=echanges`)}`,
    "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.action)}`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return new NextResponse(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="relance-${nom.replace(/\W+/g, "-")}.ics"` },
  });
}

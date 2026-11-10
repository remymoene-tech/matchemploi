import ExcelJS from "exceljs";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { droitsDe } from "@/lib/equipe";
import { lignesExport, typesPermis, type TypeExport } from "@/lib/export";

export const maxDuration = 60;

/** Fichier Excel « à la carte » (administrateur uniquement). */
export async function GET(req: NextRequest) {
  const { data: { user } } = await (await createClient()).auth.getUser();
  const permis = typesPermis(user ? await droitsDe(user.email) : null);
  const p = req.nextUrl.searchParams;
  const type = p.get("type") as TypeExport;
  if (!user || !permis.includes(type)) return new NextResponse("Accès réservé", { status: 403 });
  const filtres = Object.fromEntries(["statut", "formation", "rentree", "classe", "promo", "specialite", "admission"].map((k) => [k, p.get(k) || undefined]));
  const { titres, lignes } = await lignesExport(type, filtres, p.getAll("col"));

  const classeur = new ExcelJS.Workbook();
  classeur.creator = "MagnusMatch";
  const nom = { leads: "Leads", candidats: "Candidats", alumni: "Alumni", entreprises: "Entreprises", intervenants: "Intervenants" }[type];
  const feuille = classeur.addWorksheet(nom);
  feuille.addRow(titres);
  for (const l of lignes) feuille.addRow(l);
  feuille.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  feuille.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF56664B" } };
  feuille.views = [{ state: "frozen", ySplit: 1 }];
  if (titres.length) feuille.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: titres.length } };
  titres.forEach((t, i) => {
    const largeur = Math.max(t.length, ...lignes.slice(0, 200).map((l) => String(l[i] ?? "").length));
    feuille.getColumn(i + 1).width = Math.min(45, Math.max(10, largeur + 2));
  });

  const tampon = await classeur.xlsx.writeBuffer();
  const jour = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  return new Response(tampon, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${type}-${jour}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

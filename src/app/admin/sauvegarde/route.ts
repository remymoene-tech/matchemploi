import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { estSuperAdmin } from "@/lib/equipe";
import { toutLire } from "@/lib/tout-lire";

export const maxDuration = 120;

/** Tables sauvegardées (une feuille Excel chacune) et colonne de tri. */
const TABLES: { table: string; feuille: string; tri: string }[] = [
  { table: "leads", feuille: "Leads", tri: "created_at" },
  { table: "candidats", feuille: "Candidats", tri: "user_id" },
  { table: "entreprises", feuille: "Entreprises", tri: "nom" },
  { table: "echanges", feuille: "Échanges", tri: "date_echange" },
  { table: "offres", feuille: "Offres", tri: "created_at" },
  { table: "prospections", feuille: "Prospections", tri: "created_at" },
  { table: "entretiens_conseil", feuille: "Entretiens", tri: "date_entretien" },
  { table: "evenements", feuille: "Événements", tri: "date" },
  { table: "classes", feuille: "Classes", tri: "nom" },
  { table: "ecoles", feuille: "Écoles", tri: "nom" },
  { table: "equipe", feuille: "Équipe", tri: "email" },
];

/** Colonnes techniques qu'on ne met pas dans le fichier (liens secrets, textes très longs). */
const EXCLUES = new Set(["jeton_besoin", "carte_jeton", "cv_texte", "cv_conseils", "cv_ameliore", "linkedin_analyse", "fiche"]);

const cellule = (v: unknown) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : v);

/** 💾 Sauvegarde Excel de toutes les données (administrateur uniquement). */
export async function GET() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user || !estSuperAdmin(user.email)) return new NextResponse("Réservé à l'administrateur", { status: 403 });
  const db = createAdminClient();
  const classeur = new ExcelJS.Workbook();
  classeur.creator = "MagnusMatch";
  classeur.created = new Date();
  const resume = classeur.addWorksheet("Sommaire");
  resume.addRow(["Sauvegarde MagnusMatch", new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })]);
  resume.addRow([]);
  resume.addRow(["Feuille", "Lignes"]);

  for (const t of TABLES) {
    const { data, error } = await toutLire<Record<string, unknown>>((de, a) => db.from(t.table).select("*").order(t.tri).range(de, a));
    if (error || !data) { resume.addRow([t.feuille, "non disponible"]); continue; }
    const feuille = classeur.addWorksheet(t.feuille);
    const colonnes = [...new Set(data.flatMap((l) => Object.keys(l)))].filter((c) => !EXCLUES.has(c));
    feuille.columns = colonnes.map((c) => ({ header: c, key: c, width: Math.min(40, Math.max(12, c.length + 2)) }));
    for (const l of data) feuille.addRow(Object.fromEntries(colonnes.map((c) => [c, cellule(l[c])])));
    feuille.getRow(1).font = { bold: true };
    feuille.views = [{ state: "frozen", ySplit: 1 }];
    resume.addRow([t.feuille, data.length]);
  }
  resume.getColumn(1).width = 24;
  resume.getColumn(2).width = 22;

  const tampon = await classeur.xlsx.writeBuffer();
  const jour = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  return new Response(tampon, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sauvegarde-magnusmatch-${jour}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

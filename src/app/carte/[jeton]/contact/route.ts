import { candidatParCarte, vcard } from "@/lib/carte";

export const dynamic = "force-dynamic";

/** Fiche contact (.vcf) : sur iPhone, Safari propose directement « Créer un nouveau contact ». */
export async function GET(_req: Request, { params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const c = await candidatParCarte(jeton);
  if (!c) return new Response("Carte introuvable", { status: 404 });
  const fichier = (c.nom || "contact").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "contact";
  return new Response(vcard(c), {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `inline; filename="${fichier}.vcf"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

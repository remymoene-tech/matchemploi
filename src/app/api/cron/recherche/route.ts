import { rappelsAnnuelsAlumni } from "@/lib/alumni-serveur";
import { NextResponse, type NextRequest } from "next/server";
import { rechercheQuotidienne } from "@/lib/matching";
import { rappelsEntretiensAdmission } from "@/lib/leads";
import { lireFrequence, rechercheAujourdhui } from "@/lib/reglages";

export const maxDuration = 300;

// Appelée chaque matin par Vercel (voir vercel.json). Cherche selon la fréquence choisie dans l'admin.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  // Rappels par email la veille des entretiens d'admission : tous les matins
  const rappels = await rappelsEntretiensAdmission().catch(() => 0);
  // Une fois par an, « Où en es-tu ? » aux alumni
  await rappelsAnnuelsAlumni().catch(() => 0);
  const { frequence } = await lireFrequence();
  if (!rechercheAujourdhui(frequence)) return NextResponse.json({ ignore: true, frequence, rappels_entretiens: rappels });
  return NextResponse.json({ ...(await rechercheQuotidienne()), rappels_entretiens: rappels });
}

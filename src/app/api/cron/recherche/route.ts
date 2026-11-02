import { NextResponse, type NextRequest } from "next/server";
import { rechercheQuotidienne } from "@/lib/matching";
import { lireFrequence, rechercheAujourdhui } from "@/lib/reglages";

export const maxDuration = 300;

// Appelée chaque matin par Vercel (voir vercel.json). Cherche selon la fréquence choisie dans l'admin.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  const { frequence } = await lireFrequence();
  if (!rechercheAujourdhui(frequence)) return NextResponse.json({ ignore: true, frequence });
  return NextResponse.json(await rechercheQuotidienne());
}

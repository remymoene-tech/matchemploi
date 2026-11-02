import { NextResponse, type NextRequest } from "next/server";
import { rechercheQuotidienne } from "@/lib/matching";

export const maxDuration = 300;

// Appelée chaque matin par Vercel (voir vercel.json) pour relancer toutes les recherches.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Non autorisé", { status: 401 });
  }
  return NextResponse.json(await rechercheQuotidienne());
}

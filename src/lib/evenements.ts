import "server-only";
import { randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { createAdminClient } from "@/lib/supabase/admin";

/** Événements (JPO, salons…) : un QR code mène au formulaire brochure, les leads arrivent avec l'événement comme origine. */
export type Evenement = { id: string; nom: string; date: string; lieu: string; code: string; created_at: string };

export const nouveauCode = () => randomBytes(6).toString("base64url").replace(/[-_]/g, "x").slice(0, 8).toUpperCase();

export async function listeEvenements(): Promise<Evenement[] | null> {
  const { data, error } = await createAdminClient().from("evenements").select("*").order("date", { ascending: false });
  return error ? null : ((data ?? []) as Evenement[]);
}

export async function evenementParCode(code: string): Promise<Evenement | null> {
  if (!/^[A-Za-z0-9]{4,16}$/.test(code)) return null;
  const { data } = await createAdminClient().from("evenements").select("*").eq("code", code.toUpperCase()).maybeSingle();
  return (data as Evenement) ?? null;
}

export async function evenementParId(id: string): Promise<Evenement | null> {
  const { data } = await createAdminClient().from("evenements").select("*").eq("id", id).maybeSingle();
  return (data as Evenement) ?? null;
}

export const lienEvenement = (e: Pick<Evenement, "code">) => `${process.env.NEXT_PUBLIC_SITE_URL || "https://magnusmatch.vercel.app"}/brochure?evenement=${e.code}`;

/** QR code (image SVG en data URL) vers le formulaire de l'événement. */
export async function qrEvenement(e: Pick<Evenement, "code">, taille = 600) {
  return QRCode.toDataURL(lienEvenement(e), { width: taille, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } });
}

export const dateEvenementTexte = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lireParcours, posteChez } from "@/lib/alumni";
import { candidatParCarte, compterVue, formationCarte, initiales, intituleFormation, optionsCarte } from "@/lib/carte";

export const dynamic = "force-dynamic";
export const metadata = { title: "Carte de visite · Campus Magnus", robots: { index: false, follow: false } };

const TRAITS = ["var(--rose)", "var(--jaune)", "var(--sauge)", "var(--bleu)"];

/** Carte de visite publique d'un candidat admis (ouverte en scannant son QR code). */
export default async function Carte({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const c = await candidatParCarte(jeton);
  if (!c) notFound();
  const o = optionsCarte(c);
  const ua = (await headers()).get("user-agent") ?? "";
  const navigateurIntegre = /Instagram|FBAN|FBAV|LinkedInApp|Snapchat|TikTok|Line\//i.test(ua);
  // On ne compte pas les visites du candidat lui-même (aperçu de sa propre carte)
  let moi: string | null = null;
  try { moi = (await (await createClient()).auth.getUser()).data.user?.id ?? null; } catch { moi = null; }
  if (moi !== c.user_id) after(() => compterVue(c).catch(() => {}));

  const formation = formationCarte(c);
  const intitule = intituleFormation(c);
  const tel = o.tel && c.telephone ? c.telephone : "";
  const linkedin = o.linkedin && c.linkedin_url ? c.linkedin_url : "";

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
      <div className="relative bg-[#111] px-5 pb-14 pt-7 text-center text-white">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-[#c3cdb8]">{c.formation === "EGC" ? "EGC Business School · " : ""}Campus Magnus</p>
        <div className="mx-auto mt-2.5 flex h-[3px] w-28 gap-1.5" aria-hidden>{TRAITS.map((t) => <span key={t} className="flex-1 rounded-full" style={{ background: t }} />)}</div>
        <div className="absolute bottom-0 left-1/2 grid h-24 w-24 -translate-x-1/2 translate-y-1/2 place-items-center rounded-full border-4 border-surface font-display text-3xl font-medium text-[#111]" style={{ background: "var(--sauge)" }} aria-hidden>
          {initiales(c.nom)}
        </div>
      </div>
      <div className="flex flex-col gap-3 px-5 pb-6 pt-16 text-center">
        <div>
          <h1 className="text-2xl font-semibold">{c.nom || c.email}</h1>
          {formation && <p className="mt-1 text-xs font-semibold uppercase tracking-[.1em] text-muted">{formation}</p>}
          {intitule && c.formation !== "EGC" && !formation.includes(intitule) && <p className="text-xs text-muted">{intitule}</p>}
          {c.statut_admission === "alumni" && posteChez(lireParcours((c as { parcours?: unknown }).parcours)) && (
            <p className="mt-2 text-sm font-medium">💼 {posteChez(lireParcours((c as { parcours?: unknown }).parcours))}</p>
          )}
        </div>
        {o.recherche && <p className="whitespace-pre-line rounded-xl px-3 py-2.5 text-sm font-medium" style={{ background: "var(--jaune)", color: "#111" }}>🔎 {o.recherche}</p>}
        <div className="flex flex-col gap-2 text-left text-sm">
          {tel && <a href={`tel:${tel.replace(/[^\d+]/g, "")}`} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 hover:border-ink"><span aria-hidden>📞</span>{tel}</a>}
          {o.email && <a href={`mailto:${c.email}`} className="flex items-center gap-3 break-all rounded-xl border border-line px-4 py-3 hover:border-ink"><span aria-hidden>✉️</span>{c.email}</a>}
          {linkedin && <a href={linkedin} target="_blank" rel="noopener" className="flex items-center gap-3 break-all rounded-xl border border-line px-4 py-3 hover:border-ink"><span aria-hidden>💼</span>{linkedin.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</a>}
        </div>
        <a href={`/carte/${jeton}/contact`} className="btn btn-primary w-full justify-center py-3 text-base">👤 Ajouter à mes contacts</a>
        {navigateurIntegre && (
          <p className="rounded-xl bg-warn-soft p-3 text-xs text-warn">Si rien ne se passe, ouvre cette page dans Safari ou Chrome (menu ⋯ puis « Ouvrir dans le navigateur »).</p>
        )}
        <p className="pt-1 text-[10px] uppercase tracking-[.12em] text-muted">MagnusMatch · Campus Magnus, Arles</p>
      </div>
    </div>
  );
}

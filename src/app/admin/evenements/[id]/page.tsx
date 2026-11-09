import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dateEvenementTexte, evenementParId, lienEvenement, qrEvenement } from "@/lib/evenements";
import { nomLead, statutLead, type Lead } from "@/lib/leads";
import { BoutonImprimer } from "@/components/BoutonFiche";
import { Copier } from "@/components/Copier";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Événement · MagnusMatch" };

/** Affiche à imprimer (QR code) et leads de l'événement. */
export default async function PageEvenement({ params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin();
  const { id } = await params;
  const e = await evenementParId(id);
  if (!e) notFound();
  const qr = await qrEvenement(e, 900);
  const lien = lienEvenement(e);
  const { data } = await createAdminClient().from("leads").select("*").eq("evenement_id", e.id).order("created_at", { ascending: false });
  const leads = (data ?? []) as Lead[];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/admin?vue=evenements" className="text-sm text-muted">← Événements</Link>
        <div className="flex flex-wrap gap-2">
          <a href={qr} download={`QR-${e.nom.replace(/\W+/g, "-")}.png`} className="btn btn-sm">⬇️ Télécharger le QR code</a>
          <BoutonImprimer libelle="🖨️ Imprimer l'affiche" />
        </div>
      </div>

      {/* Affiche A4 */}
      <article className="cv-papier mx-auto flex w-full max-w-[640px] flex-col items-center gap-6 bg-white p-10 text-center text-[#111] shadow-sm print:shadow-none">
        <Logo taille="lg" />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[.16em]" style={{ color: "#5e6358" }}>{e.nom}</p>
          <p className="text-sm" style={{ color: "#5e6358" }}>{dateEvenementTexte(e.date)}{e.lieu ? ` · ${e.lieu}` : ""}</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt={`QR code vers le formulaire de l'événement ${e.nom}`} className="h-auto w-[340px] max-w-full" />
        <p className="text-base">Formations EGC · GUC · AMLHR — Campus Magnus, Arles</p>
        <p className="text-xs" style={{ color: "#5e6358" }}>Ou rendez-vous sur : {lien.replace(/^https?:\/\//, "")}</p>
      </article>

      <section className="card flex flex-col gap-3 p-5 print:hidden">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <b>🔗 Lien du formulaire :</b>
          <code className="break-all rounded-lg bg-bg px-3 py-1.5 font-mono text-xs">{lien}</code>
          <Copier texte={lien} />
        </div>
        <h2 className="text-lg font-semibold">🧲 Leads de l&apos;événement ({leads.length})</h2>
        {!leads.length && <p className="text-sm text-muted">Pas encore de lead : ils apparaîtront ici dès que les visiteurs auront rempli le formulaire.</p>}
        <ul className="flex flex-col divide-y divide-line">
          {leads.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <Link href={`/admin/leads/${l.id}`} className="font-semibold hover:text-accent hover:underline">🧲 {nomLead(l)}</Link>
              <span className="text-muted">{[l.formation, l.annee_rentree && `rentrée ${l.annee_rentree}`, statutLead(l.statut).label].filter(Boolean).join(" · ")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BoutonImprimer } from "@/components/BoutonFiche";
import { Logo } from "@/components/Logo";
import { contratLabel, type Offre } from "@/lib/types";

export const metadata = { title: "Fiche de poste · MagnusMatch" };

/** Fiche de poste professionnelle, prête à imprimer ou à enregistrer en PDF. */
export default async function FicheDePoste({ params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin();
  const { id } = await params;
  const db = createAdminClient();
  const { data } = await db.from("offres").select("*").eq("id", id).maybeSingle();
  const o = data as Offre | null;
  if (!o) notFound();
  const { data: e } = o.entreprise_id ? await db.from("entreprises").select("*").eq("id", o.entreprise_id).maybeSingle() : { data: null };
  const ent = e as { id: string; nom: string; secteur: string; ville: string; site: string; logo_url?: string | null } | null;
  const f = o.fiche;
  const titre = (t: string) => <h2 className="mb-2 border-b pb-1 text-xs font-bold uppercase tracking-[.14em]" style={{ color: "#56664b", borderColor: "#dfe4d8" }}>{t}</h2>;
  const puces = (l: string[]) => <ul className="flex flex-col gap-1.5">{l.map((x) => <li key={x} className="flex gap-2"><span style={{ color: "#aebaa2" }}>■</span><span>{x}</span></li>)}</ul>;
  const aConfirmer = f ? [...f.conditions.filter((c) => /confirmer/i.test(c.valeur)).map((c) => c.libelle)] : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto flex w-full max-w-[820px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={ent ? `/admin/entreprises/${ent.id}?onglet=offres` : `/admin/offres/${o.id}`} className="text-sm text-muted">← Retour</Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/offres/${o.id}`} className="btn btn-sm">✏️ Modifier le texte</Link>
          <BoutonImprimer libelle="Imprimer ou enregistrer en PDF" />
        </div>
      </div>
      {!!aConfirmer.length && (
        <p className="mx-auto w-full max-w-[820px] rounded-xl bg-warn-soft p-4 text-sm print:hidden">
          <b>À confirmer avec l&apos;entreprise avant de diffuser :</b> {aConfirmer.join(" · ")}
        </p>
      )}

      <article className="cv-papier mx-auto flex w-full max-w-[820px] flex-col gap-6 bg-white p-10 text-[14px] text-[#111] shadow-sm print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-4 pb-6" style={{ borderColor: "#aebaa2" }}>
          <div className="flex min-w-0 items-center gap-4">
            {ent?.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ent.logo_url} alt={`Logo ${ent.nom}`} className="h-16 w-16 shrink-0 rounded-xl border object-contain p-1" style={{ borderColor: "#e1e4dc" }} />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[.16em]" style={{ color: "#5e6358" }}>{ent?.nom ?? o.entreprise}{ent?.secteur ? ` · ${ent.secteur}` : ""}</p>
              <h1 className="text-[28px] font-semibold leading-tight">{o.intitule}</h1>
              <p className="mt-1 text-sm" style={{ color: "#5e6358" }}>{[o.contrat_libelle || contratLabel(o.contrat), o.lieu || ent?.ville].filter(Boolean).join(" · ")}</p>
            </div>
          </div>
          <div className="shrink-0"><Logo /></div>
        </header>

        {f ? (
          <>
            <p className="text-[15px] leading-relaxed">{f.accroche}</p>
            <div className="grid gap-6 md:grid-cols-[1.6fr_1fr] print:grid-cols-[1.6fr_1fr]">
              <div className="flex flex-col gap-6">
                <section>{titre("Vos missions")}{puces(f.missions)}</section>
                <section>{titre("Profil recherché")}{puces(f.profil)}</section>
                <section>{titre("Savoir-être")}{puces(f.savoir_etre)}</section>
              </div>
              <aside className="flex flex-col gap-6">
                <section className="rounded-xl p-4" style={{ background: "#f1f3ee" }}>
                  {titre("Conditions")}
                  <dl className="flex flex-col gap-2">
                    {f.conditions.map((c) => (
                      <div key={c.libelle}><dt className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#5e6358" }}>{c.libelle}</dt><dd>{c.valeur}</dd></div>
                    ))}
                  </dl>
                </section>
                {!!f.avantages.length && <section>{titre("Ce que nous offrons")}{puces(f.avantages)}</section>}
              </aside>
            </div>
          </>
        ) : (
          o.description?.trim()
            ? <p className="whitespace-pre-line">{o.description}</p>
            : <p className="rounded-xl bg-warn-soft p-4 text-sm print:hidden">Cette fiche est vide : retourne sur l&apos;offre et clique sur « 📄 Générer la fiche de poste ».</p>
        )}

        <footer className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs" style={{ borderColor: "#e1e4dc", color: "#5e6358" }}>
          <span>Candidatures via l&apos;école <b style={{ color: "#111" }}>Magnus Campus</b>{process.env.NEXT_PUBLIC_CONTACT_EMAIL ? ` · ${process.env.NEXT_PUBLIC_CONTACT_EMAIL}` : ""}</span>
          <span>Fiche de poste réalisée avec MagnusMatch</span>
        </footer>
      </article>
    </div>
  );
}

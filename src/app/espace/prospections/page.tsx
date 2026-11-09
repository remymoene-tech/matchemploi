import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import { echeance, maintenantMs } from "@/lib/echanges";
import { RECRUTE, TYPES_PROSPECTION, echangesDeProspections, prospectionsDe } from "@/lib/prospections";
import { FormProspection } from "@/components/FormProspection";
import { OngletsEspace } from "@/components/OngletsEspace";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Mes prospections · MagnusMatch" };

export default async function MesProspections({ searchParams }: { searchParams: Promise<{ ajouter?: string }> }) {
  const { ajouter } = await searchParams;
  const { user } = await exigerUtilisateur();
  const liste = await prospectionsDe(user.id);
  const echanges = await echangesDeProspections((liste ?? []).map((p) => p.id));
  const maintenant = maintenantMs();
  const oui = (liste ?? []).filter((p) => p.recrute === "oui").length;
  const { data: moi } = await createAdminClient().from("candidats").select("statut_admission").eq("user_id", user.id).maybeSingle();
  const alumni = moi?.statut_admission === "alumni";

  return (
    <div className="flex flex-col gap-5">
      <OngletsEspace actif="prospections" alumni={alumni} sousProspections={`${liste?.length ?? 0} entreprise${(liste?.length ?? 0) > 1 ? "s" : ""}`} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold">🚪 Mes prospections</h1>
          <p className="text-muted">Les entreprises que tu as contactées toi-même : visites, appels, emails. Note tout et programme tes relances.</p>
        </div>
        {!ajouter && <Link href="/espace/prospections?ajouter=1" className="btn btn-primary">➕ Ajouter une entreprise</Link>}
      </div>

      {liste === null && <p className="rounded-xl bg-warn-soft p-4 text-sm">Cette fonction n&apos;est pas encore activée : ton conseiller doit faire une mise à jour du site.</p>}

      {ajouter && (
        <section className="card flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">➕ Nouvelle entreprise prospectée</h2>
            <Link href="/espace/prospections" className="text-sm text-muted">Annuler</Link>
          </div>
          <FormProspection />
        </section>
      )}

      {!!liste?.length && (
        <section className="grid grid-cols-3 gap-3">
          {[["🏢 Entreprises", liste.length], ["✅ Recrutent", oui], ["💬 Contacts notés", echanges.length]].map(([l, v]) => (
            <div key={l} className="card flex flex-col p-4"><span className="eyebrow">{l}</span><b className="text-3xl font-semibold tabular-nums">{v}</b></div>
          ))}
        </section>
      )}

      {liste && !liste.length && !ajouter && (
        <p className="card border-dashed p-6 text-sm text-muted">Tu n&apos;as pas encore noté d&apos;entreprise. Après chaque visite, appel ou email, ajoute-la ici : tu garderas tout ton historique et tu recevras tes rappels.</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {(liste ?? []).map((p) => {
          const r = RECRUTE.find((x) => x.id === p.recrute);
          const ech = echanges.filter((e) => e.prospection_id === p.id);
          const dernier = ech[0];
          const t = TYPES_PROSPECTION.find((x) => x.id === dernier?.type);
          const rappel = ech.filter((e) => e.action && !e.action_faite).map((e) => echeance(e)).filter((d): d is Date => !!d).sort((a, b) => +a - +b)[0];
          return (
            <Link key={p.id} href={`/espace/prospections/${p.id}`} className="card flex flex-col gap-2 p-5 transition-colors hover:border-accent">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">🏢 {p.entreprise}</h2>
                  <p className="text-sm text-muted">{[p.ville, p.contact_nom].filter(Boolean).join(" · ") || "—"}</p>
                </div>
                {r && <span className={`chip shrink-0 ${r.chip}`}>{r.icone} {r.label}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {dernier && <span className="chip">{t?.icone} {new Date(dernier.date_echange).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}</span>}
                <span className="chip">💬 {ech.length} contact{ech.length > 1 ? "s" : ""}</span>
                {p.entretien_a && +new Date(p.entretien_a) > maintenant - 3 * 3600e3 && (
                  <span className="chip chip-plus">🤝 Entretien {new Date(p.entretien_a).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</span>
                )}
                {rappel && <span className={`chip ${+rappel <= maintenant ? "chip-minus" : "chip-tag"}`}>⏰ {rappel.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

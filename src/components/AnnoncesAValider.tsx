import Link from "next/link";
import type { Offre } from "@/lib/types";

type Annonce = Offre & { validation?: string | null };

/** Annonces déposées par des alumni, en attente de la validation du responsable. */
export function AnnoncesAValider({ offres, valider, refuser, retour }: { offres: Annonce[]; valider: (f: FormData) => Promise<void>; refuser: (f: FormData) => Promise<void>; retour: string }) {
  const liste = offres.filter((o) => o.source === "alumni" && o.validation === "a_valider");
  if (!liste.length) return null;
  return (
    <section className="flex flex-col gap-3 rounded-2xl border-2 p-4" style={{ borderColor: "var(--jaune)", background: "color-mix(in srgb, var(--jaune) 18%, var(--surface))" }}>
      <h2 className="text-lg font-semibold">📝 {liste.length} annonce{liste.length > 1 ? "s" : ""} d&apos;alumni à valider</h2>
      <p className="text-sm text-muted">Une fois validée, l&apos;annonce est proposée aux étudiants admis qui correspondent (pas aux alumni).</p>
      {liste.map((o) => (
        <article key={o.id} className="card flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">{o.intitule}</p>
              <p className="text-sm text-muted">{[o.entreprise, o.contrat_libelle, o.lieu].filter(Boolean).join(" · ")}</p>
              <p className="text-xs text-muted">🎓 Déposée par {o.contact_nom || o.contact_email}{o.contact_email ? ` (${o.contact_email})` : ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={valider}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="retour" value={retour} /><button className="btn btn-sm btn-primary">✅ Valider et publier</button></form>
              <Link href={`/admin/offres/${o.id}`} className="btn btn-sm">✏️ Modifier</Link>
              <form action={refuser}><input type="hidden" name="id" value={o.id} /><input type="hidden" name="retour" value={retour} /><button className="btn btn-sm btn-ghost text-bad">Refuser</button></form>
            </div>
          </div>
          <p className="line-clamp-4 whitespace-pre-line text-sm">{o.description}</p>
        </article>
      ))}
    </section>
  );
}

import Link from "next/link";
import { nomLead, type Lead } from "@/lib/leads";
import { nomPersonne, type Personne } from "@/lib/equipe";

/** Carnet d'adresses des intervenants (questionnaire /intervenant). Ne compte dans aucun chiffre du recrutement. */
export function VueIntervenants({ contacts, personnes, q }: { contacts: Lead[]; personnes: Personne[]; q?: string }) {
  const cherche = (q ?? "").trim().toLowerCase();
  const liste = contacts.filter((c) => !cherche || [c.prenom, c.nom, c.email, c.formation, c.message].some((x) => (x ?? "").toLowerCase().includes(cherche)));
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://magnusmatch.vercel.app";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">🧑‍🏫 Intervenants</h2>
          <p className="text-sm text-muted">Le carnet d&apos;adresses des intervenants. Ils arrivent par le questionnaire « Devenir intervenant » ({site.replace(/^https?:\/\//, "")}/intervenant). Ils ne comptent dans aucun chiffre du recrutement.</p>
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="vue" value="intervenants" />
          <input className="input py-1.5" name="q" defaultValue={q ?? ""} placeholder="🔎 Nom, matière…" />
          <button className="btn btn-sm">Chercher</button>
        </form>
      </div>
      {liste.length === 0 ? (
        <p className="card border-dashed p-6 text-sm text-muted">{contacts.length ? "Aucun intervenant ne correspond." : "Pas encore d'intervenant. Partage le lien du questionnaire : il est aussi en haut du formulaire brochure."}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {liste.map((c) => (
            <article key={c.id} className="card flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/admin/leads/${c.id}`} className="text-lg font-semibold hover:text-accent hover:underline">{nomLead(c)}</Link>
                  <p className="text-sm font-medium text-accent">{c.formation}</p>
                </div>
                <span className="text-xs text-muted">{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" })}</span>
              </div>
              <p className="text-sm">
                <a href={`mailto:${c.email}`} className="text-accent underline">✉️ {c.email}</a>
                {c.telephone && <> · <a href={`tel:${c.telephone.replace(/\s/g, "")}`} className="text-accent underline">📞 {c.telephone}</a></>}
              </p>
              {c.message && <p className="line-clamp-3 whitespace-pre-line text-sm text-muted">{c.message}</p>}
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                {c.cv_chemin && <a href={`/admin/intervenants/cv/${c.id}`} target="_blank" className="btn btn-sm btn-primary">📄 Voir le CV</a>}
                <Link href={`/admin/leads/${c.id}?onglet=echanges`} className="btn btn-sm">💬 Échanges</Link>
                {c.attribue_a && <span className="chip text-xs">👤 {nomPersonne(personnes.find((p) => p.email === c.attribue_a), c.attribue_a)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

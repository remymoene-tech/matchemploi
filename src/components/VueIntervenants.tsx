import Link from "next/link";
import { nomLead, type Lead } from "@/lib/leads";
import { SITUATIONS_INTERVENANT, SPECIALITES, specialitesDe } from "@/lib/intervenants";
import { nomPersonne, type Personne } from "@/lib/equipe";

/** « Autre » : au moins une spécialité hors de la liste (ex. kiné), ou aucune spécialité. */
const estAutre = (c: Lead) => { const s = specialitesDe(c.formation); return !s.length || s.some((x) => !(SPECIALITES as readonly string[]).includes(x)); };

/** Carnet d'adresses des intervenants (questionnaire /intervenant). Ne compte dans aucun chiffre du recrutement. */
export function VueIntervenants({ contacts, personnes, q, specialite }: { contacts: Lead[]; personnes: Personne[]; q?: string; specialite?: string }) {
  const cherche = (q ?? "").trim().toLowerCase();
  const liste = contacts
    .filter((c) => !cherche || [c.prenom, c.nom, c.email, c.formation, c.message, c.entreprise].some((x) => (x ?? "").toLowerCase().includes(cherche)))
    .filter((c) => !specialite || (specialite === "Autre" ? estAutre(c) : specialitesDe(c.formation).includes(specialite)));
  const nb = (x: string) => contacts.filter((c) => (x === "Autre" ? estAutre(c) : specialitesDe(c.formation).includes(x))).length;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://magnusmatch.vercel.app";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">🧑‍🏫 Intervenants</h2>
          <p className="text-sm text-muted">Le carnet d&apos;adresses des intervenants, réservé au directeur campus et aux personnes qui ont l&apos;accès « Intervenants » (d&apos;habitude la pédagogie). Ils arrivent par le questionnaire « Devenir intervenant » ({site.replace(/^https?:\/\//, "")}/intervenant). Ils ne comptent dans aucun chiffre du recrutement.</p>
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="vue" value="intervenants" />
          <input className="input py-1.5" name="q" defaultValue={q ?? ""} placeholder="🔎 Nom, spécialité…" />
          <button className="btn btn-sm">Chercher</button>
        </form>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Spécialités">
        <Link href="/admin?vue=intervenants" className={`rounded-full border px-3 py-1 ${!specialite ? "border-accent bg-accent-soft font-semibold" : "border-line text-muted hover:text-ink"}`}>Toutes ({contacts.length})</Link>
        {[...SPECIALITES, "Autre"].map((x) => (
          <Link key={x} href={`/admin?vue=intervenants&specialite=${encodeURIComponent(x)}`} className={`rounded-full border px-3 py-1 ${specialite === x ? "border-accent bg-accent-soft font-semibold" : "border-line text-muted hover:text-ink"}`}>{x} ({nb(x)})</Link>
        ))}
      </nav>
      {liste.length === 0 ? (
        <p className="card border-dashed p-6 text-sm text-muted">{contacts.length ? "Aucun intervenant ne correspond." : "Pas encore d'intervenant. Partage le lien du questionnaire : il est aussi en haut du formulaire brochure."}</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {liste.map((c) => (
            <article key={c.id} className="card flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/admin/leads/${c.id}`} className="text-lg font-semibold hover:text-accent hover:underline">{nomLead(c)}</Link>
                  <div className="mt-1 flex flex-wrap gap-1">{specialitesDe(c.formation).map((x) => <span key={x} className="chip chip-tag text-xs">🎯 {x}</span>)}</div>
                  {(c.entreprise || c.situation) && <p className="text-xs text-muted">💼 {[c.situation && SITUATIONS_INTERVENANT[c.situation], c.entreprise].filter(Boolean).join(" · ")}</p>}
                  {c.recrute && (c.entreprise_id
                    ? <Link href={`/admin/entreprises/${c.entreprise_id}`} className="chip chip-plus mt-1 text-xs">🧑‍💼 Recrute → fiche entreprise</Link>
                    : <span className="chip chip-plus mt-1 text-xs">🧑‍💼 Recrute</span>)}
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
                <a href={`/admin/intervenants/contact/${c.id}`} className="btn btn-sm">👤 Ajouter à mes contacts</a>
                <Link href={`/admin/intervenants/${c.id}/fiche`} className="btn btn-sm">✏️ Fiche</Link>
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

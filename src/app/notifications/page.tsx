import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerUtilisateur, estEquipe } from "@/lib/auth";
import { ecoleDuResponsable } from "@/lib/ecoles";
import { historiqueEquipe, historiqueEtudiant } from "@/lib/notifications";

export const metadata = { title: "Historique des notifications · MagnusMatch" };

/** Toutes les notifications passées de la personne connectée (équipe ou étudiant). */
export default async function Notifications({ searchParams }: { searchParams: Promise<{ filtre?: string }> }) {
  const { filtre } = await searchParams;
  const { user } = await exigerUtilisateur();
  if (!user.email) redirect("/");
  const admin = await estEquipe(user.email);
  const ecole = admin ? null : await ecoleDuResponsable(user.email);
  const liste = admin || ecole
    ? await historiqueEquipe(user.email, admin ? "/admin/candidats" : "/ecole/etudiants")
    : await historiqueEtudiant(user.id);
  const affichees = filtre === "afaire" ? liste.filter((n) => !n.faite) : filtre === "faites" ? liste.filter((n) => n.faite) : liste;
  const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
  const groupes = new Map<string, typeof affichees>();
  for (const n of affichees) groupes.set(jour(n.quand), [...(groupes.get(jour(n.quand)) ?? []), n]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <span className="eyebrow">🔔 Notifications</span>
        <h1 className="text-3xl font-extrabold">Historique</h1>
        <p className="text-muted">Toutes tes notifications passées, les plus récentes en premier.</p>
      </div>
      <nav className="flex flex-wrap gap-2 text-sm">
        {([["", `Toutes (${liste.length})`], ["afaire", `⏰ À faire (${liste.filter((n) => !n.faite).length})`], ["faites", `✓ Faites (${liste.filter((n) => n.faite).length})`]] as const).map(([id, label]) => (
          <Link key={id} href={`/notifications${id ? `?filtre=${id}` : ""}`} className={`chip ${(filtre ?? "") === id ? "chip-plus" : ""}`}>{label}</Link>
        ))}
      </nav>
      {!affichees.length && <p className="card border-dashed p-6 text-sm text-muted">Aucune notification pour l&apos;instant.</p>}
      {[...groupes.entries()].map(([j, ns]) => (
        <section key={j} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted first-letter:uppercase">{j}</h2>
          <ul className="flex flex-col gap-2">
            {ns.map((n) => (
              <li key={n.id}>
                <Link href={n.lien} className={`card flex flex-wrap items-start justify-between gap-2 p-3 text-sm transition-colors hover:border-accent ${n.faite ? "opacity-70" : ""}`}>
                  <span className="min-w-0"><b>{n.nom}</b><span className="block text-muted">{n.action}</span></span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted">{new Date(n.quand).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</span>
                    <span className={`chip ${n.faite ? "chip-plus" : "chip-minus"}`}>{n.faite ? "✓ Fait" : "À faire"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

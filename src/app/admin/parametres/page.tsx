import Link from "next/link";
import { exigerSuperAdmin } from "@/lib/auth";
import { ACCES, POSTES, POSTE_ADMIN, accesDe, emailsAdmins, listeEquipe, roleEquipe, type Membre } from "@/lib/equipe";
import { ChoixPoste } from "@/components/ChoixPoste";
import { ajouterMembreEquipe, basculerAccesMembre, modifierMembre, supprimerMembre } from "../actions";

export const metadata = { title: "⚙️ Paramètres · MagnusMatch" };

const MESSAGES: Record<string, string> = {
  ajoute: "✅ Accès donné. La personne crée son compte avec cette adresse, puis arrive sur son tableau de bord.",
  modifie: "✅ Poste et accès enregistrés.",
  coupe: "🔒 Accès coupé : la personne ne voit plus le tableau de bord.",
  retabli: "✅ Accès rétabli.",
  supprime: "🗑️ Membre retiré de la liste.",
};

/** Cases à cocher des accès, pré-cochées selon le membre. */
function CasesAcces({ coches }: { coches: string[] }) {
  return (
    <fieldset className="grid gap-2 sm:grid-cols-2">
      <legend className="mb-1 text-sm font-semibold">Ses accès</legend>
      {ACCES.map((x) => (
        <label key={x.id} className="flex items-start gap-2 rounded-lg border border-line bg-surface p-2 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft">
          <input type="checkbox" name="acces" value={x.id} defaultChecked={coches.includes(x.id)} className="mt-1 h-4 w-4" />
          <span><span className="font-semibold">{x.icone} {x.label}</span><span className="block text-xs text-muted">{x.aide}</span></span>
        </label>
      ))}
    </fieldset>
  );
}

const posteDe = (m: Membre) => m.poste || roleEquipe(m.role)?.label || "";

export default async function Parametres({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string; modifier?: string }> }) {
  const sp = await searchParams;
  await exigerSuperAdmin();
  const equipe = await listeEquipe();
  const admins = emailsAdmins();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-ink">← Tableau de bord</Link>
        <h1 className="text-3xl font-extrabold">⚙️ Paramètres</h1>
        <p className="text-muted">Réservé à l&apos;administrateur. Tu choisis le poste et les accès de chaque personne de ton équipe.</p>
      </div>
      {sp.ok && MESSAGES[sp.ok] && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">{MESSAGES[sp.ok]}</p>}
      {sp.erreur === "membre" && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">Indique une adresse email valide.</p>}
      {sp.erreur === "acces" && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">Coche au moins un accès.</p>}
      {sp.erreur === "base" && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">La base n&apos;est pas à jour : exécute la mise à jour SQL de la page /diagnostic.</p>}

      <section className="card flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-xl font-semibold">👥 Mon équipe</h2>
          <p className="text-sm text-muted">Donne l&apos;accès au tableau de bord à ton équipe, avec seulement les parties dont chacun a besoin. Tu peux tout changer ou couper l&apos;accès à tout moment.</p>
        </div>

        {equipe === null ? (
          <p className="rounded-xl bg-warn-soft p-4 text-sm">La gestion de l&apos;équipe n&apos;est pas encore activée : exécute la mise à jour SQL de la page <Link href="/diagnostic" className="underline">/diagnostic</Link> (ligne « Équipe du tableau de bord »).</p>
        ) : (
          <>
            <details className="rounded-xl bg-bg p-4" open={equipe.length === 0}>
              <summary className="cursor-pointer font-semibold">➕ Ajouter une personne</summary>
              <form action={ajouterMembreEquipe} className="mt-4 flex flex-col gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Prénom et nom</span><input className="input" name="nom" placeholder="Ex. Julie Martin" /></label>
                  <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Email <span className="text-bad">*</span></span><input className="input" type="email" name="email" required placeholder="julie.martin@arles.cci.fr" /></label>
                  <ChoixPoste postes={POSTES} />
                </div>
                <CasesAcces coches={["accueil", "leads", "candidats"]} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="prevenir" value="1" defaultChecked className="h-4 w-4" /> Lui envoyer un email avec le lien pour créer son compte</label>
                <button className="btn btn-primary w-fit">➕ Donner l&apos;accès</button>
              </form>
            </details>

            <div className="flex flex-col gap-3">
              {admins.map((x) => (
                <div key={x} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-4">
                  <div><p className="font-semibold">{x}</p><p className="text-sm text-muted">👑 {POSTE_ADMIN} · administrateur · tous les accès · défini dans Vercel (ADMIN_EMAILS)</p></div>
                  <span className="chip chip-plus">Tous les droits</span>
                </div>
              ))}
              {equipe.map((m) => {
                const acces = accesDe(m);
                const enEdition = sp.modifier === m.id;
                return (
                  <div key={m.id} className={`flex flex-col gap-3 rounded-xl border border-line p-4 ${m.actif ? "" : "bg-bg opacity-70"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{m.nom || m.email} {posteDe(m) && <span className="font-normal text-muted">· {posteDe(m)}</span>}</p>
                        {m.nom && <p className="text-xs text-muted">{m.email}</p>}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {ACCES.filter((x) => acces.includes(x.id)).map((x) => <span key={x.id} className="chip text-xs">{x.icone} {x.label}</span>)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {m.actif
                          ? <span className="chip chip-plus">✅ Actif</span>
                          : <span className="chip chip-minus">🔒 Coupé{m.retire_le ? ` le ${new Date(m.retire_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}` : ""}</span>}
                        {!enEdition && <Link href={`/admin/parametres?modifier=${m.id}`} className="btn btn-sm">✏️ Modifier</Link>}
                        <form action={basculerAccesMembre}>
                          <input type="hidden" name="id" value={m.id} /><input type="hidden" name="actif" value={m.actif ? "0" : "1"} />
                          <button className={`btn btn-sm ${m.actif ? "" : "btn-primary"}`}>{m.actif ? "🔒 Couper l'accès" : "🔓 Rétablir l'accès"}</button>
                        </form>
                        {!m.actif && <form action={supprimerMembre}><input type="hidden" name="id" value={m.id} /><button className="btn btn-sm btn-ghost text-bad">Retirer</button></form>}
                      </div>
                    </div>
                    {enEdition && (
                      <form action={modifierMembre} className="flex flex-col gap-3 rounded-xl bg-bg p-4">
                        <input type="hidden" name="id" value={m.id} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Prénom et nom</span><input className="input" name="nom" defaultValue={m.nom} /></label>
                          <ChoixPoste postes={POSTES} actuel={posteDe(m)} />
                        </div>
                        <CasesAcces coches={acces} />
                        <div className="flex gap-2"><button className="btn btn-primary">Enregistrer</button><Link href="/admin/parametres" className="btn btn-ghost">Annuler</Link></div>
                      </form>
                    )}
                  </div>
                );
              })}
              {equipe.length === 0 && <p className="text-sm text-muted">Personne dans l&apos;équipe pour le moment.</p>}
            </div>
          </>
        )}

        <p className="rounded-xl border border-line p-4 text-sm text-muted">
          🔒 <b className="text-ink">Toujours réservé à toi (⚙️)</b> : toutes les suppressions (leads, entreprises, offres, échanges, événements, classes), la sauvegarde, cette page, les écoles et leurs formations, les brochures, la fréquence de recherche, et refaire le QR code d&apos;une carte de visite.
          <br />🔔 <b className="text-ink">Notifications</b> : toute l&apos;équipe reçoit les nouvelles notifications (nouveaux leads, entreprises qui recrutent…). Dès qu&apos;un lead est attribué, seule la personne qui le suit reçoit ses notifications.
        </p>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-xl font-semibold">💾 Sauvegarde</h2>
        <p className="text-sm text-muted">Un fichier Excel avec toutes les données du site : leads, candidats, entreprises, échanges, offres, prospections, entretiens, événements, classes, écoles et équipe (une feuille par sujet). Les CV ne sont pas dedans : ils restent dans Supabase (Storage → cv).</p>
        <div className="flex flex-wrap gap-2">
          <a href="/admin/sauvegarde" className="btn btn-primary w-fit">💾 Télécharger une sauvegarde (Excel)</a>
          <Link href="/admin/export" className="btn w-fit">📤 Export Excel à la carte (filtres, colonnes)</Link>
        </div>
        <p className="text-xs text-muted">Conseil : une fois par semaine, range le fichier dans un dossier sûr (OneDrive de la CCI). Il contient des données personnelles : ne l&apos;envoie pas par email.</p>
      </section>

      <section className="card flex flex-col gap-3 p-6">
        <h2 className="text-xl font-semibold">🛠️ Réglages du site</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link href="/admin?vue=ecoles" className="rounded-xl border border-line p-4 hover:border-ink"><p className="font-semibold">🏫 Écoles et formations</p><p className="text-sm text-muted">Écoles, codes, formations, brochures, responsables</p></Link>
          <Link href="/admin?vue=reglages" className="rounded-xl border border-line p-4 hover:border-ink"><p className="font-semibold">🔄 Recherche d&apos;offres</p><p className="text-sm text-muted">Fréquence de la recherche automatique</p></Link>
          <Link href="/diagnostic" className="rounded-xl border border-line p-4 hover:border-ink"><p className="font-semibold">🩺 Diagnostic</p><p className="text-sm text-muted">État du site et mises à jour SQL</p></Link>
        </div>
      </section>
    </div>
  );
}

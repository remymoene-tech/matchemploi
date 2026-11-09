import Link from "next/link";
import { exigerSuperAdmin } from "@/lib/auth";
import { ROLES_EQUIPE, emailsAdmins, listeEquipe, roleEquipe } from "@/lib/equipe";
import { SelectEnregistrer } from "@/components/SelectEnregistrer";
import { ajouterMembreEquipe, basculerAccesMembre, changerRoleMembre, supprimerMembre } from "../actions";

export const metadata = { title: "⚙️ Paramètres · MagnusMatch" };

const MESSAGES: Record<string, string> = {
  ajoute: "✅ Accès donné. La personne crée son compte avec cette adresse, puis voit « 📊 Tableau de bord ».",
  coupe: "🔒 Accès coupé : la personne ne voit plus le tableau de bord.",
  retabli: "✅ Accès rétabli.",
  role: "✅ Rôle modifié.",
  supprime: "🗑️ Membre retiré de la liste.",
};

export default async function Parametres({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const sp = await searchParams;
  await exigerSuperAdmin();
  const equipe = await listeEquipe();
  const admins = emailsAdmins();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-ink">← Tableau de bord</Link>
        <h1 className="text-3xl font-extrabold">⚙️ Paramètres</h1>
        <p className="text-muted">Réservé à l&apos;administrateur. Ton équipe a accès à tout le tableau de bord, sauf à cette page.</p>
      </div>
      {sp.ok && MESSAGES[sp.ok] && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">{MESSAGES[sp.ok]}</p>}
      {sp.erreur === "membre" && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">Indique une adresse email valide et un rôle.</p>}
      {sp.erreur === "base" && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">La base n&apos;est pas à jour : exécute la mise à jour SQL de la page /diagnostic.</p>}

      <section className="card flex flex-col gap-4 p-6">
        <div>
          <h2 className="text-xl font-semibold">👥 Mon équipe</h2>
          <p className="text-sm text-muted">Donne l&apos;accès au tableau de bord à tes chargé(e)s d&apos;admission et de relations entreprises. Tu peux couper leur accès à tout moment.</p>
        </div>

        {equipe === null ? (
          <p className="rounded-xl bg-warn-soft p-4 text-sm">La gestion de l&apos;équipe n&apos;est pas encore activée : exécute la mise à jour SQL de la page <Link href="/diagnostic" className="underline">/diagnostic</Link> (ligne « Équipe du tableau de bord »).</p>
        ) : (
          <>
            <form action={ajouterMembreEquipe} className="grid gap-3 rounded-xl bg-bg p-4 sm:grid-cols-[1fr_1.3fr_1.2fr_auto] sm:items-end">
              <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Prénom et nom</span><input className="input" name="nom" placeholder="Ex. Julie Martin" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Email <span className="text-bad">*</span></span><input className="input" type="email" name="email" required placeholder="julie.martin@arles.cci.fr" /></label>
              <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Rôle</span>
                <select className="input" name="role" defaultValue="admission">{ROLES_EQUIPE.map((r) => <option key={r.id} value={r.id}>{r.icone} {r.label}</option>)}</select>
              </label>
              <button className="btn btn-primary">➕ Donner l&apos;accès</button>
              <label className="flex items-center gap-2 text-sm sm:col-span-4"><input type="checkbox" name="prevenir" value="1" defaultChecked className="h-4 w-4" /> Lui envoyer un email avec le lien pour créer son compte</label>
            </form>

            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <tr><th className="p-3">Personne</th><th className="p-3">Rôle</th><th className="p-3">Accès</th><th className="p-3" /></tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a} className="border-b border-line">
                      <td className="p-3 font-semibold">{a}</td>
                      <td className="p-3">👑 Administrateur</td>
                      <td className="p-3"><span className="chip chip-plus">Tous les droits</span></td>
                      <td className="p-3 text-xs text-muted">Défini dans Vercel (ADMIN_EMAILS)</td>
                    </tr>
                  ))}
                  {equipe.map((m) => (
                    <tr key={m.id} className={`border-b border-line align-middle last:border-0 ${m.actif ? "" : "opacity-60"}`}>
                      <td className="p-3"><span className="font-semibold">{m.nom || m.email}</span>{m.nom && <div className="text-xs text-muted">{m.email}</div>}</td>
                      <td className="p-3">
                        <form action={changerRoleMembre}>
                          <input type="hidden" name="id" value={m.id} />
                          <SelectEnregistrer name="role" label="Rôle" defaultValue={m.role} options={ROLES_EQUIPE.map((r) => ({ id: r.id, label: `${r.icone} ${r.label}` }))} />
                        </form>
                      </td>
                      <td className="p-3">
                        {m.actif
                          ? <span className="chip chip-plus">✅ Actif</span>
                          : <span className="chip chip-minus">🔒 Coupé{m.retire_le ? ` le ${new Date(m.retire_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" })}` : ""}</span>}
                      </td>
                      <td className="p-3">
                        <span className="flex justify-end gap-2">
                          <form action={basculerAccesMembre}>
                            <input type="hidden" name="id" value={m.id} /><input type="hidden" name="actif" value={m.actif ? "0" : "1"} />
                            <button className={`btn btn-sm ${m.actif ? "" : "btn-primary"}`}>{m.actif ? "🔒 Couper l'accès" : "🔓 Rétablir l'accès"}</button>
                          </form>
                          {!m.actif && <form action={supprimerMembre}><input type="hidden" name="id" value={m.id} /><button className="btn btn-sm btn-ghost text-bad">Retirer</button></form>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {equipe.length === 0 && <p className="text-sm text-muted">Personne dans l&apos;équipe pour le moment.</p>}
          </>
        )}

        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-line p-4">
            <p className="font-semibold">✅ Ce que ton équipe peut faire</p>
            <p className="text-muted">Tout le tableau de bord : leads, candidats, alumni, entreprises, offres, planning, événements, relances, entretiens. Chacun reçoit les notifications de son rôle ({roleEquipe("admission")?.icone} nouveaux leads · {roleEquipe("entreprises")?.icone} entreprises qui recrutent, fiches besoin, annonces d&apos;alumni).</p>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="font-semibold">🔒 Réservé à toi (⚙️)</p>
            <p className="text-muted">Cette page, les écoles et leurs formations, les brochures, la fréquence de recherche, et refaire le QR code d&apos;une carte de visite.</p>
          </div>
        </div>
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

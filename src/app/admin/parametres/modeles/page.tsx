import Link from "next/link";
import { exigerSuperAdmin } from "@/lib/auth";
import { modelesActifs } from "@/lib/modeles-serveur";
import { MODELES, type Cible } from "@/lib/modeles";
import { enregistrerModele, reinitialiserModele } from "../../actions";

export const metadata = { title: "✉️ Modèles de messages · MagnusMatch" };

const GROUPES: { cible: Cible; titre: string; aide: string }[] = [
  { cible: "lead", titre: "🧲 Leads", aide: "Prospects en cours de recrutement (tutoiement)" },
  { cible: "candidat", titre: "🎓 Candidats et alumni", aide: "Selon leur admission (tutoiement)" },
  { cible: "entreprise", titre: "🏢 Entreprises", aide: "Contacts entreprises (vouvoiement)" },
];

const VARIABLES = [
  ["{prenom}", "prénom de l'étudiant ou du lead"], ["{formation}", "sa formation"], ["{rentree}", "année de rentrée"],
  ["{entretien}", "date du concours"], ["{date_jpo}", "prochaines portes ouvertes"], ["{moi}", "ton nom (celui qui envoie)"],
  ["{signature}", "nom + poste · Campus Magnus"], ["{site}", "adresse de MagnusMatch"], ["{contact}", "contact de l'entreprise"], ["{entreprise}", "nom de l'entreprise"],
];

export default async function ModelesMessages({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string; ouvert?: string }> }) {
  await exigerSuperAdmin();
  const sp = await searchParams;
  const modeles = await modelesActifs();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Link href="/admin/parametres" className="text-sm text-muted hover:text-ink">← Paramètres</Link>
        <h1 className="text-3xl font-extrabold">✉️ Modèles de SMS et d&apos;emails</h1>
        <p className="text-muted">Réservé à l&apos;administrateur. Les textes modifiés ici sont proposés à toute l&apos;équipe dans « Noter un échange ».</p>
      </div>
      {sp.ok === "1" && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">✅ Modèle enregistré : toute l&apos;équipe a maintenant ce texte.</p>}
      {sp.ok === "supprime" && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">🗑️ Modèle supprimé.</p>}
      {sp.ok === "origine" && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">↩️ Texte d&apos;origine remis.</p>}
      {sp.erreur === "base" && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">La base n&apos;est pas à jour : exécute la mise à jour SQL de la page <Link href="/diagnostic" className="underline">/diagnostic</Link> (ligne « Modèles de SMS et d&apos;emails modifiés »).</p>}

      <details className="card p-5 text-sm">
        <summary className="cursor-pointer font-semibold">💡 Comment écrire un modèle</summary>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-1 font-semibold">Ce qui se remplit tout seul</p>
            <ul className="flex flex-col gap-0.5">{VARIABLES.map(([v, t]) => <li key={v}><code className="rounded bg-bg px-1">{v}</code> : {t}</li>)}</ul>
            <p className="mt-2 text-muted">Une autre info entre accolades, ex. <code className="rounded bg-bg px-1">{"{date_rdv}"}</code>, sera à compléter au moment de l&apos;envoi (encadré jaune).</p>
          </div>
          <div>
            <p className="mb-1 font-semibold">Mise en page des emails</p>
            <ul className="flex flex-col gap-1">
              <li><code className="rounded bg-bg px-1">## Ton rendez-vous</code> → titre de section</li>
              <li>Lignes qui commencent par <code className="rounded bg-bg px-1">- </code> → liste à puces</li>
              <li>Lignes <code className="rounded bg-bg px-1">1. </code> <code className="rounded bg-bg px-1">2. </code> → étapes numérotées</li>
              <li>Lignes qui commencent par un emoji (📅 📍) → encadré vert</li>
              <li><code className="rounded bg-bg px-1">👉 Voir mes offres : {"{site}"}/espace</code> → bouton</li>
              <li>Une ligne vide entre chaque bloc.</li>
            </ul>
            <p className="mt-2 text-muted">Les SMS restent du texte simple : garde-les courts (160 caractères = 1 SMS).</p>
          </div>
        </div>
      </details>

      {GROUPES.map((g) => (
        <section key={g.cible} className="flex flex-col gap-3">
          <div><h2 className="text-xl font-semibold">{g.titre}</h2><p className="text-sm text-muted">{g.aide}</p></div>
          <details id={`nouveau-${g.cible}`} className="rounded-2xl border-2 border-dashed border-line p-4">
            <summary className="cursor-pointer font-semibold">➕ Créer un modèle {g.cible === "lead" ? "pour les leads" : g.cible === "candidat" ? "pour les candidats" : "pour les entreprises"}</summary>
            <p className="mt-2 text-sm text-muted">Il apparaîtra pour toute l&apos;équipe dans « Noter un échange » → « Autres modèles ».</p>
            <form action={enregistrerModele} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="id" value="nouveau" /><input type="hidden" name="cible" value={g.cible} />
              <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Nom du modèle</span><input className="input" name="titre" maxLength={80} required placeholder="Ex. 📄 Dossier incomplet" /></label>
              <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
                <div className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">✉️ Objet de l&apos;email</span><input className="input" name="sujet" maxLength={200} required placeholder="Ex. Ton dossier · Campus Magnus" /></label>
                  <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">✉️ Email</span><textarea className="input min-h-64 font-mono text-[13px]" name="email" maxLength={6000} required defaultValue={g.cible === "entreprise" ? "Bonjour {contact},\n\n\n\nBien cordialement,\n\n{signature}" : "Bonjour {prenom},\n\n\n\nÀ très vite,\n\n{signature}"} /></label>
                </div>
                <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">💬 SMS</span><textarea className="input min-h-48 text-sm" name="sms" maxLength={1000} required defaultValue={g.cible === "entreprise" ? "Campus Magnus · {moi}\nBonjour {contact}, " : "Campus Magnus · {moi}\nBonjour {prenom}, "} /></label>
              </div>
              <button className="btn btn-primary w-fit">➕ Créer le modèle</button>
            </form>
          </details>
          {modeles.filter((m) => m.cible === g.cible).map((m) => (
            <details key={m.id} id={m.id} open={sp.ouvert === m.id} className="card scroll-mt-6 p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">{m.titre}</span>
                {m.perso ? <span className="chip chip-tag text-xs">⭐ Créé par toi · dans « Autres modèles »</span> : m.modifie && <span className="chip chip-plus text-xs">✏️ Modifié</span>}
              </summary>
              <form action={enregistrerModele} className="mt-4 flex flex-col gap-3">
                <input type="hidden" name="id" value={m.id} />
                <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Nom du modèle</span><input className="input" name="titre" defaultValue={m.titre} maxLength={80} required /></label>
                <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">✉️ Objet de l&apos;email</span><input className="input" name="sujet" defaultValue={m.sujet} maxLength={200} required /></label>
                    <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">✉️ Email</span><textarea className="input min-h-80 font-mono text-[13px]" name="email" defaultValue={m.email} maxLength={6000} required /></label>
                  </div>
                  <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">💬 SMS</span><textarea className="input min-h-48 text-sm" name="sms" defaultValue={m.sms} maxLength={1000} required /></label>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn btn-primary">Enregistrer</button>
                  <a href={`/admin/parametres/modeles/apercu?id=${m.id}`} target="_blank" className="btn">👁️ Aperçu de l&apos;email</a>
                  {m.perso
                    ? <button formAction={reinitialiserModele} className="btn btn-ghost text-sm text-bad">🗑️ Supprimer ce modèle</button>
                    : m.modifie && <button formAction={reinitialiserModele} className="btn btn-ghost text-sm">↩️ Remettre le texte d&apos;origine</button>}
                </div>
              </form>
            </details>
          ))}
        </section>
      ))}
      <p className="text-xs text-muted">{MODELES.length} modèles. L&apos;aperçu montre la version enregistrée, avec des exemples (Lucas, EGC…).</p>
    </div>
  );
}

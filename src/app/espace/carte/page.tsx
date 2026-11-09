import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { estAdmis } from "@/lib/admission";
import { AttenteAdmission } from "@/components/AttenteAdmission";
import { PartagerCarte } from "@/components/PartagerCarte";
import { avecPoste, formationCarte, jetonCarte, lienCarte, optionsCarte, qrCarte, type CandidatCarte } from "@/lib/carte";
import { enregistrerCarte } from "../actions";

export const metadata = { title: "Ma carte de visite · MagnusMatch" };

type SP = { ok?: string; erreur?: string };

export default async function MaCarte({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user } = await exigerUtilisateur();
  const { data: brut } = await createAdminClient().from("candidats").select("*").eq("user_id", user.id).maybeSingle<CandidatCarte>();
  if (!brut) redirect("/espace/profil");
  const c = await avecPoste(brut);
  if (!c.poste_equipe && !estAdmis(c)) return <AttenteAdmission c={c} />;

  const jeton = await jetonCarte(c);
  if (!jeton) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-3 py-6">
        <h1 className="text-3xl font-extrabold">📇 Ma carte de visite</h1>
        <p className="rounded-xl bg-warn-soft p-4 text-sm text-warn">La carte de visite arrive très bientôt : l&apos;équipe doit encore terminer sa mise en place.</p>
        <Link href="/espace" className="btn w-fit">← Mes offres</Link>
      </div>
    );
  }
  const o = optionsCarte(c);
  const lien = lienCarte(jeton);
  const qr = await qrCarte(jeton);
  const formation = formationCarte(c);
  const vues = c.carte_vues ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/espace" className="text-sm text-muted hover:text-ink">← Mes offres</Link>
          <h1 className="text-3xl font-extrabold">📇 Ma carte de visite</h1>
          <p className="text-muted">Montre ce QR code en job dating, en salon ou en entretien : le recruteur le scanne et retrouve tes coordonnées.</p>
        </div>
      </div>
      {sp.ok && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">✅ Ta carte est à jour.</p>}
            {sp.erreur && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">Impossible d&apos;enregistrer pour le moment. Réessaie dans un instant.</p>}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section className="card flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-xl font-semibold">{c.nom}</p>
          {formation && <span className="chip">{formation}</span>}
          {o.active ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code de ma carte de visite" className="h-auto w-full max-w-[300px]" />
              <p className="text-sm text-muted">Fais scanner ce QR code avec l&apos;appareil photo.</p>
              <div className="flex w-full flex-col gap-2">
                <a href={qr} download="ma-carte-de-visite-qr.png" className="btn w-full justify-center">⬇️ Enregistrer l&apos;image</a>
                <PartagerCarte lien={lien} nom={c.nom} />
                <a href={lien} target="_blank" rel="noopener" className="btn btn-ghost w-full justify-center">👁️ Voir ma carte comme le recruteur</a>
              </div>
              <p className="text-xs text-muted">👀 {vues ? `Ta carte a été ouverte ${vues} fois${c.carte_vue_le ? `, la dernière le ${new Date(c.carte_vue_le).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}` : ""}.` : "Ta carte n'a pas encore été ouverte."}</p>
            </>
          ) : (
            <p className="rounded-xl bg-warn-soft p-4 text-sm text-warn">Ta carte est désactivée : le QR code n&apos;affiche plus rien. Réactive-la à droite.</p>
          )}
        </section>

        <form action={enregistrerCarte} className="card flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">🔒 Ce qui s&apos;affiche sur ma carte</h2>
          <p className="text-sm text-muted">Toute personne qui scanne ton QR code voit ces informations. Tu choisis.</p>
          <div className="flex flex-col gap-2 text-sm">
            <label className="flex items-center gap-3"><input type="checkbox" name="tel" defaultChecked={o.tel} disabled={!c.telephone} className="h-4 w-4" /> 📞 Mon téléphone {c.telephone ? <span className="text-muted">({c.telephone})</span> : <Link href="/espace/profil" className="text-accent underline">à ajouter dans mon profil</Link>}</label>
            <label className="flex items-center gap-3"><input type="checkbox" name="email" defaultChecked={o.email} className="h-4 w-4" /> ✉️ Mon email <span className="text-muted">({c.email})</span></label>
            <label className="flex items-center gap-3"><input type="checkbox" name="linkedin" defaultChecked={o.linkedin} disabled={!c.linkedin_url} className="h-4 w-4" /> 💼 Mon LinkedIn {c.linkedin_url ? "" : <Link href="/espace/reseau" className="text-accent underline">à ajouter</Link>}</label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">🔎 Ce que je recherche</span>
            <textarea name="recherche" className="input min-h-20" maxLength={160} defaultValue={o.recherche} placeholder="Recherche une alternance · Commerce · Arles et alentours" />
            <span className="text-xs text-muted">2 lignes maximum, 160 caractères.</span>
          </label>
          <label className="flex items-center gap-3 border-t border-line pt-4 text-sm"><input type="checkbox" name="active" defaultChecked={o.active} className="h-4 w-4" /> ✅ Ma carte est active <span className="text-muted">(décoche pour la masquer)</span></label>
          <button className="btn btn-primary w-fit">Enregistrer</button>
        </form>
      </div>

      <p className="text-sm text-muted">Ta carte a trop circulé ? Demande à l&apos;équipe du Campus de te refaire un QR code : l&apos;ancien ne marchera plus.</p>
    </div>
  );
}

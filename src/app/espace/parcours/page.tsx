import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { OngletsEspace } from "@/components/OngletsEspace";
import { AIDES, AVEC_ENTREPRISE, SITUATIONS, estAlumni, lireParcours, moisTexte } from "@/lib/alumni";
import type { Candidat } from "@/lib/types";
import { enregistrerParcours, monEntrepriseRecrute } from "../actions";

export const metadata = { title: "Mon parcours · MagnusMatch" };

type SP = { ok?: string; erreur?: string; recrute?: string };

export default async function MonParcours({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { user } = await exigerUtilisateur();
  const { data: c } = await createAdminClient().from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat & { parcours?: unknown }>();
  if (!c) redirect("/espace/profil");
  if (!estAlumni(c)) redirect("/espace");
  const p = lireParcours(c.parcours);
  const promo = [c.formation, c.diplome_annee].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-5">
      <OngletsEspace actif="parcours" alumni />
      <div>
        <h1 className="text-3xl font-extrabold">🎓 Mon parcours</h1>
        <p className="text-muted">Alumni{promo ? ` ${promo}` : ""} · Ton espace MagnusMatch reste à toi, à vie. Dis-nous où tu en es : ça aide les étudiants qui te suivent.</p>
      </div>
      {sp.ok && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">✅ Merci ! Ton parcours est à jour.</p>}
      {sp.recrute && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">✅ Merci ! L&apos;équipe est prévenue et revient vers toi.</p>}
      {sp.erreur === "situation" && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">Choisis ta situation actuelle.</p>}
      {sp.erreur === "base" && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">Impossible d&apos;enregistrer pour le moment. Réessaie dans un instant.</p>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <form action={enregistrerParcours} className="card flex flex-col gap-4 p-6">
          <h2 className="text-lg font-semibold">Où j&apos;en suis aujourd&apos;hui</h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-semibold">Ma situation <span className="text-bad">*</span></legend>
            <div className="flex flex-wrap gap-2">
              {SITUATIONS.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
                  <input type="radio" name="situation" value={s.id} defaultChecked={p?.situation === s.id} required className="sr-only" />
                  <span aria-hidden>{s.icone}</span>{s.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Poste ou formation</span><input className="input" name="poste" defaultValue={p?.poste ?? ""} placeholder="Ex. Chargée de clientèle" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Entreprise <span className="font-normal text-muted">(si tu travailles)</span></span><input className="input" name="entreprise" defaultValue={p?.entreprise ?? ""} placeholder="Ex. Crédit Agricole Alpes Provence" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Ville</span><input className="input" name="ville" defaultValue={p?.ville ?? ""} placeholder="Ex. Arles" /></label>
            <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Depuis</span><input className="input" type="month" name="depuis" defaultValue={p?.depuis ?? ""} /></label>
          </div>
          <fieldset className="flex flex-col gap-2 border-t border-line pt-4">
            <legend className="mb-1 text-sm font-semibold">🙌 Je peux aider le Campus</legend>
            {AIDES.map((a) => (
              <label key={a.id} className="flex items-center gap-3 text-sm"><input type="checkbox" name="aides" value={a.id} defaultChecked={p?.aides.includes(a.id)} className="h-4 w-4" /> <span aria-hidden>{a.icone}</span>{a.label}</label>
            ))}
          </fieldset>
          <button className="btn btn-primary w-fit">Enregistrer</button>
          {p?.maj_le && <p className="text-xs text-muted">Dernière mise à jour : {new Date(p.maj_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" })}</p>}
        </form>

        <div className="flex flex-col gap-4">
          <section className="flex flex-col gap-3 rounded-xl bg-[#111] p-6 text-white">
            <h2 className="text-lg font-semibold">🏢 Mon entreprise recrute ?</h2>
            {p?.entreprise_id && AVEC_ENTREPRISE.includes(p.situation) ? (
              <>
                <p className="text-sm text-[#d6d9d1]">Ton entreprise <b className="text-white">{p.entreprise}</b> cherche un alternant ou un stagiaire ? Dis-le en un clic et remplis la fiche besoin (2 minutes) : l&apos;équipe te présente les étudiants qui correspondent.</p>
                <form action={monEntrepriseRecrute}><button className="btn btn-primary">🎯 Oui, mon entreprise recrute</button></form>
              </>
            ) : (
              <p className="text-sm text-[#d6d9d1]">Indique d&apos;abord ton entreprise dans ton parcours : tu pourras ensuite nous dire si elle recrute.</p>
            )}
          </section>
          <section className="card flex flex-col gap-2 p-5 text-sm">
            <h2 className="font-semibold">Toujours à toi</h2>
            <Link href="/espace" className="hover:text-accent">💼 Mes offres (emploi et alternance)</Link>
            <Link href="/espace/carte" className="hover:text-accent">📇 Ma carte de visite</Link>
            <Link href="/espace/cv" className="hover:text-accent">📄 Mon CV</Link>
            {p?.situation && <p className="pt-2 text-xs text-muted">{SITUATIONS.find((s) => s.id === p.situation)?.icone} {[p.poste, p.entreprise, p.depuis && `depuis ${moisTexte(p.depuis)}`].filter(Boolean).join(" · ")}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}

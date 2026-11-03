import Link from "next/link";
import { exigerUtilisateur } from "@/lib/auth";
import { OngletsProfil } from "@/components/OngletsProfil";
import { BoutonKitLinkedin, Checklist, FormLinkedinAnalyse, FormLinkedinUrl } from "@/components/FormLinkedin";
import { ResultatLinkedin } from "@/components/ResultatLinkedin";
import { ETAPES_LINKEDIN } from "@/lib/linkedin-guide";
import type { Candidat } from "@/lib/types";

export const metadata = { title: "Réseau · MagnusMatch" };
export const maxDuration = 300;

export default async function Reseau({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const sp = await searchParams;
  const { user, supabase } = await exigerUtilisateur();
  const { data: c } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  const a = c?.linkedin_analyse ?? null;
  const mode = sp.mode === "analyse" || sp.mode === "creation" ? sp.mode : a?.mode ?? null;

  const choix = (id: "analyse" | "creation", icone: string, titre: string, texte: string) => (
    <Link href={`/espace/reseau?mode=${id}`}
      className={`card flex flex-1 flex-col gap-1 p-5 transition-colors hover:border-accent ${mode === id ? "border-accent bg-accent-soft" : ""}`}>
      <span className="text-2xl" aria-hidden>{icone}</span>
      <b>{titre}</b>
      <span className="text-sm text-muted">{texte}</span>
    </Link>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <OngletsProfil actif="reseau" />
      <p className="text-muted">Les recruteurs regardent souvent LinkedIn avant de rappeler. MagnusMatch t&apos;aide à avoir un profil qui donne envie de te rencontrer.</p>

      <div className="flex flex-col gap-3 sm:flex-row">
        {choix("analyse", "🔎", "J'ai déjà un profil LinkedIn", "Dépose le PDF ou des captures d'écran : tu reçois une note et des conseils pour l'améliorer.")}
        {choix("creation", "🚀", "Je n'ai pas encore de LinkedIn", "Suis la formation étape par étape et récupère ton titre et ton texte prêts à copier.")}
      </div>

      {mode === "analyse" && (
        <>
          <section className="card flex flex-col gap-4 p-5">
            <h2 className="text-lg font-semibold">Faire analyser mon profil</h2>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-bg p-3">
                <b>Option 1 : le PDF</b>
                <ol className="mt-1 list-decimal pl-5 text-muted">
                  <li>Ouvre ton profil LinkedIn sur un ordinateur.</li>
                  <li>Clique sur « Plus » sous ta photo.</li>
                  <li>Choisis « Enregistrer au format PDF ».</li>
                </ol>
              </div>
              <div className="rounded-lg bg-bg p-3">
                <b>Option 2 : des captures d&apos;écran</b>
                <ol className="mt-1 list-decimal pl-5 text-muted">
                  <li>Le haut de ton profil (photo, bannière, titre).</li>
                  <li>La section « Infos ».</li>
                  <li>Tes expériences et ta formation.</li>
                </ol>
              </div>
            </div>
            <p className="text-xs text-muted">Avec une capture, MagnusMatch peut aussi te conseiller sur ta photo et ta bannière (le PDF ne les contient pas). Le mieux : le PDF + une capture du haut de ta page.</p>
            <FormLinkedinAnalyse deja={a?.mode === "analyse"} />
          </section>
          {a?.mode === "analyse" && <ResultatLinkedin a={a} le={c?.linkedin_le} />}
        </>
      )}

      {mode === "creation" && (
        <>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">Ton kit de départ</h2>
            <p className="text-sm text-muted">
              À partir de ton CV et de ton projet, MagnusMatch te prépare un titre, un texte « Infos » et tes 5 compétences clés, prêts à copier.
              {!c?.cv_chemin && " Dépose d'abord ton CV dans « Mon CV » pour un résultat plus juste."}
            </p>
            <BoutonKitLinkedin deja={a?.mode === "creation"} />
          </section>
          {a?.mode === "creation" && <ResultatLinkedin a={a} le={c?.linkedin_le} />}

          <section className="flex flex-col gap-4">
            <div>
              <span className="eyebrow">Formation</span>
              <h2 className="text-2xl font-extrabold">Créer un bon LinkedIn en 13 étapes</h2>
            </div>
            <ol className="flex flex-col gap-3">
              {ETAPES_LINKEDIN.map((e, i) => (
                <li key={e.titre} className="card flex gap-4 p-5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--sauge)] text-sm font-bold text-[#111]">{i + 1}</span>
                  <div className="flex min-w-0 flex-col gap-2">
                    <h3 className="font-semibold">{e.titre}</h3>
                    <p className="text-sm text-muted">{e.pourquoi}</p>
                    <ul className="flex flex-col gap-1 text-sm">{e.faire.map((f) => <li key={f}>→ {f}</li>)}</ul>
                    {(e.eviter || e.mieux) && (
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        {e.eviter && <p className="rounded-lg bg-bad-soft p-2"><b className="text-bad">À éviter</b><br />{e.eviter}</p>}
                        {e.mieux && <p className="rounded-lg bg-good-soft p-2"><b className="text-good">Mieux</b><br />{e.mieux}</p>}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <section className="card flex flex-col gap-2 p-5">
              <h3 className="font-semibold">Où j&apos;en suis</h3>
              <Checklist id="linkedin-formation" items={ETAPES_LINKEDIN.map((e) => e.titre)} />
            </section>
          </section>
        </>
      )}

      <section className="card p-5">
        <FormLinkedinUrl url={c?.linkedin_url ?? ""} />
      </section>
    </div>
  );
}

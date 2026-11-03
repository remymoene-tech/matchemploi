import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { Rafraichir } from "@/components/Rafraichir";
import { OffresEspace, type LigneOffre } from "@/components/OffresEspace";
import { relancerRecherche } from "./actions";
import { SCORE_ORANGE, SCORE_VERT, SEUIL, contratLabel, estOffreEquipe, sourceLabel, type Candidat, type Piste } from "@/lib/types";
import { adopterPiste, ecarterPiste } from "./actions";
import { Chips, Score } from "@/components/Score";

export const metadata = { title: "Mes offres · Jobaprox" };
export const maxDuration = 300;

type Ligne = {
  offre_id: string;
  score: number;
  forts: string[];
  manques: string[];
  resume: string;
  avis_candidat: string;
  raison_refus?: string | null;
  preparation_le?: string | null;
  recherche_id?: string | null;
  piste?: string | null;
  calcule_le: string;
  offres: {
    source: string; entreprise: string; intitule: string; contrat: string; contrat_libelle: string;
    lieu: string; salaire: string; lien: string; ouverte: boolean;
    latitude?: number | null; longitude?: number | null;
  } | null;
};

const dateFr = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default async function Espace() {
  const { user, supabase } = await exigerUtilisateur();
  const { data: c } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  if (!c) redirect("/espace/profil");

  const champs = "offre_id, score, forts, manques, resume, avis_candidat, calcule_le";
  const champsOffre = "source, entreprise, intitule, contrat, contrat_libelle, lieu, salaire, lien, ouverte";
  // Du plus complet au plus simple : si la base n'a pas encore les colonnes récentes, on lit ce qui existe
  const variantes = [
    [", raison_refus, preparation_le, recherche_id, piste", ", latitude, longitude"],
    [", raison_refus, preparation_le", ", latitude, longitude"],
    [", raison_refus", ", latitude, longitude"],
    ["", ", latitude, longitude"],
    ["", ""],
  ];
  let data: Ligne[] | null = null;
  for (const [extra, gps] of variantes) {
    const r = await supabase
      .from("correspondances")
      .select(`${champs}${extra}, offres(${champsOffre}${gps})`)
      .eq("candidat_id", user.id)
      .order("score", { ascending: false })
      .returns<Ligne[]>();
    if (!r.error) { data = r.data; break; }
  }

  // Ses recherches (pour les filtres) et les pistes proposées par Jobaprox
  const { data: rechData } = await supabase.from("recherches").select("id, poste, active").eq("candidat_id", user.id).order("created_at");
  const autresRecherches = (rechData ?? []) as { id: string; poste: string; active: boolean }[];
  const pistes = ((c.pistes ?? []) as Piste[]).filter((p) => !p.ecartee);
  // Bilans d'entretien que l'école a choisi de partager (la base ne renvoie que ceux-là)
  const { data: bilans } = await supabase.from("entretiens_conseil").select("id, date_entretien, conseiller").eq("candidat_id", user.id).order("date_entretien", { ascending: false });

  // Les offres saisies par l'équipe ne sont jamais montrées : c'est l'équipe qui fait le lien
  const visibles = (data ?? []).filter((l) => l.offres?.ouverte && !estOffreEquipe(l.offres.source));
  // Seules les offres à 65 % ou plus sont proposées (orange de 65 à 69 %, vert à partir de 70 %)
  const ouvertes = visibles.filter((l) => !l.piste && l.score >= SCORE_ORANGE); // les pistes ont leur propre encadré
  const suggestions = visibles.filter((l) => l.piste && l.score >= SCORE_VERT && l.avis_candidat !== "pas_interesse" && pistes.some((p) => p.metier === l.piste));
  // Toutes les offres notées, strictement du plus grand % au plus petit
  const lignes: LigneOffre[] = [...ouvertes]
    .sort((a, b) => Number(b.score) - Number(a.score))
    .map((l) => ({
      offre_id: l.offre_id,
      score: l.score,
      forts: l.forts,
      manques: l.manques,
      resume: l.resume,
      avis_candidat: l.avis_candidat,
      raison_refus: l.raison_refus ?? "",
      source: l.offres!.source,
      sourceLabel: sourceLabel(l.offres!.source),
      entreprise: l.offres!.entreprise,
      intitule: l.offres!.intitule,
      contrat: l.offres!.contrat_libelle || contratLabel(l.offres!.contrat),
      lieu: l.offres!.lieu,
      salaire: l.offres!.salaire,
      lien: l.offres!.lien,
      latitude: l.offres!.latitude ?? null,
      longitude: l.offres!.longitude ?? null,
      prepa: Boolean(l.preparation_le),
      recherche: l.recherche_id ? autresRecherches.find((r) => r.id === l.recherche_id)?.poste ?? c.poste_vise : c.poste_vise,
    }));

  // Fiches d'entretien prêtes (y compris pour les offres sur lesquelles l'équipe l'a positionné)
  const { data: fiches } = await supabase
    .from("correspondances")
    .select("offre_id, preparation_le, meta:preparation->meta")
    .eq("candidat_id", user.id)
    .not("preparation_le", "is", null)
    .order("preparation_le", { ascending: false });
  const entretiens = ((fiches ?? []) as unknown as { offre_id: string; meta: { intitule?: string; entreprise?: string } | null }[]).filter((x) => x.meta);
  const auDessus = ouvertes.filter((l) => l.score >= SCORE_VERT).length;
  const interesse = ouvertes.filter((l) => l.avis_candidat === "interesse").length;
  const postule = ouvertes.filter((l) => l.avis_candidat === "postule").length;
  const domicile = c.latitude != null && c.longitude != null
    ? { latitude: c.latitude, longitude: c.longitude, rayonKm: c.mobilite_km || 20, ville: c.ville || c.code_postal }
    : null;

  const stats: { label: string; valeur: string; lien?: string }[] = [
    { label: "Offres trouvées", valeur: String(ouvertes.length) },
    { label: `En vert (${SCORE_VERT} % et plus)`, valeur: String(auDessus) },
    { label: "Ça m'intéresse", valeur: String(interesse) },
    { label: "Candidatures", valeur: String(postule) },
    { label: "Note de ton CV", valeur: c.cv_conseils ? `${c.cv_conseils.note}/10` : "—", lien: "/espace/cv" },
  ];

  return (
    <div className="flex flex-col gap-5">
      {c.recherche_en_cours && <Rafraichir />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold">Bonjour {c.nom.split(" ")[0]}</h1>
          <p className="text-muted">
            {autresRecherches.some((r) => r.active)
              ? `${1 + autresRecherches.filter((r) => r.active).length} recherches : ${[c.poste_vise, ...autresRecherches.filter((r) => r.active).map((r) => r.poste)].join(", ")}.`
              : c.ville ? `Offres de ${c.poste_vise || "ton métier"} autour de ${c.ville}, dans un rayon de ${c.mobilite_km} km.` : "Tes offres notées."}
            {c.derniere_recherche && ` Dernière recherche : ${dateFr(c.derniere_recherche)}.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/espace/tests" className="btn">Mes tests</Link>
          <Link href="/espace/recherches" className="btn">Mes recherches ({1 + autresRecherches.filter((r) => r.active).length})</Link>
          <form action={relancerRecherche}>
            <button className="btn btn-primary" disabled={c.recherche_en_cours}>
              {c.recherche_en_cours ? "Recherche en cours…" : "Chercher de nouvelles offres"}
            </button>
          </form>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Statistiques">
        {stats.map((s) => {
          const contenu = (
            <>
              <span className="eyebrow">{s.label}</span>
              <b className="font-mono text-2xl tabular-nums">{s.valeur}</b>
              {s.lien && <span className="text-xs font-semibold text-accent">Voir les conseils →</span>}
            </>
          );
          return s.lien ? (
            <Link key={s.label} href={s.lien} className="card flex flex-col p-4 hover:border-accent">{contenu}</Link>
          ) : (
            <div key={s.label} className="card flex flex-col p-4">{contenu}</div>
          );
        })}
      </section>

      {!!bilans?.length && (
        <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex flex-col">
            <h2 className="text-base font-semibold">Mon bilan avec mon école</h2>
            <p className="text-sm text-muted">Le compte rendu de ton entretien avec ton conseiller.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {bilans.map((b) => (
              <Link key={b.id} href={`/espace/bilan/${b.id}`} className="btn btn-sm">
                {new Date(b.date_entretien).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}{b.conseiller ? ` · ${b.conseiller}` : ""} →
              </Link>
            ))}
          </div>
        </section>
      )}

      {!!entretiens.length && (
        <section className="card flex flex-col gap-3 p-4" style={{ borderColor: "var(--accent)" }}>
          <h2 className="text-base font-semibold">Tes entretiens à préparer</h2>
          <div className="flex flex-wrap gap-2">
            {entretiens.map((e) => (
              <Link key={e.offre_id} href={`/entretien/${user.id}/${e.offre_id}`} className="btn btn-sm">
                {e.meta?.intitule}{e.meta?.entreprise ? ` · ${e.meta.entreprise}` : ""} →
              </Link>
            ))}
          </div>
        </section>
      )}

      {c.recherche_en_cours && (
        <div className="card flex items-center gap-3 p-4 text-sm" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
          On lit les offres et on les compare à ton profil. Ça prend en général moins d&apos;une minute ; la page se met à jour toute seule.
        </div>
      )}
      {!c.cv_chemin && (
        <p className="rounded-xl bg-warn-soft p-4 text-sm">
          Tu n&apos;as pas encore déposé de CV : les notes seront plus justes avec. <Link className="font-semibold underline" href="/espace/cv">Ajouter mon CV</Link>
        </p>
      )}

      {!!pistes.length && (
        <section className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: "var(--accent-soft)" }}>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Proposé par Jobaprox</span>
            <h2 className="text-xl font-extrabold">
              {suggestions.length
                ? `J'ai aussi trouvé ${suggestions.length} offre${suggestions.length > 1 ? "s" : ""} qui pourrai${suggestions.length > 1 ? "ent" : "t"} correspondre à ton CV`
                : "Ton expérience t'ouvre aussi ces métiers"}
            </h2>
            <p className="text-sm text-muted">Des métiers que tu n&apos;as pas demandés, mais où ton expérience est un vrai atout.</p>
          </div>
          {pistes.slice(0, 3).map((p) => {
            const offres = suggestions.filter((l) => l.piste === p.metier);
            return (
              <article key={p.metier} className="card flex flex-col gap-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <h3 className="text-lg font-semibold">{p.metier}</h3>
                    <p className="text-sm">{p.raison}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={adopterPiste}><input type="hidden" name="metier" value={p.metier} /><button className="btn btn-primary btn-sm">Ajouter ce métier à mes recherches</button></form>
                    <form action={ecarterPiste}><input type="hidden" name="metier" value={p.metier} /><button className="btn btn-sm">Pas pour moi</button></form>
                  </div>
                </div>
                {!offres.length && (
                  <p className="text-sm text-muted">
                    {c.recherche_en_cours
                      ? "Jobaprox cherche des offres pour ce métier…"
                      : "Pas encore d'offre à 70 % ou plus pour ce métier près de chez toi. Ajoute-le à tes recherches pour que Jobaprox cherche plus largement."}
                  </p>
                )}
                <ul className="grid gap-2 md:grid-cols-2">
                  {offres.map((l) => (
                    <li key={l.offre_id} className="flex gap-3 rounded-lg border border-line p-3">
                      <Score score={l.score} seuil={SEUIL} />
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="text-sm font-semibold leading-snug">{l.offres!.intitule}</p>
                        <p className="text-xs text-muted">{[l.offres!.entreprise, l.offres!.lieu, l.offres!.contrat_libelle || contratLabel(l.offres!.contrat)].filter(Boolean).join(" · ")}</p>
                        <p className="text-xs">{l.resume}</p>
                        <Chips forts={l.forts.slice(0, 2)} manques={[]} />
                        {l.offres!.lien && <a className="text-xs font-semibold text-accent" href={l.offres!.lien} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce</a>}
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
      )}

      {lignes.length ? (
        <OffresEspace lignes={lignes} seuil={SEUIL} domicile={domicile} candidatId={user.id} recherches={[c.poste_vise, ...autresRecherches.filter((r) => r.active).map((r) => r.poste)].filter(Boolean)} />
      ) : (
        !c.recherche_en_cours && (
          <div className="card flex flex-col gap-2 border-dashed p-6">
            <h2 className="text-lg font-semibold">Pas encore d&apos;offre à te montrer</h2>
            <p className="max-w-[60ch] text-sm text-muted">
              On relance la recherche régulièrement et on te prévient par email dès qu&apos;une offre te correspond.
              Pour élargir les résultats, augmente ta distance maximale ou ajoute un type de contrat dans ton profil.
            </p>
          </div>
        )
      )}
    </div>
  );
}

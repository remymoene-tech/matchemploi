import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { Rafraichir } from "@/components/Rafraichir";
import { OffresEspace, type LigneOffre } from "@/components/OffresEspace";
import { relancerRecherche } from "./actions";
import { SEUIL, contratLabel, sourceLabel, type Candidat } from "@/lib/types";

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
  const lire = (raison: boolean, gps: boolean) =>
    supabase
      .from("correspondances")
      .select(`${champs}${raison ? ", raison_refus" : ""}, offres(${champsOffre}${gps ? ", latitude, longitude" : ""})`)
      .eq("candidat_id", user.id)
      .order("score", { ascending: false })
      .returns<Ligne[]>();
  // Si la base n'a pas encore toutes les colonnes récentes, on lit ce qui existe
  let data: Ligne[] | null = null;
  for (const [raison, gps] of [[true, true], [false, true], [false, false]] as const) {
    const r = await lire(raison, gps);
    if (!r.error) { data = r.data; break; }
  }

  const ouvertes = (data ?? []).filter((l) => l.offres?.ouverte);
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
    }));
  const auDessus = ouvertes.filter((l) => l.score >= SEUIL).length;
  const interesse = ouvertes.filter((l) => l.avis_candidat === "interesse").length;
  const postule = ouvertes.filter((l) => l.avis_candidat === "postule").length;
  const domicile = c.latitude != null && c.longitude != null
    ? { latitude: c.latitude, longitude: c.longitude, rayonKm: c.mobilite_km || 20, ville: c.ville || c.code_postal }
    : null;

  const stats: { label: string; valeur: string; lien?: string }[] = [
    { label: "Offres trouvées", valeur: String(ouvertes.length) },
    { label: `À ${SEUIL} % et plus`, valeur: String(auDessus) },
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
            {c.ville ? `Offres autour de ${c.ville}, dans un rayon de ${c.mobilite_km} km.` : "Tes offres notées."}
            {c.derniere_recherche && ` Dernière recherche : ${dateFr(c.derniere_recherche)}.`}
          </p>
        </div>
        <form action={relancerRecherche}>
          <button className="btn btn-primary" disabled={c.recherche_en_cours}>
            {c.recherche_en_cours ? "Recherche en cours…" : "Chercher de nouvelles offres"}
          </button>
        </form>
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

      {lignes.length ? (
        <OffresEspace lignes={lignes} seuil={SEUIL} domicile={domicile} />
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

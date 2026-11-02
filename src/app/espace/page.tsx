import Link from "next/link";
import { redirect } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { Chips, Score } from "@/components/Score";
import { Rafraichir } from "@/components/Rafraichir";
import { Carte, type PointOffre } from "@/components/Carte";
import { donnerAvis, relancerRecherche } from "./actions";
import { AVIS, SEUIL, contratLabel, sourceLabel, type Candidat } from "@/lib/types";

export const metadata = { title: "Mes offres · JobMee" };
export const maxDuration = 300;

type Ligne = {
  offre_id: string;
  score: number;
  forts: string[];
  manques: string[];
  resume: string;
  avis_candidat: string;
  calcule_le: string;
  offres: {
    source: string; entreprise: string; intitule: string; contrat: string; contrat_libelle: string;
    lieu: string; salaire: string; lien: string; ouverte: boolean;
    latitude?: number | null; longitude?: number | null;
  } | null;
};

const dateFr = (d: string) =>
  new Date(d).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default async function Espace({ searchParams }: { searchParams: Promise<{ tout?: string; vue?: string }> }) {
  const { tout, vue } = await searchParams;
  const carte = vue === "carte";
  const { user, supabase } = await exigerUtilisateur();
  const { data: c } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  if (!c) redirect("/espace/profil");

  const champs = "offre_id, score, forts, manques, resume, avis_candidat, calcule_le, offres(source, entreprise, intitule, contrat, contrat_libelle, lieu, salaire, lien, ouverte";
  const lire = (gps: boolean) =>
    supabase
      .from("correspondances")
      .select(`${champs}${gps ? ", latitude, longitude" : ""})`)
      .eq("candidat_id", user.id)
      .order("score", { ascending: false })
      .returns<Ligne[]>();
  const premier = await lire(true);
  let data = premier.data;
  if (premier.error) data = (await lire(false)).data; // base pas encore à jour pour la carte

  const lignes = (data ?? []).filter((l) => l.offres?.ouverte);
  const auDessus = lignes.filter((l) => l.score >= SEUIL);
  const affichees = (tout ? lignes : auDessus).filter((l) => l.avis_candidat !== "pas_interesse" || tout);

  return (
    <div className="flex flex-col gap-6">
      {c.recherche_en_cours && <Rafraichir />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold">Bonjour {c.nom.split(" ")[0]}</h1>
          <p className="text-muted">
            {auDessus.length
              ? `${auDessus.length} offre${auDessus.length > 1 ? "s" : ""} te correspond${auDessus.length > 1 ? "ent" : ""} à ${SEUIL} % ou plus.`
              : `Aucune offre à ${SEUIL} % ou plus pour l'instant.`}
            {c.derniere_recherche && ` Dernière recherche : ${dateFr(c.derniere_recherche)}.`}
          </p>
        </div>
        <form action={relancerRecherche}>
          <button className="btn btn-primary" disabled={c.recherche_en_cours}>
            {c.recherche_en_cours ? "Recherche en cours…" : "Chercher de nouvelles offres"}
          </button>
        </form>
      </div>

      {c.recherche_en_cours && (
        <div className="card flex items-center gap-3 p-4 text-sm" role="status">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
          On lit les offres et on les compare à ton profil. Ça prend en général moins d&apos;une minute ; la page se met à jour toute seule.
        </div>
      )}
      {c.cv_conseils && (
        <Link href="/espace/cv" className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm hover:border-accent">
          <span>
            <b className="font-mono">{c.cv_conseils.note}/10</b> pour ton CV ·{" "}
            {c.cv_conseils.ameliorations.filter((a) => a.priorite === "important").length} conseil(s) important(s) pour l&apos;améliorer
          </span>
          <span className="font-semibold text-accent">Voir les conseils →</span>
        </Link>
      )}
      {!c.cv_chemin && (
        <p className="rounded-xl bg-warn-soft p-4 text-sm">
          Tu n&apos;as pas encore déposé de CV : les notes seront plus justes avec. <Link className="font-semibold underline" href="/espace/profil">Ajouter mon CV</Link>
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap gap-2">
          <Link href={`/espace${carte ? "?vue=carte" : ""}`} className={`btn btn-sm ${!tout ? "border-accent text-accent" : ""}`}>À {SEUIL} % et plus ({auDessus.length})</Link>
          <Link href={`/espace?tout=1${carte ? "&vue=carte" : ""}`} className={`btn btn-sm ${tout ? "border-accent text-accent" : ""}`}>Toutes les offres notées ({lignes.length})</Link>
        </div>
        <div className="flex rounded-lg border border-line p-0.5" role="group" aria-label="Affichage">
          <Link href={`/espace${tout ? "?tout=1" : ""}`} aria-current={!carte} className={`rounded-md px-3 py-1 font-semibold ${!carte ? "bg-accent text-accent-ink" : "text-muted"}`}>Liste</Link>
          <Link href={`/espace?vue=carte${tout ? "&tout=1" : ""}`} aria-current={carte} className={`rounded-md px-3 py-1 font-semibold ${carte ? "bg-accent text-accent-ink" : "text-muted"}`}>Carte</Link>
        </div>
      </div>

      {carte && (() => {
        const points: PointOffre[] = affichees
          .filter((l) => l.offres?.latitude != null && l.offres?.longitude != null)
          .map((l) => ({
            id: l.offre_id,
            latitude: l.offres!.latitude!,
            longitude: l.offres!.longitude!,
            score: l.score,
            intitule: l.offres!.intitule,
            entreprise: l.offres!.entreprise,
            lieu: l.offres!.lieu,
            contrat: l.offres!.contrat_libelle || contratLabel(l.offres!.contrat),
            lien: l.offres!.lien,
          }));
        const sansPosition = affichees.length - points.length;
        return (
          <section className="flex flex-col gap-2">
            <Carte
              offres={points}
              seuil={SEUIL}
              domicile={c.latitude != null && c.longitude != null
                ? { latitude: c.latitude, longitude: c.longitude, rayonKm: c.mobilite_km || 20, ville: c.ville || c.code_postal }
                : null}
            />
            <p className="hint">
              Zoome pour séparer les offres regroupées, clique sur une offre pour voir le détail et le lien.
              {c.latitude == null && " Ta commune n'a pas pu être placée : vérifie ton code postal dans ton profil."}
              {sansPosition > 0 && ` ${sansPosition} offre${sansPosition > 1 ? "s" : ""} sans adresse précise n'apparai${sansPosition > 1 ? "ssent" : "t"} que dans la liste.`}
            </p>
          </section>
        );
      })()}

      {!affichees.length && !c.recherche_en_cours && (
        <div className="card flex flex-col gap-2 border-dashed p-6">
          <h2 className="text-lg font-semibold">Pas encore d&apos;offre à te montrer</h2>
          <p className="max-w-[60ch] text-sm text-muted">
            On relance la recherche chaque jour et on te prévient par email dès qu&apos;une offre te correspond.
            Pour élargir les résultats, augmente ta distance maximale ou ajoute un type de contrat dans ton profil.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {affichees.map((l) => {
          const o = l.offres!;
          return (
            <li key={l.offre_id} id={`offre-${l.offre_id}`} className={`card scroll-mt-4 grid gap-4 p-5 md:grid-cols-[5rem_1fr_13rem] ${l.score < SEUIL ? "opacity-75" : ""}`}>
              <Score score={l.score} seuil={SEUIL} />
              <div className="flex min-w-0 flex-col gap-1.5">
                <h2 className="text-lg font-semibold">{o.intitule}</h2>
                <p className="text-sm text-muted">
                  {[o.entreprise, o.lieu, o.contrat_libelle || contratLabel(o.contrat), o.salaire].filter(Boolean).join(" · ")}
                </p>
                {l.resume && <p className="text-sm">{l.resume}</p>}
                <Chips forts={l.forts} manques={l.manques} />
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm">
                  <span className="chip">{sourceLabel(o.source)}</span>
                  {o.lien ? (
                    <a className="font-semibold text-accent" href={o.lien} target="_blank" rel="noopener noreferrer">Voir l&apos;annonce</a>
                  ) : (
                    <span className="text-muted">Indique que ça t&apos;intéresse : ton école fait le lien avec l&apos;entreprise.</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="eyebrow">Ton avis</span>
                <div className="flex flex-wrap gap-1.5">
                  {AVIS.filter((a) => a.id !== "nouveau").map((a) => (
                    <form key={a.id} action={donnerAvis}>
                      <input type="hidden" name="offre_id" value={l.offre_id} />
                      <input type="hidden" name="avis" value={a.id} />
                      <button className={`btn btn-sm ${l.avis_candidat === a.id ? "border-accent bg-accent-soft text-accent" : ""}`} aria-pressed={l.avis_candidat === a.id}>
                        {a.label}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

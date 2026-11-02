import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { iaConfiguree, noterOffres, type Note } from "@/lib/ia";
import { franceTravailConfigure, offresPourCandidat } from "@/lib/france-travail";
import { adzunaConfigure, offresAdzunaPourCandidat } from "@/lib/adzuna";
import { envoyerEmail, echapper } from "@/lib/email";
import { distanceKm, localiserLieu } from "@/lib/geo";
import { SEUIL, SOURCES_AUTO, type Candidat, type Offre, type Correspondance } from "@/lib/types";

const PAR_APPEL = 8;      // offres notées par appel à l'IA
const MAX_PAR_RUN = 32;   // offres notées au maximum par recherche (maîtrise des coûts)

async function parLots<T>(items: T[], concurrence: number, fn: (t: T) => Promise<void>) {
  const file = [...items];
  await Promise.all(
    Array.from({ length: Math.min(concurrence, file.length) }, async () => {
      while (file.length) await fn(file.shift()!);
    }),
  );
}

/** Offre ouverte, du bon type de contrat, et pas trop loin de chez le candidat (si on connaît les deux positions). */
function compatible(c: Candidat, o: Offre) {
  if (!o.ouverte) return false;
  if (o.ecole_id && o.ecole_id !== c.ecole_id) return false; // offre partenaire réservée aux étudiants de cette école
  if (c.contrats.length && o.contrat && !c.contrats.includes(o.contrat)) return false;
  if (c.latitude != null && c.longitude != null && o.latitude != null && o.longitude != null) {
    const km = distanceKm({ latitude: c.latitude, longitude: c.longitude }, { latitude: o.latitude, longitude: o.longitude });
    if (km > (c.mobilite_km || 20) + 15) return false; // marge de 15 km : l'IA juge le reste
  }
  return true;
}

async function enregistrerNotes(candidatId: string, notes: Note[]) {
  if (!notes.length) return;
  const db = createAdminClient();
  const { error } = await db.from("correspondances").upsert(
    notes.map((n) => ({
      candidat_id: candidatId,
      offre_id: n.offre_id,
      score: n.score,
      forts: n.forts,
      manques: n.manques,
      resume: n.resume,
      calcule_le: new Date().toISOString(),
    })),
    { onConflict: "candidat_id,offre_id" },
  );
  if (error) throw error;
}

/** Envoie un email récapitulatif des nouvelles offres au-dessus du seuil. */
async function notifier(c: Candidat) {
  if (!c.alertes_email) return;
  const db = createAdminClient();
  const { data } = await db
    .from("correspondances")
    .select("score, offre_id, offres(intitule, entreprise, lieu, contrat_libelle)")
    .eq("candidat_id", c.user_id)
    .gte("score", SEUIL)
    .is("notifie_le", null)
    .order("score", { ascending: false });
  if (!data?.length) return;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const lignes = data
    .map((m) => {
      const o = m.offres as unknown as Pick<Offre, "intitule" | "entreprise" | "lieu" | "contrat_libelle">;
      return `<li><b>${m.score} %</b> · ${echapper(o.intitule)} — ${echapper(o.entreprise || "Entreprise")} (${echapper(o.lieu)})</li>`;
    })
    .join("");
  const ok = await envoyerEmail(
    c.email,
    data.length > 1 ? `${data.length} offres correspondent à ton profil` : "Une offre correspond à ton profil",
    `<p>Bonjour ${echapper(c.nom.split(" ")[0] || "")},</p>
     <p>Nous avons trouvé ${data.length > 1 ? "des offres qui correspondent" : "une offre qui correspond"} à ton profil à ${SEUIL} % ou plus :</p>
     <ul>${lignes}</ul>
     <p><a href="${site}/espace">Voir le détail et donner ton avis</a></p>`,
  );
  if (ok) {
    await db
      .from("correspondances")
      .update({ notifie_le: new Date().toISOString() })
      .eq("candidat_id", c.user_id)
      .in("offre_id", data.map((m) => m.offre_id));
  }
}

/** Enregistre (ou met à jour) des offres importées et renvoie leurs identifiants. */
async function importerOffres(importees: (Record<string, unknown> & { latitude?: number | null; longitude?: number | null })[]) {
  if (!importees.length) return [];
  const db = createAdminClient();
  let { data: up, error } = await db.from("offres").upsert(importees, { onConflict: "source,source_id" }).select("id");
  if (error && /latitude|longitude/.test(error.message)) {
    // Base pas encore à jour pour la carte : on importe sans les coordonnées
    const sansGPS = importees.map(({ latitude: _a, longitude: _b, ...o }) => (void _a, void _b, o));
    ({ data: up, error } = await db.from("offres").upsert(sansGPS, { onConflict: "source,source_id" }).select("id"));
  }
  if (error) throw new Error(error.message);
  return (up ?? []).map((o) => o.id as string);
}

/**
 * Recherche complète pour un candidat :
 * 1. récupère les offres France Travail qui collent à ses critères,
 * 2. y ajoute les offres partenaires et annonces collées,
 * 3. fait noter par l'IA celles qui ne l'ont pas encore été,
 * 4. envoie un email s'il y a de nouvelles offres au-dessus du seuil.
 */
export async function rechercherPourCandidat(candidatId: string) {
  const db = createAdminClient();
  const { data: c } = await db.from("candidats").select("*").eq("user_id", candidatId).single<Candidat>();
  if (!c || !c.consentement) return { notees: 0, erreur: null as string | null };

  await db.from("candidats").update({ recherche_en_cours: true }).eq("user_id", candidatId);
  let erreur: string | null = null;
  let notees = 0;
  try {
    // 1. Sources automatiques : France Travail et Adzuna (une source en panne n'empêche pas l'autre)
    const idsAuto: string[] = [];
    const sources = [
      { nom: "France Travail", actif: franceTravailConfigure(), chercher: () => offresPourCandidat(c) },
      { nom: "Adzuna", actif: adzunaConfigure(), chercher: () => offresAdzunaPourCandidat(c) },
    ];
    if (c.mots_cles || c.poste_vise) {
      for (const src of sources.filter((x) => x.actif)) {
        try {
          idsAuto.push(...(await importerOffres(await src.chercher())));
        } catch (e) {
          erreur = `${src.nom} : ${e instanceof Error ? e.message : "indisponible"}`;
        }
      }
    }

    // 2. Offres de l'équipe + offres trouvées automatiquement
    const { data: internes } = await db.from("offres").select("*").not("source", "in", `(${SOURCES_AUTO.join(",")})`).eq("ouverte", true);
    const { data: ft } = idsAuto.length
      ? await db.from("offres").select("*").in("id", idsAuto)
      : { data: [] as Offre[] };
    const { data: deja } = await db.from("correspondances").select("offre_id, calcule_le").eq("candidat_id", c.user_id);
    const calculees = new Map((deja ?? []).map((m) => [m.offre_id as string, m.calcule_le as string]));

    // Offres de l'équipe pas encore placées sur la carte : on les localise (10 par recherche)
    const aLocaliser = ((internes ?? []) as Offre[]).filter((o) => o.lieu && o.latitude == null && "latitude" in o).slice(0, 10);
    for (const o of aLocaliser) {
      const p = await localiserLieu(o.lieu);
      if (p) {
        Object.assign(o, p);
        await db.from("offres").update(p).eq("id", o.id);
      }
    }

    const aNoter = [...(internes ?? []), ...(ft ?? [])]
      .filter((o: Offre) => compatible(c, o))
      .filter((o: Offre) => {
        const t = calculees.get(o.id);
        return !t || t < c.updated_at || t < o.updated_at;
      })
      .slice(0, MAX_PAR_RUN) as Offre[];

    // 3. Notation par l'IA (ignorée tant que la clé n'est pas renseignée)
    if (!iaConfiguree()) aNoter.length = 0;
    const lots: Offre[][] = [];
    for (let i = 0; i < aNoter.length; i += PAR_APPEL) lots.push(aNoter.slice(i, i + PAR_APPEL));
    await parLots(lots, 3, async (lot) => {
      const notes = await noterOffres(c, lot);
      await enregistrerNotes(c.user_id, notes);
      notees += notes.length;
    });

    // 4. Alerte email
    await notifier(c);
  } catch (e) {
    erreur = e instanceof Error ? e.message : "Erreur inconnue";
  } finally {
    await db
      .from("candidats")
      .update({ recherche_en_cours: false, derniere_recherche: new Date().toISOString() })
      .eq("user_id", candidatId);
  }
  return { notees, erreur };
}

/** Quand l'équipe ajoute ou modifie une offre : la compare à tous les candidats concernés. */
export async function noterOffrePourTous(offreId: string) {
  const db = createAdminClient();
  if (!iaConfiguree()) return;
  const { data: o } = await db.from("offres").select("*").eq("id", offreId).single<Offre>();
  if (!o || !o.ouverte) return;
  let requete = db.from("candidats").select("*").eq("consentement", true);
  if (o.ecole_id) requete = requete.eq("ecole_id", o.ecole_id);
  const { data: candidats } = await requete;
  const cibles = ((candidats ?? []) as Candidat[]).filter((c) => compatible(c, o));
  await parLots(cibles, 4, async (c) => {
    try {
      await enregistrerNotes(c.user_id, await noterOffres(c, [o]));
      await notifier(c);
    } catch {
      /* un échec n'empêche pas les autres candidats */
    }
  });
}

/** Recherche quotidienne pour tous les candidats (appelée par la tâche planifiée). */
export async function rechercheQuotidienne(budgetMs = 240_000) {
  const debut = Date.now();
  const db = createAdminClient();
  const { data } = await db
    .from("candidats")
    .select("user_id")
    .eq("consentement", true)
    .order("derniere_recherche", { ascending: true, nullsFirst: true });
  const ids = (data ?? []).map((d) => d.user_id as string);
  let faits = 0;
  await parLots(ids, 4, async (id) => {
    if (Date.now() - debut > budgetMs) return;
    await rechercherPourCandidat(id);
    faits++;
  });
  return { faits, total: ids.length };
}

export type { Correspondance };

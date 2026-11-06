import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { iaConfiguree, noterOffres, proposerPistes, type Note, type Refus } from "@/lib/ia";
import { franceTravailConfigure, offresPourCandidat } from "@/lib/france-travail";
import { adzunaConfigure, offresAdzunaPourCandidat } from "@/lib/adzuna";
import { lbaConfigure, offresLBAPourCandidat } from "@/lib/la-bonne-alternance";
import { estAdmis } from "@/lib/admission";
import { envoyerEmail, echapper } from "@/lib/email";
import { distanceKm, localiserLieu } from "@/lib/geo";
import { avecDisc } from "@/lib/tests-serveur";
import { SEUIL, SOURCES_AUTO, type Candidat, type Offre, type Correspondance, type Piste, type Recherche } from "@/lib/types";

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

async function enregistrerNotes(candidatId: string, notes: Note[], origine: { recherche_id?: string | null; piste?: string | null } = {}) {
  if (!notes.length) return;
  const db = createAdminClient();
  const lignes = notes.map((n) => ({
    candidat_id: candidatId,
    offre_id: n.offre_id,
    score: n.score,
    forts: n.forts,
    manques: n.manques,
    resume: n.resume,
    calcule_le: new Date().toISOString(),
    recherche_id: origine.recherche_id ?? null,
    piste: origine.piste ?? null,
  }));
  let { error } = await db.from("correspondances").upsert(lignes, { onConflict: "candidat_id,offre_id" });
  if (error && /recherche_id|piste/.test(error.message)) {
    // Base pas encore à jour : on enregistre sans l'origine
    ({ error } = await db.from("correspondances").upsert(
      lignes.map(({ recherche_id: _r, piste: _p, ...l }) => (void _r, void _p, l)),
      { onConflict: "candidat_id,offre_id" },
    ));
  }
  if (error) throw error;
}

/** Envoie un email récapitulatif des nouvelles offres au-dessus du seuil. */
async function notifier(c: Candidat) {
  if (!c.alertes_email) return;
  const db = createAdminClient();
  const requete = (sansPistes: boolean) => {
    let q = db
      .from("correspondances")
      .select("score, offre_id, offres!inner(intitule, entreprise, lieu, contrat_libelle, source)")
      .in("offres.source", SOURCES_AUTO) // les offres de l'équipe passent par l'équipe, pas par l'email
      .eq("candidat_id", c.user_id)
      .gte("score", SEUIL)
      .is("notifie_le", null);
    if (sansPistes) q = q.is("piste", null); // les pistes sont proposées dans son espace, sans email
    return q.order("score", { ascending: false });
  };
  const premier = await requete(true);
  const data = premier.error ? (await requete(false)).data : premier.data; // base pas encore à jour
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
    { nomExpediteur: "MagnusMatch" },
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

/** Offres écartées par le candidat avec leur raison : l'IA s'en sert pour ne pas refaire les mêmes erreurs. */
async function refusDuCandidat(candidatId: string): Promise<{ refus: Refus[]; ids: Set<string> }> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("correspondances")
    .select("offre_id, raison_refus, offres(intitule, entreprise, lieu, contrat_libelle, contrat)")
    .eq("candidat_id", candidatId)
    .eq("avis_candidat", "pas_interesse")
    .order("calcule_le", { ascending: false })
    .limit(30);
  if (error || !data) return { refus: [], ids: new Set() };
  const ids = new Set(data.map((d) => d.offre_id as string));
  const refus = data
    .filter((d) => d.raison_refus)
    .slice(0, 15)
    .map((d) => {
      const o = d.offres as unknown as { intitule: string; entreprise: string; lieu: string; contrat_libelle: string; contrat: string } | null;
      return { intitule: o?.intitule ?? "", entreprise: o?.entreprise ?? "", lieu: o?.lieu ?? "", contrat: o?.contrat_libelle || o?.contrat || "", raison: d.raison_refus as string };
    });
  return { refus, ids };
}

/**
 * Recherche complète pour un candidat :
 * 1. récupère les offres France Travail qui collent à ses critères,
 * 2. y ajoute les offres partenaires et annonces collées,
 * 3. fait noter par l'IA celles qui ne l'ont pas encore été,
 * 4. envoie un email s'il y a de nouvelles offres au-dessus du seuil.
 */
/** Le candidat vu à travers une recherche donnée (métier, contrats, distance de cette recherche). */
function selon(c: Candidat, r: { poste: string; mots_cles: string; contrats: string[]; mobilite_km: number }): Candidat {
  return { ...c, poste_vise: r.poste, mots_cles: r.mots_cles || r.poste, contrats: r.contrats.length ? r.contrats : c.contrats, mobilite_km: r.mobilite_km || c.mobilite_km };
}

/** Recherche principale (profil) + recherches supplémentaires actives. */
export async function recherchesDuCandidat(c: Candidat): Promise<Recherche[]> {
  const principale: Recherche = { id: "principale", poste: c.poste_vise, mots_cles: c.mots_cles, contrats: c.contrats, mobilite_km: c.mobilite_km, active: true };
  const { data, error } = await createAdminClient().from("recherches").select("*").eq("candidat_id", c.user_id).eq("active", true).order("created_at");
  return [principale, ...(error ? [] : ((data ?? []) as Recherche[]))];
}

const MAX_PISTES_PAR_RUN = 8; // offres « pistes » notées par recherche

/**
 * Recherche complète pour un candidat :
 * 1. pour chacune de ses recherches, récupère les offres France Travail, Adzuna et La bonne alternance,
 * 2. y ajoute les offres de l'équipe,
 * 3. cherche aussi des offres pour 2 métiers voisins (« pistes ») tirés de son expérience,
 * 4. fait noter par l'IA ce qui ne l'a pas encore été,
 * 5. envoie un email s'il y a de nouvelles offres au-dessus du seuil (hors pistes).
 */
export async function rechercherPourCandidat(candidatId: string) {
  const db = createAdminClient();
  const { data: brut } = await db.from("candidats").select("*").eq("user_id", candidatId).single<Candidat>();
  if (!brut || !brut.consentement) return { notees: 0, erreur: null as string | null };
  if (!estAdmis(brut)) {
    // Pas encore admis : pas de recherche d'offres (ni de coût d'IA) tant que l'équipe n'a pas validé
    await db.from("candidats").update({ recherche_en_cours: false }).eq("user_id", candidatId);
    return { notees: 0, erreur: null as string | null };
  }
  const c = await avecDisc(brut); // son profil DISC affine légèrement les notes

  await db.from("candidats").update({ recherche_en_cours: true }).eq("user_id", candidatId);
  let erreur: string | null = null;
  let notees = 0;
  try {
    const recherches = (await recherchesDuCandidat(c)).filter((r) => r.poste || r.mots_cles);
    const { refus, ids: ecartees } = await refusDuCandidat(c.user_id);
    const { data: deja } = await db.from("correspondances").select("offre_id, calcule_le").eq("candidat_id", c.user_id);
    const calculees = new Map((deja ?? []).map((m) => [m.offre_id as string, m.calcule_le as string]));
    const aRenoter = (o: Offre) => {
      const t = calculees.get(o.id);
      return !ecartees.has(o.id) && (!t || t < c.updated_at || t < o.updated_at);
    };

    // Va chercher les offres des sources automatiques pour un candidat « vu à travers » une recherche
    const importer = async (cr: Candidat): Promise<Offre[]> => {
      const ids: string[] = [];
      for (const src of [
        { nom: "France Travail", actif: franceTravailConfigure(), chercher: () => offresPourCandidat(cr) },
        { nom: "Adzuna", actif: adzunaConfigure(), chercher: () => offresAdzunaPourCandidat(cr) },
        { nom: "La bonne alternance", actif: lbaConfigure(), chercher: () => offresLBAPourCandidat(cr, franceTravailConfigure()) },
      ].filter((x) => x.actif)) {
        try {
          ids.push(...(await importerOffres(await src.chercher())));
        } catch (e) {
          erreur = `${src.nom} : ${e instanceof Error ? e.message : "indisponible"}`;
        }
      }
      if (!ids.length) return [];
      const { data } = await db.from("offres").select("*").in("id", ids);
      return (data ?? []) as Offre[];
    };

    // 1. Chaque recherche du candidat. Une offre trouvée par plusieurs recherches n'est notée qu'une fois.
    type Groupe = { cr: Candidat; recherche_id: string | null; piste: string | null; contexte: string; offres: Offre[] };
    const groupes: Groupe[] = [];
    const prises = new Set<string>();
    let budget = MAX_PAR_RUN;
    for (const r of recherches) {
      const cr = selon(c, r);
      const g: Groupe = { cr, recherche_id: r.id === "principale" ? null : r.id, piste: null, contexte: "", offres: [] };
      for (const o of await importer(cr)) {
        if (budget <= 0) break;
        if (prises.has(o.id) || !compatible(cr, o) || !aRenoter(o)) continue;
        prises.add(o.id); g.offres.push(o); budget--;
      }
      groupes.push(g);
    }

    // 2. Offres de l'équipe : rattachées à la première recherche avec laquelle elles sont compatibles
    const { data: internes } = await db.from("offres").select("*").not("source", "in", `(${SOURCES_AUTO.join(",")})`).eq("ouverte", true);
    const aLocaliser = ((internes ?? []) as Offre[]).filter((o) => o.lieu && o.latitude == null && "latitude" in o).slice(0, 10);
    for (const o of aLocaliser) {
      const p = await localiserLieu(o.lieu);
      if (p) {
        Object.assign(o, p);
        await db.from("offres").update(p).eq("id", o.id);
      }
    }
    for (const o of (internes ?? []) as Offre[]) {
      if (prises.has(o.id) || !aRenoter(o)) continue;
      const g = groupes.find((x) => compatible(x.cr, o));
      if (g) { prises.add(o.id); g.offres.push(o); }
    }

    // 3. Pistes : métiers voisins tirés de son expérience (renouvelées tous les 30 jours)
    let pistes = (c.pistes ?? []) as Piste[];
    const vieilles = !c.pistes_le || Date.now() - new Date(c.pistes_le).getTime() > 30 * 864e5;
    if (iaConfiguree() && c.cv_texte && (vieilles || !pistes.some((p) => !p.ecartee))) {
      try {
        const nouvelles = await proposerPistes(c, recherches.map((r) => r.poste), pistes.filter((p) => p.ecartee).map((p) => p.metier));
        pistes = [...pistes.filter((p) => p.ecartee), ...nouvelles];
        const { error: e } = await db.from("candidats").update({ pistes, pistes_le: new Date().toISOString() }).eq("user_id", c.user_id);
        if (e) pistes = []; // base pas encore à jour : pas de pistes
      } catch {
        /* pas de pistes cette fois */
      }
    }
    let budgetPistes = MAX_PISTES_PAR_RUN;
    const contratsTous = [...new Set(recherches.flatMap((r) => r.contrats))];
    const distanceMax = Math.max(...recherches.map((r) => r.mobilite_km || 0), c.mobilite_km);
    for (const p of pistes.filter((x) => !x.ecartee).slice(0, 2)) {
      const cr = selon(c, { poste: p.metier, mots_cles: p.mots_cles, contrats: contratsTous, mobilite_km: distanceMax });
      const g: Groupe = {
        cr, recherche_id: null, piste: p.metier,
        contexte: `PISTE PROPOSÉE PAR MAGNUSMATCH : le candidat n'a PAS demandé le métier « ${p.metier} ». C'est un métier voisin de son expérience (${p.raison}).
Pour ces offres, le critère « cohérence avec le poste visé et le projet » devient « cohérence avec son expérience réelle et ses compétences transférables ».
Dans le résumé, explique en une phrase le lien avec une expérience PRÉCISE de son CV (ex. « Tes 2 ans en boulangerie… »).`,
        offres: [],
      };
      for (const o of await importer(cr)) {
        if (budgetPistes <= 0) break;
        if (prises.has(o.id) || calculees.has(o.id) || ecartees.has(o.id) || !compatible(cr, o)) continue;
        prises.add(o.id); g.offres.push(o); budgetPistes--;
      }
      groupes.push(g);
    }

    // 4. Notation par l'IA (ignorée tant que la clé n'est pas renseignée)
    if (iaConfiguree()) {
      const lots: { g: Groupe; offres: Offre[] }[] = [];
      for (const g of groupes) for (let i = 0; i < g.offres.length; i += PAR_APPEL) lots.push({ g, offres: g.offres.slice(i, i + PAR_APPEL) });
      await parLots(lots, 3, async ({ g, offres }) => {
        const notes = await noterOffres(g.cr, offres, refus, g.contexte);
        await enregistrerNotes(c.user_id, notes, { recherche_id: g.recherche_id, piste: g.piste });
        notees += notes.length;
      });
    }

    // 5. Alerte email
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
  const cibles = ((candidats ?? []) as Candidat[]).filter((c) => estAdmis(c) && compatible(c, o));
  await parLots(cibles, 4, async (sansDisc) => {
    const c = await avecDisc(sansDisc);
    try {
      await enregistrerNotes(c.user_id, await noterOffres(c, [o], (await refusDuCandidat(c.user_id)).refus));
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

import "server-only";
import { emailsEquipe, type Acces } from "@/lib/equipe";
import { createAdminClient } from "@/lib/supabase/admin";
import { memeEntreprise } from "@/lib/prospections";
import { nouveauJeton, VALIDITE_JOURS } from "@/lib/fiche-besoin";
import { envoyerEmail, moyenEnvoi, texteEnHtml } from "@/lib/email";
import { AIDES, lireParcours, type Parcours } from "@/lib/alumni";

const db = () => createAdminClient();

/** Notification 🔔 pour l'équipe (admins + responsables de l'école), sur la fiche du candidat. */
export async function notifierEquipe(candidatId: string, resume: string, action: string, roles?: Acces[]) {
  try {
    const base = db();
    const { data: c } = await base.from("candidats").select("ecole_id").eq("user_id", candidatId).maybeSingle();
    const admins = await emailsEquipe(roles);
    const { data: resp } = c?.ecole_id ? await base.from("responsables").select("email").eq("ecole_id", c.ecole_id) : { data: [] };
    const destinataires = [...new Set([...admins, ...(resp ?? []).map((r) => (r.email as string).toLowerCase())])];
    if (!destinataires.length) return;
    const maintenant = new Date().toISOString();
    await base.from("echanges").insert(destinataires.map((auteur) => ({
      candidat_id: candidatId, type: "autre", date_echange: maintenant, resume, action,
      action_le: maintenant.slice(0, 10), action_a: maintenant, auteur,
    })));
  } catch {
    /* une notification ne bloque jamais l'alumni */
  }
}

type Alumni = { user_id: string; nom: string; email: string; telephone: string; diplome_annee?: number | null; formation: string };

const promo = (c: Alumni) => [c.formation, c.diplome_annee].filter(Boolean).join(" ");

/**
 * L'entreprise de l'alumni arrive dans « Mes entreprises » (ou est retrouvée si elle y est déjà),
 * avec l'alumni comme contact s'il n'y en a pas encore. Renvoie l'id de l'entreprise.
 */
export async function lierEntrepriseAlumni(c: Alumni, p: Parcours): Promise<string | null> {
  if (!p.entreprise.trim()) return null;
  const base = db();
  const { data: toutes } = await base.from("entreprises").select("id, nom, contact_nom, contact_email, ville");
  const existante = (toutes ?? []).find((e) => memeEntreprise(e.nom as string, p.entreprise));
  const qui = `${c.nom || c.email} (alumni${promo(c) ? ` ${promo(c)}` : ""})`;
  let id = existante?.id as string | undefined;
  if (!existante) {
    const { data, error } = await base.from("entreprises").insert({
      nom: p.entreprise.trim().slice(0, 150), ville: p.ville.slice(0, 100), statut: "rencontree", origine: "Alumni",
      contact_nom: c.nom, contact_fonction: p.poste.slice(0, 150), contact_email: c.email, contact_tel: c.telephone ?? "",
      notes: `Ajoutée automatiquement : ${qui} y travaille.`, auteur: "alumni",
    }).select("id").single();
    if (error || !data) return null;
    id = data.id as string;
  } else if (!existante.contact_nom && !existante.contact_email) {
    await base.from("entreprises").update({ contact_nom: c.nom, contact_fonction: p.poste.slice(0, 150), contact_email: c.email, contact_tel: c.telephone ?? "" }).eq("id", id!);
  }
  await base.from("echanges").insert({
    entreprise_id: id, type: "autre", date_echange: new Date().toISOString(), auteur: "",
    resume: `🎓 ${qui} travaille ici${p.poste ? ` comme ${p.poste}` : ""}. Contact : ${c.email}${c.telephone ? ` · ${c.telephone}` : ""}`,
  });
  return id ?? null;
}

/** Lien de la fiche besoin de l'entreprise (créé ou renouvelé s'il a expiré). */
export async function lienBesoinEntreprise(entrepriseId: string): Promise<string | null> {
  const base = db();
  const { data: e } = await base.from("entreprises").select("jeton_besoin, besoin_envoye_le").eq("id", entrepriseId).maybeSingle();
  if (!e) return null;
  const valide = e.jeton_besoin && e.besoin_envoye_le && Date.now() - new Date(e.besoin_envoye_le as string).getTime() < (VALIDITE_JOURS - 2) * 864e5;
  if (valide) return `/besoin/${e.jeton_besoin}`;
  const jeton = nouveauJeton();
  const { error } = await base.from("entreprises").update({ jeton_besoin: jeton, besoin_envoye_le: new Date().toISOString() }).eq("id", entrepriseId);
  return error ? null : `/besoin/${jeton}`;
}

export const texteAides = (ids: string[]) => AIDES.filter((a) => ids.includes(a.id)).map((a) => a.label.toLowerCase()).join(", ");

/** Email de bienvenue quand l'équipe passe un étudiant en « Alumni ». */
export async function bienvenueAlumni(c: { email: string; nom: string }) {
  if (!moyenEnvoi()) return false;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return envoyerEmail(c.email, "Bienvenue chez les alumni du Campus Magnus 🎓", texteEnHtml(
    `Bonjour ${c.nom || ""},\n\nFélicitations, tu fais maintenant partie des alumni du Campus Magnus 🎓\n\nTon espace MagnusMatch reste à toi, à vie : tes offres (emploi et alternance), ton CV et ta carte de visite.\n\nPrends 1 minute pour nous dire où tu en es : ${site}/espace/parcours\n\nEt si ton entreprise recrute un jour, tu pourras nous le dire en un clic.\n\nÀ très vite,\nL'équipe du Campus Magnus`));
}

/** Une fois par an : « Où en es-tu ? » aux alumni dont le parcours n'a pas bougé depuis 1 an. */
export async function rappelsAnnuelsAlumni(): Promise<number> {
  if (!moyenEnvoi()) return 0;
  const base = db();
  const { data, error } = await base.from("candidats").select("user_id, email, nom, parcours, alumni_rappel_le").eq("statut_admission", "alumni");
  if (error) return 0;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const unAn = 365 * 864e5;
  let n = 0;
  for (const c of (data ?? []) as { user_id: string; email: string; nom: string; parcours: unknown; alumni_rappel_le: string | null }[]) {
    const dates = [lireParcours(c.parcours)?.maj_le, c.alumni_rappel_le].filter(Boolean).map((d) => new Date(d!).getTime());
    if (!dates.length) {
      // Pas encore de date de référence : on démarre le compteur aujourd'hui
      await base.from("candidats").update({ alumni_rappel_le: new Date().toISOString() }).eq("user_id", c.user_id);
      continue;
    }
    if (Date.now() - Math.max(...dates) < unAn) continue;
    const ok = await envoyerEmail(c.email, "Où en es-tu ? 🎓 Des nouvelles pour le Campus Magnus", texteEnHtml(
      `Bonjour ${c.nom || ""},\n\nCela fait un an que tu ne nous as pas donné de nouvelles : où en es-tu aujourd'hui ?\n\nMets ton parcours à jour en 1 minute : ${site}/espace/parcours\n\nEt si ton entreprise cherche un alternant, dis-le-nous : nos étudiants seront ravis de la rencontrer.\n\nMerci et à bientôt,\nL'équipe du Campus Magnus`));
    if (ok) {
      await base.from("candidats").update({ alumni_rappel_le: new Date().toISOString() }).eq("user_id", c.user_id);
      n++;
    }
  }
  return n;
}

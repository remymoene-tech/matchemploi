import "server-only";
import { emailsEquipe } from "@/lib/equipe";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail, moyenEnvoi, texteEnHtml } from "@/lib/email";
import { BROCHURES_PAR_DEFAUT, lireFormations } from "@/lib/formations";

/** Leads (prospects) : personnes qui ont demandé une brochure ou rencontrées en salon, JPO… */
export const STATUTS_LEAD = [
  { id: "nouveau", label: "🆕 Nouveau", chip: "chip-tag" },
  { id: "contacte", label: "📞 Contacté", chip: "chip-tag" },
  { id: "rdv", label: "📅 RDV / JPO", chip: "chip-tag" },
  { id: "dossier", label: "📝 Dossier envoyé", chip: "chip-tag" },
  { id: "convoque", label: "📨 Convoqué au concours", chip: "chip-tag" },
  { id: "present", label: "✍️ Présent au concours", chip: "chip-tag" },
  { id: "absent", label: "🚫 Absent au concours", chip: "chip-minus" },
  { id: "admis", label: "✅ Admis", chip: "chip-plus" },
  { id: "perdu", label: "❌ Perdu", chip: "chip-minus" },
] as const;

/** Étapes du concours : la date de passage est gardée pour calculer les taux de conversion. */
export const ETAPES_CONCOURS = ["convoque", "present", "admis"] as const;
const ANCIENS: Record<string, string> = { inscrit: "admis", entretien: "convoque" };

/** Dates d'étape à enregistrer quand le statut change (on n'écrase jamais une date déjà connue). */
export function datesEtapes(avant: Partial<Lead> | null, statut: string) {
  const maintenant = new Date().toISOString();
  const d: Record<string, string> = {};
  const atteint = (e: string) => statut === e || (e === "convoque" && ["present", "absent", "admis"].includes(statut)) || (e === "present" && statut === "admis");
  for (const e of ETAPES_CONCOURS) if (atteint(e) && !avant?.[`${e}_le` as keyof Lead]) d[`${e}_le`] = maintenant;
  return d;
}

export const MOTIFS_PERTE = ["A choisi une autre école", "Projet abandonné ou reporté", "Ne répond plus", "Pas d'entreprise d'accueil trouvée", "Formation ne correspond pas", "Raisons financières", "Déménagement"] as const;

export const ORIGINES_LEAD = ["Brochure (site de l'école)", "Journée portes ouvertes", "Salon", "Téléphone", "Réseaux sociaux", "Recommandation", "Autre"] as const;

export type Lead = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  formation: string;
  annee_rentree: number | null;
  origine: string;
  statut: string;
  ecole_id: string | null;
  candidat_id: string | null;
  consentement: boolean;
  brochure_envoyee_le: string | null;
  convoque_le?: string | null;
  present_le?: string | null;
  admis_le?: string | null;
  /** Entretien d'admission (concours) : date et heure, rappel envoyé la veille. */
  entretien_a?: string | null;
  rappel_entretien_envoye?: boolean;
  notes: string;
  /** Motif quand le lead est « Perdu ». */
  motif_perte?: string | null;
  /** Membre de l'équipe qui suit ce lead (email) : il est le seul à recevoir ses notifications. */
  attribue_a?: string | null;
  attribue_le?: string | null;
  created_at: string;
  updated_at: string;
};

export const statutLead = (id: string) => STATUTS_LEAD.find((s) => s.id === (ANCIENS[id] ?? id)) ?? STATUTS_LEAD[0];
export const estLeadAdmis = (l: { statut: string }) => l.statut === "admis" || l.statut === "inscrit";
export const nomLead = (l: Pick<Lead, "prenom" | "nom" | "email">) => [l.prenom, l.nom].filter(Boolean).join(" ") || l.email;

const db = () => createAdminClient();

export async function listeLeads(): Promise<Lead[] | null> {
  const { data, error } = await db().from("leads").select("*").order("created_at", { ascending: false }).limit(2000);
  return error ? null : ((data ?? []) as Lead[]);
}

export async function leadParId(id: string): Promise<Lead | null> {
  const { data } = await db().from("leads").select("*").eq("id", id).maybeSingle();
  return (data as Lead) ?? null;
}

/** Brochure à envoyer : celle de la formation, sinon la brochure générale de l'école. Lien public. */
export async function brochurePour(formation: string, ecoleId?: string | null): Promise<string | null> {
  const { data } = await db().from("ecoles").select("*");
  const ecoles = (data ?? []) as { id: string; formations?: unknown; brochure?: string | null }[];
  const ordre = [...ecoles.filter((e) => e.id === ecoleId), ...ecoles.filter((e) => e.id !== ecoleId)];
  const propre = ordre.flatMap((e) => lireFormations(e.formations)).find((f) => f.nom === formation)?.brochure;
  if (propre) return db().storage.from("brochures").getPublicUrl(propre).data.publicUrl;
  if (!BROCHURES_PAR_DEFAUT[formation.toUpperCase()]) {
    const generale = ordre.find((e) => e.brochure)?.brochure;
    if (generale) return db().storage.from("brochures").getPublicUrl(generale).data.publicUrl;
  }
  // Sinon : la brochure fournie avec le site pour cette formation
  const defaut = BROCHURES_PAR_DEFAUT[formation.toUpperCase()];
  return defaut ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://magnusmatch.vercel.app"}${defaut}` : null;
}

/** Envoie la brochure par email. Renvoie true si l'email est parti. */
export async function envoyerBrochure(l: Pick<Lead, "id" | "prenom" | "email" | "formation" | "ecole_id">, lien: string): Promise<boolean> {
  if (!moyenEnvoi()) return false;
  const ok = await envoyerEmail(
    l.email,
    `Votre brochure ${l.formation || "Campus Magnus"}`,
    texteEnHtml(`Bonjour ${l.prenom || ""},

Merci pour votre intérêt pour ${l.formation ? `la formation ${l.formation} du ` : "le "}Campus Magnus.
Voici votre brochure : ${lien}

Une question, un projet d'alternance ? Répondez simplement à cet email, nous vous recontactons rapidement.

À très bientôt,
L'équipe Campus Magnus`),
  );
  if (ok) await db().from("leads").update({ brochure_envoyee_le: new Date().toISOString() }).eq("id", l.id);
  return ok;
}

/** Notification 🔔 à l'équipe : nouveau lead. */
export async function notifierNouveauLead(l: Pick<Lead, "id" | "prenom" | "nom" | "email" | "formation" | "annee_rentree" | "origine">) {
  const admins = await emailsEquipe();
  if (!admins.length) return;
  const maintenant = new Date().toISOString();
  const quoi = [l.formation, l.annee_rentree && `rentrée ${l.annee_rentree}`].filter(Boolean).join(", ");
  await db().from("echanges").insert(admins.map((auteur) => ({
    lead_id: l.id,
    type: "autre",
    date_echange: maintenant,
    resume: `🧲 Nouveau lead : ${nomLead(l)} (${l.origine}${quoi ? ` · ${quoi}` : ""}).`,
    action: `🧲 Nouveau lead : ${nomLead(l)}${quoi ? ` · ${quoi}` : ""} → à contacter`,
    action_le: maintenant.slice(0, 10),
    action_a: maintenant,
    auteur,
  })));
}

/**
 * Lead accepté à l'entretien : il devient candidat. Il reçoit le lien pour créer son espace MagnusMatch
 * (déjà rattaché à son école) ; il sera directement « Admis » en s'inscrivant avec cet email.
 */
export async function envoyerInvitation(l: Pick<Lead, "id" | "prenom" | "email" | "formation" | "ecole_id">): Promise<boolean> {
  if (!moyenEnvoi() || !l.email) return false;
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://magnusmatch.vercel.app";
  let code = "";
  if (l.ecole_id) code = ((await db().from("ecoles").select("code").eq("id", l.ecole_id).maybeSingle()).data?.code as string) ?? "";
  if (!code) code = ((await db().from("ecoles").select("code").ilike("nom", "magnus campus").maybeSingle()).data?.code as string) ?? "";
  const lien = `${base}/inscription?${new URLSearchParams({ ...(code ? { ecole: code } : {}), email: l.email })}`;
  const ok = await envoyerEmail(
    l.email,
    "Félicitations, tu es admis(e) au Campus Magnus 🎉",
    texteEnHtml(`Bonjour ${l.prenom || ""},

Félicitations : ton entretien est validé, tu es admis(e)${l.formation ? ` en ${l.formation}` : ""} au Campus Magnus !

Pour la suite, crée ton espace MagnusMatch (1 minute) : tu y trouveras les offres d'alternance qui te correspondent, des conseils pour ton CV et ton LinkedIn, et tes tests de personnalité.

Créer mon espace : ${lien}

Utilise bien cette adresse email (${l.email}) pour t'inscrire.

À très vite,
L'équipe Campus Magnus`),
  );
  if (ok) await db().from("echanges").insert({ lead_id: l.id, type: "email", resume: "✅ Admis : lien de création d'espace envoyé par email.", auteur: "" });
  return ok;
}

/* ---------- Statistiques de recrutement ---------- */
export type EchangeLead = { lead_id: string; date_echange: string; auteur: string; resume: string; type?: string };

/** Échanges qui comptent comme un contact avec le lead. */
const TYPES_CONTACT = ["telephone", "email", "sms", "rdv"];

/** Premier vrai contact de l'équipe (pas les notifications automatiques ni les emails envoyés par le site). */
export function premierContact(l: Lead, echanges: EchangeLead[]) {
  const premier = echanges
    .filter((e) => e.lead_id === l.id && e.auteur && (e.type ? TYPES_CONTACT.includes(e.type) : true)
      && !/^🧲|^👤|^✅ Admis : lien|^A redemandé|^Rencontré à l'événement/.test(e.resume))
    .map((e) => e.date_echange).sort()[0] ?? null;
  // Appel noté avant la création du lead (lead saisi après coup) : contact immédiat
  return premier && premier < l.created_at ? l.created_at : premier;
}

const rang = (statut: string) => ({ convoque: 1, present: 2, absent: 1, admis: 3 } as Record<string, number>)[ANCIENS[statut] ?? statut] ?? 0;
export const aEteConvoque = (l: Lead) => !!l.convoque_le || rang(l.statut) >= 1;
export const aEtePresent = (l: Lead) => !!l.present_le || rang(l.statut) >= 2;
export const aEteAdmis = (l: Lead) => !!l.admis_le || rang(l.statut) >= 3;

/* ---------- Entretien d'admission (concours) ---------- */
/** « 2026-11-18T14:00 » saisi à l'heure de Paris → instant exact (heure d'été ou d'hiver). */
export function parisVersISO(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const decalage = Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", timeZoneName: "shortOffset" })
    .formatToParts(new Date(utc)).find((x) => x.type === "timeZoneName")?.value.match(/([+-]\d+)/)?.[1];
  return new Date(utc - Number(decalage ?? 1) * 3600e3).toISOString();
}
/** Instant → valeur d'un champ date-heure, à l'heure de Paris. */
export const isoVersParis = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("sv-SE", { timeZone: "Europe/Paris" }).replace(" ", "T").slice(0, 16) : "";
export const dateEntretienTexte = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

const ADRESSE_ECOLE = "Campus Magnus, 45 boulevard Marcellin Berthelot, 13200 Arles";

/** Convocation à l'entretien d'admission (envoyée dès que la date est posée). */
export async function envoyerConvocation(l: Pick<Lead, "id" | "prenom" | "email" | "formation">, entretien: string): Promise<boolean> {
  if (!moyenEnvoi() || !l.email) return false;
  const ok = await envoyerEmail(l.email, "Votre entretien d'admission au Campus Magnus", texteEnHtml(`Bonjour ${l.prenom || ""},

Vous êtes convoqué(e) à votre entretien d'admission${l.formation ? ` pour la formation ${l.formation}` : ""} :

📅 ${dateEntretienTexte(entretien)}
📍 ${ADRESSE_ECOLE}

Pensez à apporter votre CV et vos derniers bulletins. Un empêchement ? Répondez simplement à cet email.

Nous vous enverrons un rappel la veille.

À très bientôt,
L'équipe Campus Magnus`));
  if (ok) await db().from("echanges").insert({ lead_id: l.id, type: "email", resume: `📨 Convocation à l'entretien d'admission envoyée (${dateEntretienTexte(entretien)}).`, auteur: "" });
  return ok;
}

/** Rappels par email la veille de l'entretien d'admission (tâche du matin). */
export async function rappelsEntretiensAdmission() {
  if (!moyenEnvoi()) return 0;
  const maintenant = Date.now();
  const { data, error } = await db().from("leads").select("*")
    .eq("rappel_entretien_envoye", false).not("entretien_a", "is", null)
    .gt("entretien_a", new Date(maintenant).toISOString())
    .lte("entretien_a", new Date(maintenant + 40 * 3600e3).toISOString());
  if (error) return 0;
  let n = 0;
  for (const l of (data ?? []) as Lead[]) {
    if (!["convoque", "entretien"].includes(l.statut) || !l.email) continue;
    const ok = await envoyerEmail(l.email, "Rappel : votre entretien d'admission demain", texteEnHtml(`Bonjour ${l.prenom || ""},

Petit rappel : votre entretien d'admission${l.formation ? ` (${l.formation})` : ""} a lieu ${dateEntretienTexte(l.entretien_a!)}.
📍 ${ADRESSE_ECOLE}

Un empêchement ? Répondez simplement à cet email.

À demain,
L'équipe Campus Magnus`)).catch(() => false);
    if (ok) {
      n++;
      await db().from("leads").update({ rappel_entretien_envoye: true }).eq("id", l.id);
      await db().from("echanges").insert({ lead_id: l.id, type: "email", resume: "⏰ Rappel de l'entretien d'admission envoyé par email (la veille).", auteur: "" });
    }
  }
  return n;
}

/**
 * Attribue un lead à un membre de l'équipe. Les autres membres n'ont plus la notification « Nouveau lead »
 * (elle passe en « faite » chez eux) ; la personne choisie est prévenue si quelqu'un d'autre le lui attribue.
 */
export async function attribuerLead(leadId: string, email: string, par: string): Promise<boolean> {
  const base = db();
  const cle = email.trim().toLowerCase();
  const { data: l } = await base.from("leads").select("id, prenom, nom, email, attribue_a").eq("id", leadId).maybeSingle();
  if (!l) return false;
  if ((l.attribue_a ?? "") === cle) return true;
  const { error } = await base.from("leads").update({ attribue_a: cle || null, attribue_le: cle ? new Date().toISOString() : null }).eq("id", leadId);
  if (error) return false;
  if (!cle) return true;
  // Les autres n'ont plus la notification « Nouveau lead » : seul le responsable du lead la garde
  await base.from("echanges").update({ action_faite: true }).eq("lead_id", leadId).eq("action_faite", false).like("action", "🧲 Nouveau lead%").neq("auteur", cle);
  const maintenant = new Date().toISOString();
  const moi = cle === par.trim().toLowerCase();
  await base.from("echanges").insert({
    lead_id: leadId, type: "autre", date_echange: maintenant, auteur: moi ? "" : cle,
    resume: moi ? `👤 ${par} s'occupe de ce lead.` : `👤 Lead attribué à ${cle} par ${par}.`,
    ...(moi ? {} : { action: `🧲 ${par} t'a attribué le lead ${nomLead(l as Lead)} → à contacter`, action_le: maintenant.slice(0, 10), action_a: maintenant }),
  });
  return true;
}

/** Notification au responsable du lead s'il y en a un, sinon à toute l'équipe. */
export async function notifierSuiviLead(l: Pick<Lead, "id" | "attribue_a">, resume: string, action: string) {
  const dest = l.attribue_a ? [l.attribue_a] : await emailsEquipe();
  if (!dest.length) return;
  const maintenant = new Date().toISOString();
  await db().from("echanges").insert(dest.map((auteur) => ({ lead_id: l.id, type: "autre", date_echange: maintenant, resume, action, action_le: maintenant.slice(0, 10), action_a: maintenant, auteur })));
}

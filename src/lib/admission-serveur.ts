import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail, moyenEnvoi, texteEnHtml } from "@/lib/email";
import { rechercherPourCandidat } from "@/lib/matching";
import { ADMISSIONS, AVEC_MOTIF, type Admission } from "@/lib/admission";
import { bienvenueAlumni } from "@/lib/alumni-serveur";

/** Change le statut d'admission. Passage à « admis » : recherche d'offres lancée + email de bienvenue. */
export async function changerAdmission(candidatId: string, statut: string, motif = ""): Promise<{ erreur?: string }> {
  if (!ADMISSIONS.some((a) => a.id === statut)) return { erreur: "Statut inconnu." };
  if (statut === "abandon" && !motif.trim()) return { erreur: "motif" };
  const db = createAdminClient();
  const { data: avant } = await db.from("candidats").select("email, nom, statut_admission, consentement").eq("user_id", candidatId).maybeSingle();
  let { error } = await db.from("candidats").update({ statut_admission: statut as Admission, motif_admission: AVEC_MOTIF.includes(statut) ? motif.trim().slice(0, 1000) : "" }).eq("user_id", candidatId);
  if (error && /motif_admission/.test(error.message)) ({ error } = await db.from("candidats").update({ statut_admission: statut as Admission }).eq("user_id", candidatId));
  if (error) return { erreur: "La base n'est pas à jour : exécute la mise à jour SQL de la page /diagnostic." };
  if (statut === "admis" && avant?.statut_admission !== "admis") {
    if (avant?.consentement) after(() => rechercherPourCandidat(candidatId));
    if (avant?.email && moyenEnvoi()) {
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
      after(() => envoyerEmail(avant.email, "Bonne nouvelle : tu es admis 🎉",
        texteEnHtml(`Bonjour ${avant.nom || ""},\n\nBonne nouvelle : ton admission est confirmée. Tes offres sont en train d'arriver sur MagnusMatch.\n\nVoir mes offres : ${site}/espace\n\nÀ très vite,\nL'équipe MagnusMatch`)).then(() => undefined));
    }
  }
  // Erreur : c'est un intervenant. Il quitte les candidats et arrive dans le carnet d'adresses des intervenants.
  if (statut === "intervenant" && avant?.statut_admission !== "intervenant") {
    const { data: c } = await db.from("candidats").select("nom, email, telephone, cv_chemin, linkedin_url").eq("user_id", candidatId).maybeSingle();
    if (c?.email) {
      const mots = (c.nom ?? "").trim().split(/\s+/);
      const ligne = {
        prenom: mots.length > 1 ? mots.slice(0, -1).join(" ") : mots[0] ?? "", nom: mots.length > 1 ? mots[mots.length - 1] : "",
        email: (c.email as string).toLowerCase(), telephone: c.telephone ?? "", formation: "", categorie: "intervenant",
        origine: "Requalifié depuis un compte candidat", consentement: true, annee_rentree: null,
        cv_chemin: c.cv_chemin ? `${candidatId}/cv.pdf` : null,
        message: c.linkedin_url ? `LinkedIn : ${c.linkedin_url}` : "",
      };
      const { data: deja } = await db.from("leads").select("id").eq("email", ligne.email).eq("categorie", "intervenant").limit(1);
      const { data: l } = deja?.[0] ? await db.from("leads").select("*").eq("id", deja[0].id).single() : await db.from("leads").insert(ligne).select("*").single();
      if (l && !deja?.[0]) {
        const { notifierContact } = await import("@/lib/leads");
        await notifierContact(l as import("@/lib/leads").Lead).catch(() => undefined);
      }
    }
  }
  if (statut === "alumni" && avant?.statut_admission !== "alumni") {
    await db.from("candidats").update({ alumni_rappel_le: new Date().toISOString() }).eq("user_id", candidatId);
    if (avant?.email) after(() => bienvenueAlumni({ email: avant.email, nom: avant.nom }).then(() => undefined));
  }
  return {};
}

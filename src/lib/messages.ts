import type { Candidat, Correspondance, Offre } from "@/lib/types";

const prenom = (nom: string) => nom.trim().split(/\s+/)[0] ?? "";

/** Message prêt à envoyer à l'étudiant pour lui proposer une offre. */
export function messageEtudiant(c: Candidat, o: Offre, m: Correspondance, ecole: string) {
  const forts = m.forts.map((x) => `• ${x}`).join("\n");
  const manques = m.manques.map((x) => `• ${x}`).join("\n");
  return {
    objet: `${o.contrat_libelle || "Offre"} : ${o.intitule}${o.entreprise ? ` chez ${o.entreprise}` : ""}`,
    texte: `Bonjour ${prenom(c.nom)},

Une offre correspond à ton profil à ${m.score} % :

${o.intitule}${o.entreprise ? ` – ${o.entreprise}` : ""}
Lieu : ${o.lieu || "à préciser"}${o.contrat_libelle ? `\nContrat : ${o.contrat_libelle}` : ""}

Pourquoi ça te correspond :
${forts || "• Ton profil est proche de ce qui est demandé"}
${manques ? `\nPoints à préparer pour l'entretien :\n${manques}\n` : ""}
${o.lien ? `L'annonce : ${o.lien}\n\n` : ""}Est-ce que cette offre t'intéresse ? Réponds-moi et je fais le lien avec l'entreprise.

À bientôt,
${ecole}`,
  };
}

/** Message prêt à envoyer à l'entreprise pour lui présenter l'étudiant. */
export function messageEntreprise(c: Candidat, o: Offre, m: Correspondance, ecole: string) {
  const forts = m.forts.map((x) => `• ${x}`).join("\n");
  return {
    objet: `Candidature pour votre offre « ${o.intitule} »`,
    texte: `Bonjour${o.contact_nom ? ` ${o.contact_nom}` : ""},

Pour votre offre « ${o.intitule} », un(e) étudiant(e) de ${ecole} correspond à ${m.score} % à votre besoin :

Formation : ${c.formation || "à préciser"}${c.contrats.includes("alternance") && c.rythme ? `\nRythme d'alternance : ${c.rythme}` : ""}${c.disponibilite ? `\nDisponible : ${c.disponibilite}` : ""}
Secteur : ${[c.ville, c.code_postal].filter(Boolean).join(" ") || "à préciser"}

Ses points forts pour ce poste :
${forts || "• Profil proche de votre besoin"}

Souhaitez-vous recevoir son CV et organiser un échange ?

Bien cordialement,
${ecole}`,
  };
}

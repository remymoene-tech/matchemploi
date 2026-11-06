import Link from "next/link";
import { admission } from "@/lib/admission";
import type { Candidat } from "@/lib/types";

/** Page « Mes offres » d'un étudiant pas encore admis : il voit son statut et ce qu'il peut déjà faire. */
export function AttenteAdmission({ c }: { c: Candidat }) {
  const a = admission(c.statut_admission);
  const messages: Record<string, string> = {
    prospect: "Ton inscription est bien reçue 🙌 L'équipe étudie ton dossier. Dès que tu seras admis, tes offres apparaîtront ici et tu pourras lancer tes recherches.",
    admis_condition: "Tu es admis sous condition 🟡 Ton conseiller va revenir vers toi pour la suite. Tes offres s'ouvriront dès que ton admission sera confirmée.",
    liste_attente: "Tu es sur liste d'attente ⏳ On te prévient dès qu'une place se libère. Tes offres s'ouvriront dès que ton admission sera confirmée.",
  };
  const etapes = [
    { fait: !!(c.formation && c.diplome_annee && c.poste_vise), icone: "🪪", titre: "Compléter mon profil", href: "/espace/profil" },
    { fait: !!c.cv_chemin, icone: "📄", titre: "Déposer mon CV et lire les conseils", href: "/espace/cv" },
    { fait: !!c.linkedin_analyse, icone: "🔗", titre: "Améliorer mon LinkedIn", href: "/espace/reseau" },
    { fait: false, icone: "🧭", titre: "Passer mes tests (DISC et management)", href: "/espace/tests" },
  ];
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">Bonjour {c.nom.split(" ")[0] || ""} 👋</h1>
        <p className="text-muted">Mes offres</p>
      </div>
      <section className="card flex flex-col gap-3 p-6">
        <span className={`chip w-fit ${a.chip}`}>{a.icone} {a.label}</span>
        <p className="text-lg">{messages[a.id] ?? messages.prospect}</p>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">✨ En attendant, prépare-toi</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {etapes.map((e) => (
            <Link key={e.href} href={e.href} className="card flex items-center gap-3 p-4 transition-colors hover:border-accent">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bg text-xl" aria-hidden>{e.icone}</span>
              <span className="flex-1 font-semibold">{e.titre}</span>
              {e.fait ? <span className="chip chip-plus">Fait ✓</span> : <span className="text-accent" aria-hidden>→</span>}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

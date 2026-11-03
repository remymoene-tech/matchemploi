import Link from "next/link";
import { OngletsCartes } from "@/components/OngletsCartes";

/** Onglets de « Mon profil » : Mes infos · CV et réseau (puis CV · Réseau) · Mes tests. */
export function OngletsProfil({ actif }: { actif: "infos" | "cv" | "reseau" | "tests" }) {
  const n1 = actif === "infos" || actif === "tests" ? actif : "cvreseau";
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-extrabold">Mon profil</h1>
      <OngletsCartes label="Mon profil" onglets={[
        { href: "/espace/profil", icone: "🪪", label: "Mes infos", sous: "Coordonnées et projet", actif: n1 === "infos" },
        { href: "/espace/cv", icone: "📄", label: "CV et réseau", sous: "CV et LinkedIn", actif: n1 === "cvreseau" },
        { href: "/espace/tests", icone: "🧭", label: "Mes tests", sous: "DISC et management", actif: n1 === "tests" },
      ]} />
      {n1 === "cvreseau" && (
        <nav className="flex w-fit gap-1 rounded-full bg-accent-soft p-1" aria-label="CV et réseau">
          {([["cv", "Mon CV", "/espace/cv"], ["reseau", "Réseau · LinkedIn", "/espace/reseau"]] as const).map(([id, label, href]) => (
            <Link key={id} href={href}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold ${actif === id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

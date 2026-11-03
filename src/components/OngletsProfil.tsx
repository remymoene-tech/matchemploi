import Link from "next/link";

/** Onglets de « Mon profil » : Mes infos · CV et réseau (puis CV · Réseau). */
export function OngletsProfil({ actif }: { actif: "infos" | "cv" | "reseau" }) {
  const n1 = actif === "infos" ? "infos" : "cvreseau";
  const lien = (on: boolean) =>
    `-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold ${on ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`;
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-3xl font-extrabold">Mon profil</h1>
      <nav className="flex gap-1 overflow-x-auto border-b border-line" aria-label="Mon profil">
        <Link href="/espace/profil" className={lien(n1 === "infos")}>Mes infos</Link>
        <Link href="/espace/cv" className={lien(n1 === "cvreseau")}>CV et réseau</Link>
      </nav>
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

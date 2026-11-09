import { OngletsCartes } from "@/components/OngletsCartes";

/** Onglets de l'espace étudiant ; « Mon parcours » apparaît pour les alumni. */
export function OngletsEspace({ actif, alumni, sousProspections = "Entreprises contactées" }: { actif: "offres" | "prospections" | "parcours"; alumni: boolean; sousProspections?: string }) {
  return (
    <OngletsCartes label="Mes recherches" onglets={[
      { href: "/espace", icone: "💼", label: "Mes offres", sous: "Proposées par MagnusMatch", actif: actif === "offres" },
      { href: "/espace/prospections", icone: "🚪", label: "Mes prospections", sous: sousProspections, actif: actif === "prospections" },
      ...(alumni ? [{ href: "/espace/parcours", icone: "🎓", label: "Mon parcours", sous: "Alumni · où j'en suis", actif: actif === "parcours" }] : []),
    ]} />
  );
}

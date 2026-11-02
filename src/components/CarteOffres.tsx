"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

export type PointOffre = {
  id: string;
  latitude: number;
  longitude: number;
  score: number;
  intitule: string;
  entreprise: string;
  lieu: string;
  contrat: string;
  lien: string;
};
export type Domicile = { latitude: number; longitude: number; rayonKm: number; ville: string };

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function couleur(score: number, seuil: number) {
  return score >= seuil ? "var(--good)" : score >= seuil - 20 ? "var(--warn)" : "var(--bad)";
}

export default function CarteOffres({ offres, domicile, seuil }: { offres: PointOffre[]; domicile: Domicile | null; seuil: number }) {
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let carte: import("leaflet").Map | null = null;
    let annule = false;
    (async () => {
      const L = (await import("leaflet")).default;
      (window as unknown as { L: typeof L }).L = L;
      await import("leaflet.markercluster");
      if (annule || !conteneur.current) return;

      carte = L.map(conteneur.current, { scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(carte);

      // Domicile + rayon de recherche
      let cadre: import("leaflet").LatLngBounds | null = null;
      if (domicile) {
        const centre = L.latLng(domicile.latitude, domicile.longitude);
        L.circle(centre, {
          radius: domicile.rayonKm * 1000,
          color: "#2f7d52", weight: 2, fillColor: "#a9dfbc", fillOpacity: 0.18, dashArray: "6 6",
        }).addTo(carte);
        L.marker(centre, {
          icon: L.divIcon({ className: "", html: '<div class="carte-maison" title="Chez toi">⌂</div>', iconSize: [30, 30], iconAnchor: [15, 48] }),
          zIndexOffset: -1000, // posée juste au-dessus du point, sous les offres
        }).bindTooltip(`${esc(domicile.ville)} · ${domicile.rayonKm} km autour`, { direction: "top" }).addTo(carte);
        cadre = centre.toBounds(domicile.rayonKm * 2000); // calculé sans attendre l'affichage de la carte
      }

      // Offres, regroupées quand on dézoome
      const groupe = L.markerClusterGroup({
        showCoverageOnHover: false,
        spiderfyOnMaxZoom: true,
        maxClusterRadius: 50,
        iconCreateFunction: (cluster) => {
          const scores = cluster.getAllChildMarkers().map((m) => (m.options as { score?: number }).score ?? 0);
          const meilleur = Math.max(...scores);
          return L.divIcon({
            className: "",
            html: `<div class="carte-groupe" style="--c:${couleur(meilleur, seuil)}"><b>${scores.length}</b><span>offres</span></div>`,
            iconSize: [46, 46],
            iconAnchor: [23, 23],
          });
        },
      });
      for (const o of offres) {
        const marqueur = L.marker([o.latitude, o.longitude], {
          score: o.score,
          icon: L.divIcon({
            className: "",
            html: `<div class="carte-offre" style="--c:${couleur(o.score, seuil)}">${o.score}</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          }),
        } as import("leaflet").MarkerOptions & { score: number });
        marqueur.bindPopup(
          `<div class="carte-popup">
             <b class="carte-popup-score" style="color:${couleur(o.score, seuil)}">${o.score} %</b>
             <strong>${esc(o.intitule)}</strong>
             <span>${esc([o.entreprise, o.lieu, o.contrat].filter(Boolean).join(" · "))}</span>
             ${o.lien
               ? `<a href="${esc(o.lien)}" target="_blank" rel="noopener noreferrer">Voir l'annonce →</a>`
               : `<a href="#offre-${esc(o.id)}">Voir dans la liste →</a>`}
           </div>`,
        );
        groupe.addLayer(marqueur);
      }
      carte.addLayer(groupe);

      if (cadre) carte.fitBounds(cadre, { padding: [20, 20] });
      else if (offres.length) carte.fitBounds(groupe.getBounds(), { padding: [30, 30], maxZoom: 12 });
      else carte.setView([46.6, 2.4], 5); // France entière
    })();
    return () => {
      annule = true;
      carte?.remove();
    };
  }, [offres, domicile, seuil]);

  return <div ref={conteneur} className="h-[60vh] min-h-[360px] w-full overflow-hidden rounded-xl border border-line" role="region" aria-label="Carte des offres" />;
}

import type { MetadataRoute } from "next";

/** Installation sur téléphone (« Ajouter à l'écran d'accueil ») : nom et logo Magnus Campus. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MagnusMatch",
    short_name: "MagnusMatch",
    description: "Les offres d'alternance et d'emploi qui te correspondent, avec Magnus Campus.",
    start_url: "/espace",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#aebaa2",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

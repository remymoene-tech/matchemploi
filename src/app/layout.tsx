import type { Metadata } from "next";
import Link from "next/link";
import { Jost, JetBrains_Mono } from "next/font/google";
import { Logo } from "@/components/Logo";
import { createClient } from "@/lib/supabase/server";
import { roleDe } from "@/lib/equipe";
import { verifierConfig } from "@/lib/config";
import { ecoleDuResponsable } from "@/lib/ecoles";
import { Cloche } from "@/components/Cloche";
import { deconnexion } from "@/app/(auth)/actions";
import "./globals.css";

const jost = Jost({ variable: "--font-jost", subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["500", "700"] });

/** Site test (Vercel « Preview ») : NEXT_PUBLIC_SITE_TEST=1 → bandeau orange, pas d'indexation Google. */
const SITE_TEST = process.env.NEXT_PUBLIC_SITE_TEST === "1";

export const metadata: Metadata = {
  title: SITE_TEST ? "🧪 TEST · MagnusMatch" : "MagnusMatch",
  ...(SITE_TEST ? { robots: { index: false, follow: false } } : {}),
  description: "Dépose ton CV, on cherche pour toi les offres qui te correspondent à 75 % ou plus.",
  appleWebApp: { capable: true, title: "MagnusMatch", statusBarStyle: "default" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let user: { email?: string } | null = null;
  let monEcole: { nom: string } | null = null;
  let role: Awaited<ReturnType<typeof roleDe>> = null;
  if (verifierConfig().supabaseOk) {
    try {
      const supabase = await createClient();
      user = (await supabase.auth.getUser()).data.user;
      monEcole = user ? await ecoleDuResponsable(user.email) : null;
      role = user ? await roleDe(user.email) : null;
    } catch {
      user = null; // Supabase injoignable : on affiche quand même la page
    }
  }

  return (
    <html lang="fr" className={`${jost.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col overflow-x-clip font-sans text-[15px] leading-relaxed">
        {SITE_TEST && <p className="bg-[#f59e0b] px-4 py-1.5 text-center text-sm font-bold text-black print:hidden">🧪 SITE TEST : les données ici sont fictives, rien n&apos;arrive sur le vrai MagnusMatch.</p>}
        <div className="h-1.5 bg-[var(--sauge)] print:hidden" aria-hidden />
        <header className="border-b border-line bg-surface print:hidden">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" aria-label="MagnusMatch, accueil">
              <Logo />
            </Link>
            <nav className="flex flex-wrap items-center gap-1 text-sm">
              {user ? (
                <>
                  {(!role || role === "admin") && (
                    <>
                      <Link className="btn btn-ghost btn-sm" href="/espace">Mes offres</Link>
                      <Link className="btn btn-ghost btn-sm" href="/espace/carte">📇 Ma carte de visite</Link>
                      <Link className="btn btn-ghost btn-sm" href="/espace/profil">Mon profil</Link>
                    </>
                  )}
                  {monEcole || role
                    ? <Cloche lien={role ? "/admin?vue=relances" : "/ecole?vue=relances"} />
                    : <Cloche lien="/espace/prospections" etudiant />}
                  {monEcole && <Link className="btn btn-ghost btn-sm" href="/ecole">Mon école</Link>}
                  {role && <Link className="btn btn-ghost btn-sm" href="/admin">📊 Tableau de bord</Link>}
                  {role === "admin" && <Link className="btn btn-ghost btn-sm px-2 text-base" href="/admin/parametres" title="Paramètres (administrateur)" aria-label="Paramètres administrateur">⚙️</Link>}
                  <form action={deconnexion}>
                    <button className="btn btn-sm">Se déconnecter</button>
                  </form>
                </>
              ) : (
                <>
                  <Link className="btn btn-primary btn-sm" href="/connexion">Se connecter</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="flex flex-col items-center gap-2 bg-[#0d0d0d] px-4 py-6 text-center text-xs tracking-[.08em] text-[#c9ccc4] print:hidden">
          <span>MagnusMatch · Tes données ne sont partagées avec une entreprise qu&apos;avec ton accord.</span>
          <nav className="flex flex-wrap justify-center gap-4" aria-label="Informations légales">
            <Link href="/mentions-legales" className="underline-offset-4 hover:text-white hover:underline">Mentions légales</Link>
            <Link href="/confidentialite" className="underline-offset-4 hover:text-white hover:underline">Politique de confidentialité</Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/auth";
import { verifierConfig } from "@/lib/config";
import { ecoleDuResponsable } from "@/lib/ecoles";
import { deconnexion } from "@/app/(auth)/actions";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "800"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "Jobaprox",
  description: "Dépose ton CV, on cherche pour toi les offres qui te correspondent à 75 % ou plus.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  let user: { email?: string } | null = null;
  let monEcole: { nom: string } | null = null;
  if (verifierConfig().supabaseOk) {
    try {
      const supabase = await createClient();
      user = (await supabase.auth.getUser()).data.user;
      monEcole = user ? await ecoleDuResponsable(user.email) : null;
    } catch {
      user = null; // Supabase injoignable : on affiche quand même la page
    }
  }

  return (
    <html lang="fr" className={`${bricolage.variable} ${figtree.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans text-[15px] leading-relaxed">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
              Job<span className="text-accent">aprox</span>
            </Link>
            <nav className="flex flex-wrap items-center gap-1 text-sm">
              {user ? (
                <>
                  <Link className="btn btn-ghost btn-sm" href="/espace">Mes offres</Link>
                  <Link className="btn btn-ghost btn-sm" href="/espace/cv">Mon CV</Link>
                  <Link className="btn btn-ghost btn-sm" href="/espace/profil">Mon profil</Link>
                  {monEcole && <Link className="btn btn-ghost btn-sm" href="/ecole">Mon école</Link>}
                  {estAdmin(user.email) && <Link className="btn btn-ghost btn-sm" href="/admin">Admin</Link>}
                  <form action={deconnexion}>
                    <button className="btn btn-sm">Se déconnecter</button>
                  </form>
                </>
              ) : (
                <>
                  <Link className="btn btn-ghost btn-sm" href="/connexion">Se connecter</Link>
                  <Link className="btn btn-primary btn-sm" href="/inscription">Créer mon espace</Link>
                </>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-line py-6 text-center text-xs text-muted">
          Jobaprox · Tes données ne sont partagées avec une entreprise qu&apos;avec ton accord.
        </footer>
      </body>
    </html>
  );
}

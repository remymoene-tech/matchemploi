import Link from "next/link";
import { FormMotDePasse } from "@/components/FormMotDePasse";
import { demanderReinitialisation } from "../actions";

export const metadata = { title: "Mot de passe oublié · MagnusMatch" };

export default function Page() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Mot de passe oublié</h1>
        <p className="text-muted">Indique ton email : tu reçois un lien pour choisir un nouveau mot de passe.</p>
      </div>
      <div className="card p-6"><FormMotDePasse action={demanderReinitialisation} mode="oubli" /></div>
      <Link href="/connexion" className="text-sm text-muted hover:text-ink">← Retour à la connexion</Link>
    </div>
  );
}

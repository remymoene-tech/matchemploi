import Link from "next/link";
import { FormAuth } from "@/components/FormAuth";
import { connexion } from "../actions";

export const metadata = { title: "Connexion · MagnusMatch" };

export default function Page() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-3xl font-extrabold">Connexion</h1>
      <div className="card p-6">
        <FormAuth action={connexion} bouton="Se connecter" />
      </div>
      <p className="text-sm text-muted">Pas encore de compte ? <Link className="font-semibold text-accent" href="/inscription">Créer mon espace</Link></p>
    </div>
  );
}

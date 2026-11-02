import Link from "next/link";
import { FormAuth } from "@/components/FormAuth";
import { inscription } from "../actions";

export const metadata = { title: "Créer mon espace · JobMee" };

export default function Page() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Crée ton espace</h1>
        <p className="text-muted">Ensuite, tu déposes ton CV et tu décris ton projet. On s&apos;occupe de chercher.</p>
      </div>
      <div className="card p-6">
        <FormAuth action={inscription} bouton="Créer mon compte" nouveauMotDePasse />
      </div>
      <p className="text-sm text-muted">Déjà inscrit ? <Link className="font-semibold text-accent" href="/connexion">Se connecter</Link></p>
    </div>
  );
}

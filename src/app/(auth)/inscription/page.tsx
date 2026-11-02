import Link from "next/link";
import { FormAuth } from "@/components/FormAuth";
import { inscription } from "../actions";
import { ecoleParCode } from "@/lib/ecoles";

export const metadata = { title: "Créer mon espace · Jobaprox" };

export default async function Page({ searchParams }: { searchParams: Promise<{ ecole?: string }> }) {
  const code = (await searchParams).ecole ?? "";
  const ecole = code ? await ecoleParCode(code).catch(() => null) : null;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Crée ton espace</h1>
        <p className="text-muted">Ensuite, tu déposes ton CV et tu décris ton projet. On s&apos;occupe de chercher.</p>
      </div>
      {ecole && (
        <p className="rounded-xl bg-accent-soft p-4 text-sm">
          Tu t&apos;inscris avec <b>{ecole.nom}</b> : ton école pourra te proposer les offres de ses entreprises partenaires.
        </p>
      )}
      <div className="card p-6">
        <FormAuth action={inscription} bouton="Créer mon compte" nouveauMotDePasse ecole={ecole?.code} />
      </div>
      <p className="text-sm text-muted">Déjà inscrit ? <Link className="font-semibold text-accent" href="/connexion">Se connecter</Link></p>
    </div>
  );
}

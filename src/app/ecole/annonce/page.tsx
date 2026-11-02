import Link from "next/link";
import { exigerResponsable } from "@/lib/ecoles";
import { FormAnnonce } from "@/components/FormAnnonce";
import { importerAnnonceEcole } from "../actions";

export const metadata = { title: "Coller une annonce · Jobaprox" };

export default async function Page() {
  await exigerResponsable();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/ecole?vue=entreprises" className="text-sm text-muted">← Retour aux entreprises</Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">Coller une annonce</h1>
        <p className="text-muted">Ouvre l&apos;annonce sur Indeed, HelloWork ou un autre site, sélectionne tout son texte et colle-le ici. Jobaprox remplit la fiche, tu la vérifies. L&apos;offre ne sera proposée qu&apos;à tes étudiants.</p>
      </div>
      <FormAnnonce action={importerAnnonceEcole} />
    </div>
  );
}

import Link from "next/link";
import { exigerAdmin } from "@/lib/auth";
import { FormAnnonce } from "@/components/FormAnnonce";

export const metadata = { title: "Coller une annonce · MagnusMatch" };

export default async function Page() {
  await exigerAdmin();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/admin?vue=offres" className="text-sm text-muted">← Retour aux offres</Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">Coller une annonce</h1>
        <p className="text-muted">Ouvre l&apos;annonce sur Indeed, HelloWork ou un autre site, sélectionne tout son texte et colle-le ici. MagnusMatch remplit la fiche, tu la vérifies.</p>
      </div>
      <FormAnnonce />
    </div>
  );
}

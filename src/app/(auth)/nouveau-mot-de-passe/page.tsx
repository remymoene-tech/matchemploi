import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FormMotDePasse } from "@/components/FormMotDePasse";
import { changerMotDePasse } from "../actions";

export const metadata = { title: "Nouveau mot de passe · MagnusMatch" };

export default async function Page() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold">Nouveau mot de passe</h1>
        {user && <p className="text-muted">Pour {user.email}</p>}
      </div>
      {user ? (
        <div className="card p-6"><FormMotDePasse action={changerMotDePasse} mode="nouveau" /></div>
      ) : (
        <p className="rounded-lg bg-warn-soft p-4 text-sm">Ce lien a expiré ou a déjà servi. <Link href="/mot-de-passe-oublie" className="font-semibold underline">Refais une demande</Link>.</p>
      )}
    </div>
  );
}

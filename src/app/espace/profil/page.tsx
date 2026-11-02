import { exigerUtilisateur } from "@/lib/auth";
import { FormProfil } from "@/components/FormProfil";
import { supprimerCompte } from "../actions";
import type { Candidat } from "@/lib/types";

export const metadata = { title: "Mon profil · JobMee" };
export const maxDuration = 300; // lecture du CV + recherche en arrière-plan

export default async function Page() {
  const { user, supabase } = await exigerUtilisateur();
  const { data } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold">{data ? "Mon profil" : "Complète ton profil"}</h1>
        <p className="text-muted">Plus ton profil est précis, plus les notes sont justes.</p>
      </div>
      <FormProfil c={data ?? {}} />
      {data && (
        <details className="rounded-xl border border-line p-4 text-sm">
          <summary className="cursor-pointer text-muted">Supprimer mon compte, mon CV et toutes mes données</summary>
          <form action={supprimerCompte} className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span>Cette action est définitive.</span>
            <button className="btn btn-sm text-bad">Confirmer la suppression</button>
          </form>
        </details>
      )}
    </div>
  );
}

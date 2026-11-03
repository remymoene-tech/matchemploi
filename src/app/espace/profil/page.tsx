import { exigerUtilisateur } from "@/lib/auth";
import { FormProfil } from "@/components/FormProfil";
import { supprimerCompte } from "../actions";
import type { Candidat } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { OngletsProfil } from "@/components/OngletsProfil";

export const metadata = { title: "Mon profil · MagnusMatch" };
export const maxDuration = 300; // lecture du CV + recherche en arrière-plan

export default async function Page({ searchParams }: { searchParams: Promise<{ ecole?: string }> }) {
  const { ecole: codeLien } = await searchParams;
  const { user, supabase } = await exigerUtilisateur();
  const { data } = await supabase.from("candidats").select("*").eq("user_id", user.id).maybeSingle<Candidat>();
  const ecoleActuelle = data?.ecole_id
    ? ((await createAdminClient().from("ecoles").select("nom, code").eq("id", data.ecole_id).maybeSingle()).data as { nom: string; code: string } | null)
    : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {data ? <OngletsProfil actif="infos" /> : <h1 className="text-3xl font-extrabold">Complète ton profil</h1>}
      <p className="text-muted">Plus ton profil est précis, plus les notes sont justes.</p>
      <FormProfil c={data ?? {}} codeEcole={codeLien ?? ecoleActuelle?.code ?? ""} nomEcole={ecoleActuelle?.nom} />
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

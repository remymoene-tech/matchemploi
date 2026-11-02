import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enregistrerOffre, supprimerOffre } from "../../actions";
import { CONTRATS, type Offre } from "@/lib/types";

export const metadata = { title: "Offre · MatchEmploi" };
export const maxDuration = 300;

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ verifier?: string; erreur?: string }>;
}) {
  await exigerAdmin();
  const { id } = await params;
  const sp = await searchParams;
  let o: Partial<Offre> = { source: "partenaire", ouverte: true };
  if (id !== "nouvelle") {
    const { data } = await createAdminClient().from("offres").select("*").eq("id", id).maybeSingle<Offre>();
    if (!data || data.source === "france_travail") notFound();
    o = data;
  }
  const champ = (name: keyof Offre, label: string, ph = "", type = "text") => (
    <div className="flex min-w-0 flex-col gap-1">
      <label className="label" htmlFor={name}>{label}</label>
      <input className="input" id={name} name={name} type={type} defaultValue={String(o[name] ?? "")} placeholder={ph} />
    </div>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/admin?vue=offres" className="text-sm text-muted">← Retour aux offres</Link>
      <h1 className="text-3xl font-extrabold">{o.id ? "Modifier l'offre" : "Nouvelle offre"}</h1>
      {sp.verifier && <p className="rounded-xl bg-accent-soft p-4 text-sm">Fiche remplie par l&apos;IA à partir de l&apos;annonce. Vérifie-la, coche « Offre ouverte » puis enregistre pour la proposer aux candidats.</p>}
      {sp.erreur && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Indique au moins l&apos;entreprise et l&apos;intitulé du poste.</p>}

      <form action={enregistrerOffre} className="card flex flex-col gap-4 p-5">
        <input type="hidden" name="id" value={o.id ?? ""} />
        <div className="grid gap-4 sm:grid-cols-2">
          {champ("entreprise", "Entreprise", "Transports Delorme")}
          {champ("intitule", "Intitulé du poste", "Assistant(e) RH en alternance")}
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="contrat">Type de contrat</label>
            <select className="input" id="contrat" name="contrat" defaultValue={o.contrat ?? ""}>
              <option value="">Non précisé</option>
              {CONTRATS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          {champ("lieu", "Lieu", "Corbas (69)")}
          {champ("salaire", "Salaire", "Selon grille alternance")}
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="source">Origine</label>
            <select className="input" id="source" name="source" defaultValue={o.source}>
              <option value="partenaire">Entreprise partenaire</option>
              <option value="externe">Annonce externe (Indeed, HelloWork…)</option>
            </select>
          </div>
          {champ("lien", "Lien de l'annonce", "https://…", "url")}
          {champ("contact_nom", "Contact dans l'entreprise", "Mme Durand, RH")}
          {champ("contact_email", "Email du contact", "", "email")}
        </div>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="description">Missions et profil recherché</label>
          <textarea className="input min-h-40" id="description" name="description" defaultValue={o.description ?? ""} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ouverte" defaultChecked={o.ouverte && !sp.verifier} className="accent-[var(--accent)]" />
          Offre ouverte : la proposer aux candidats
        </label>
        <p className="hint">Le contact de l&apos;entreprise n&apos;est jamais montré aux candidats.</p>
        <div className="flex justify-end">
          <button className="btn btn-primary">Enregistrer</button>
        </div>
      </form>

      {o.id && (
        <details className="rounded-xl border border-line p-4 text-sm">
          <summary className="cursor-pointer text-muted">Supprimer cette offre</summary>
          <form action={supprimerOffre} className="mt-3 flex items-center justify-between gap-3">
            <input type="hidden" name="id" value={o.id} />
            <span>Les correspondances liées seront aussi supprimées.</span>
            <button className="btn btn-sm text-bad">Confirmer</button>
          </form>
        </details>
      )}
    </div>
  );
}

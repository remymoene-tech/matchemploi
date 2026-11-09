import Link from "next/link";
import { QuestionnaireAttentes } from "@/components/QuestionnaireAttentes";
import { ChampExpiration } from "@/components/ChampExpiration";
import { notFound } from "next/navigation";
import { exigerAcces } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { enregistrerOffre, supprimerOffre } from "../../actions";
import { CONTRATS, SOURCES_AUTO, type Offre } from "@/lib/types";
import { listeEntreprises } from "@/lib/entreprises";

export const metadata = { title: "Offre · MagnusMatch" };
export const maxDuration = 300;

export default async function Page({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ verifier?: string; erreur?: string; entreprise?: string }>;
}) {
  await exigerAcces("entreprises");
  const { id } = await params;
  const sp = await searchParams;
  let o: Partial<Offre> = { source: "partenaire", ouverte: true };
  if (id !== "nouvelle") {
    const { data } = await createAdminClient().from("offres").select("*").eq("id", id).maybeSingle<Offre>();
    if (!data || SOURCES_AUTO.includes(data.source)) notFound();
    o = data;
  }
  // Rattachement à une fiche de « Mes entreprises » (pré-remplit le nom et le contact)
  const entreprises = (await listeEntreprises()) ?? [];
  const entrepriseId = (o as { entreprise_id?: string | null }).entreprise_id ?? sp.entreprise ?? "";
  const ent = entreprises.find((x) => x.id === entrepriseId);
  if (ent && !o.id) {
    o = { ...o, entreprise: ent.nom, lieu: ent.ville, contact_nom: [ent.contact_nom, ent.contact_fonction].filter(Boolean).join(", "), contact_email: ent.contact_email, contact_tel: ent.contact_tel, attentes: ent.attentes ?? null };
  }
  const champ = (name: keyof Offre, label: string, ph = "", type = "text", requis = false) => (
    <div className="flex min-w-0 flex-col gap-1">
      <label className="label" htmlFor={name}>{label}{requis && <span className="text-bad"> *</span>}</label>
      <input className="input" id={name} name={name} type={type} defaultValue={String(o[name] ?? "")} placeholder={ph} required={requis} />
    </div>
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href={ent ? `/admin/entreprises/${ent.id}?onglet=offres` : "/admin?vue=entreprises&sous=offres"} className="text-sm text-muted">← {ent ? ent.nom : "Retour aux offres"}</Link>
      <h1 className="text-3xl font-extrabold">{o.id ? "Modifier l'offre" : "Nouvelle offre"}</h1>
      {sp.verifier && <p className="rounded-xl bg-accent-soft p-4 text-sm">Fiche remplie automatiquement à partir de l&apos;annonce. Vérifie-la, coche « Offre ouverte » puis enregistre.</p>}
      <p className="rounded-xl bg-accent-soft p-4 text-sm">
        Cette offre n&apos;est <b>pas visible par les candidats</b>. Elle est comparée à leurs profils, et c&apos;est toi qui reçois les correspondances
        pour faire le lien avec l&apos;étudiant et l&apos;entreprise. Les coordonnées de l&apos;entreprise sont donc obligatoires.
      </p>
      {ent?.attentes && !o.id && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">📋 Le questionnaire des besoins de {ent.nom} est déjà rempli plus bas : adapte-le à cette offre si besoin.</p>}
      {(o as Offre & { redigee_ia?: boolean }).redigee_ia && <p className="rounded-xl bg-warn-soft p-4 text-sm">📝 Cette fiche de poste a été rédigée par MagnusMatch à partir de la fiche besoin. Relis-la, complète les « [à confirmer] » et enregistre.</p>}
      {sp.erreur === "1" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Indique au moins l&apos;entreprise et l&apos;intitulé du poste.</p>}
      {sp.erreur === "contact" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Indique les coordonnées de l&apos;entreprise : le nom du contact, et son email ou son téléphone.</p>}

      <form action={enregistrerOffre} className="card flex flex-col gap-4 p-5">
        <input type="hidden" name="id" value={o.id ?? ""} />
        {entreprises.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className="label" htmlFor="entreprise_id">🏢 Fiche entreprise (Mes entreprises)</label>
            <select className="input" id="entreprise_id" name="entreprise_id" defaultValue={entrepriseId}>
              <option value="">— Aucune —</option>
              {entreprises.map((x) => <option key={x.id} value={x.id}>{x.nom}{x.ville ? ` · ${x.ville}` : ""}</option>)}
            </select>
            <span className="hint">L&apos;offre apparaîtra sur la fiche de l&apos;entreprise.</span>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {champ("entreprise", "Entreprise", "Transports Delorme", "text", true)}
          {champ("intitule", "Intitulé du poste", "Assistant(e) RH en alternance", "text", true)}
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
        </div>
        <fieldset className="flex flex-col gap-3 rounded-lg border border-line p-4">
          <legend className="px-1 text-sm font-semibold">Coordonnées de l&apos;entreprise <span className="text-bad">*</span></legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {champ("contact_nom", "Nom du contact", "Mme Durand, responsable RH")}
            {champ("contact_email", "Email", "rh@entreprise.fr", "email")}
            {champ("contact_tel", "Téléphone", "04 90 00 00 00", "tel")}
          </div>
          <p className="hint">Le nom du contact et au moins un email ou un téléphone. Pour une annonce collée, le lien de l&apos;annonce peut suffire.</p>
        </fieldset>
        <div className="flex flex-col gap-1">
          <label className="label" htmlFor="description">Missions et profil recherché</label>
          <textarea className="input min-h-40" id="description" name="description" defaultValue={o.description ?? ""} />
        </div>
        <QuestionnaireAttentes a={o.attentes} />
        <ChampExpiration expire={o.expire_le} nouvelle={!o.id} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ouverte" defaultChecked={o.ouverte && !sp.verifier} className="accent-[var(--accent)]" />
          Offre ouverte : la comparer aux profils des candidats
        </label>

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

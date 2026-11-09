import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerAdmin } from "@/lib/auth";
import { MOTIFS_PERTE, ORIGINES_LEAD, STATUTS_LEAD, dateEntretienTexte, estLeadAdmis, isoVersParis, leadParId, nomLead, statutLead, type Lead } from "@/lib/leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { echangesDuLead, echeance, maintenantMs } from "@/lib/echanges";
import { formationsDeLEcole } from "@/lib/ecoles";
import { OngletsCartes } from "@/components/OngletsCartes";
import { FormEchange } from "@/components/FormEchange";
import { JournalEchanges } from "@/components/JournalEchanges";
import { planifierEntretienLead, renvoyerInvitation, actionFaiteLead, ajouterEchangeLead, enregistrerLead, renvoyerBrochure, supprimerEchangeLead, supprimerLead } from "../../actions";

export const metadata = { title: "Lead · MagnusMatch" };

export default async function FicheLead({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string; ok?: string; erreur?: string; brochure?: string; invitation?: string; convocation?: string }>;
}) {
  await exigerAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const nouveau = id === "nouveau";
  const l = nouveau ? null : await leadParId(id);
  if (!nouveau && !l) notFound();
  const onglet = nouveau ? "infos" : sp.onglet === "echanges" || sp.onglet === "entretien" ? sp.onglet : "infos";
  const { data: fichesData } = l ? await createAdminClient().from("entretiens_conseil").select("id, date_entretien, conseiller, bilan").eq("lead_id", l.id).order("date_entretien", { ascending: false }) : { data: [] };
  const fiches = (fichesData ?? []) as { id: string; date_entretien: string; conseiller: string; bilan: string }[];
  const base = `/admin/leads/${id}`;
  const echanges = l ? await echangesDuLead(l.id) : [];
  const rappels = echanges.filter((x) => x.action && !x.action_faite);
  const maintenant = maintenantMs();
  const formations = await formationsDeLEcole(l?.ecole_id);
  const annee = new Date().getFullYear();
  const st = statutLead(l?.statut ?? "nouveau");
  const champ = (nom: keyof Lead, label: string, type = "text") => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-semibold">{label}</span>
      <input className="input" name={nom} type={type} defaultValue={(l?.[nom] as string) ?? ""} />
    </label>
  );

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link href="/admin?vue=leads" className="text-sm text-muted">← Mes leads</Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="eyebrow">🧲 Fiche contact</span>
          <h1 className="text-3xl font-extrabold">{l ? nomLead(l) : "Nouveau lead"}</h1>
          {l && (
            <p className="text-muted">
              {[l.formation && `🎓 ${l.formation}`, l.annee_rentree && `rentrée ${l.annee_rentree}`, l.origine, `reçu le ${new Date(l.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" })}`].filter(Boolean).join(" · ")}
            </p>
          )}
          {l && (
            <p className="text-sm">
              {l.email && <a href={`mailto:${l.email}`} className="text-accent underline">✉️ {l.email}</a>}
              {l.telephone && <> · <a href={`tel:${l.telephone.replace(/\s/g, "")}`} className="text-accent underline">📞 {l.telephone}</a></>}
            </p>
          )}
        </div>
        {l && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`chip ${st.chip}`}>{st.label}</span>
            {l.statut === "perdu" && l.motif_perte && <span className="chip">Motif : {l.motif_perte}</span>}
            {l.candidat_id && <Link href={`/admin/candidats/${l.candidat_id}`} className="chip chip-plus">🎓 A créé son espace étudiant →</Link>}
            {estLeadAdmis(l) && !l.candidat_id && (
              <form action={renvoyerInvitation}>
                <input type="hidden" name="id" value={l.id} />
                <button className="btn btn-sm btn-primary">✉️ Renvoyer le lien pour créer son espace</button>
              </form>
            )}
            <form action={renvoyerBrochure}>
              <input type="hidden" name="id" value={l.id} />
              <button className="btn btn-sm">📄 {l.brochure_envoyee_le ? "Renvoyer la brochure" : "Envoyer la brochure"}</button>
            </form>
          </div>
        )}
      </header>

      {sp.ok && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">Enregistré ✓</p>}
      {sp.convocation && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">📨 Convocation envoyée par email ✓ Le rappel partira automatiquement la veille.</p>}
      {sp.erreur === "date" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Indique la date et l&apos;heure de l&apos;entretien.</p>}
      {sp.invitation && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">🎉 Admis : le lien pour créer son espace MagnusMatch est parti par email ✓</p>}
      {l && estLeadAdmis(l) && !l.candidat_id && !sp.invitation && <p className="rounded-xl bg-accent-soft p-4 text-sm">✅ Admis à l&apos;entretien : il apparaît dans Étudiants → Mes candidats en attendant qu&apos;il crée son espace avec <b>{l.email}</b>.</p>}
      {sp.brochure && <p className="rounded-xl bg-good-soft p-4 text-sm text-good">📬 Brochure envoyée ✓</p>}
      {sp.erreur === "brochure" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Aucune brochure déposée pour cette formation : ajoute-la dans ⚙️ Écoles → Formations et brochures.</p>}
      {sp.erreur === "email" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">L&apos;email n&apos;a pas pu partir : vérifie l&apos;envoi d&apos;emails dans /diagnostic.</p>}
      {sp.erreur === "base" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Enregistrement impossible : exécute la mise à jour SQL de la page /diagnostic (« Leads »).</p>}
      {sp.erreur === "motif" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Indique le motif pour passer ce lead en « ❌ Perdu ».</p>}
      {sp.erreur === "champs" && <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Indique au moins un nom, un email ou un téléphone.</p>}

      {l && (
        <OngletsCartes label="Fiche contact" onglets={[
          { href: base, icone: "🪪", label: "Infos", sous: "Contact et suivi", actif: onglet === "infos" },
          { href: `${base}?onglet=entretien`, icone: "🗣️", label: "Entretien d'admission", sous: l.entretien_a ? new Date(l.entretien_a).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "à planifier", actif: onglet === "entretien" },
          { href: `${base}?onglet=echanges`, icone: "💬", label: "Échanges", sous: rappels.length ? `${rappels.length} rappel${rappels.length > 1 ? "s" : ""}` : `${echanges.length} noté${echanges.length > 1 ? "s" : ""}`, actif: onglet === "echanges" },
        ]} />
      )}

      {l && rappels.length > 0 && onglet === "infos" && (
        <div className="flex flex-wrap gap-2 text-sm">
          {rappels.slice(0, 3).map((r) => {
            const d = echeance(r);
            return <Link key={r.id} href={`${base}?onglet=echanges`} className={`chip ${d && +d <= maintenant ? "chip-minus" : "chip-tag"}`}>⏰ {r.action}</Link>;
          })}
        </div>
      )}

      {onglet === "infos" && (
        <form action={enregistrerLead} className="card flex flex-col gap-5 p-5">
          <input type="hidden" name="id" value={l?.id ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            {champ("prenom", "Prénom")}
            {champ("nom", "Nom")}
            {champ("email", "Email", "email")}
            {champ("telephone", "Téléphone", "tel")}
          </div>
          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-1 font-semibold">🎓 Diplôme visé</legend>
            <div className="flex flex-wrap gap-2">
              {formations.map((x) => (
                <label key={x.nom} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-4 py-2 has-[:checked]:border-accent has-[:checked]:bg-[var(--sauge)] has-[:checked]:font-semibold">
                  <input type="radio" name="formation" value={x.nom} defaultChecked={l?.formation === x.nom} className="sr-only" />{x.nom}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">📅 Année de rentrée</span>
              <select className="input" name="annee_rentree" defaultValue={l?.annee_rentree ?? ""}>
                <option value="">—</option>
                {[annee - 1, annee, annee + 1, annee + 2].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Où on en est</span>
              <select className="input" name="statut" defaultValue={l ? statutLead(l.statut).id : "nouveau"}>
                {STATUTS_LEAD.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-semibold">Origine</span>
              <select className="input" name="origine" defaultValue={l?.origine ?? "Journée portes ouvertes"}>
                {ORIGINES_LEAD.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Motif si ❌ Perdu <span className="font-normal text-muted">(obligatoire pour ce statut)</span></span>
            <input className="input" name="motif_perte" list="motifs-perte" defaultValue={l?.motif_perte ?? ""} placeholder="Ex. A choisi une autre école" />
            <datalist id="motifs-perte">{MOTIFS_PERTE.map((x) => <option key={x} value={x} />)}</datalist>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-semibold">Notes</span>
            <textarea className="input min-h-24" name="notes" defaultValue={l?.notes ?? ""} placeholder="Son projet, ses questions, ses parents…" />
          </label>
          {!l && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="consentement" className="mt-1 accent-[var(--accent)]" />
              La personne est d&apos;accord pour être recontactée par l&apos;école.
            </label>
          )}
          <div className="flex justify-end"><button className="btn btn-primary">{l ? "Enregistrer" : "Ajouter le lead"}</button></div>
        </form>
      )}

      {l && onglet === "entretien" && (
        <>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">📅 Date de l&apos;entretien d&apos;admission</h2>
            {l.entretien_a && (
              <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm">
                🗣️ <b>{dateEntretienTexte(l.entretien_a)}</b>{l.rappel_entretien_envoye ? " · ⏰ rappel envoyé la veille ✓" : " · ⏰ rappel par email prévu la veille"}
              </p>
            )}
            <form action={planifierEntretienLead} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={l.id} />
              <label className="flex flex-col gap-1 text-sm sm:w-72">
                <span className="font-semibold">Date et heure (heure de Paris)</span>
                <input className="input" type="datetime-local" name="entretien_a" required defaultValue={isoVersParis(l.entretien_a)} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="convocation" defaultChecked className="accent-[var(--accent)]" />
                ✉️ Envoyer la convocation par email à {l.email || "(pas d'email)"} (date, heure, adresse du campus)
              </label>
              <p className="text-xs text-muted">Le lead passe en « 📨 Convoqué au concours ». Il reçoit un rappel par email la veille, et toi un rappel 🔔 une heure avant.</p>
              <button className="btn btn-primary w-fit">{l.entretien_a ? "Changer la date" : "Planifier l'entretien"}</button>
            </form>
          </section>

          <section className="card flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">📝 Fiche d&apos;entretien</h2>
              <Link href={`${base}/entretien/nouveau`} className="btn btn-primary">➕ Remplir la fiche d&apos;entretien</Link>
            </div>
            {!fiches.length && <p className="text-sm text-muted">Pendant l&apos;entretien, remplis la fiche (cases à cocher, qualités, points à travailler, bilan). Elle le suivra dans son espace candidat s&apos;il est admis, sans jamais lui être montrée.</p>}
            <ul className="flex flex-col divide-y divide-line">
              {fiches.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>🗣️ Entretien du {new Date(x.date_entretien).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}{x.conseiller ? ` · ${x.conseiller}` : ""}{x.bilan ? ` · bilan : ${x.bilan}` : ""}</span>
                  <Link href={`${base}/entretien/${x.id}`} className="btn btn-sm">Ouvrir</Link>
                </li>
              ))}
            </ul>
            {!estLeadAdmis(l) && (
              <p className="rounded-lg bg-bg px-3 py-2 text-sm">Retenu ? Passe-le en <b>✅ Admis</b> (onglet Infos ou dans le tableau des leads) : il reçoit son lien pour créer son espace, faire ses tests et accéder au matching entreprises.</p>
            )}
          </section>
        </>
      )}

      {l && onglet === "echanges" && (
        <>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">✍️ Noter un échange</h2>
            <FormEchange candidatId={l.id} champ="lead_id" action={ajouterEchangeLead}
              exemple="Ex. Appel avec sa mère : hésite entre EGC et un BTS, viendra à la JPO du 18 novembre."
              exempleRelance="Ex. Le rappeler après la journée portes ouvertes" />
          </section>
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="text-lg font-semibold">📜 Historique ({echanges.length})</h2>
            <JournalEchanges echanges={echanges} champ="lead_id" cibleId={l.id} actionFaite={actionFaiteLead} supprimer={supprimerEchangeLead} />
          </section>
        </>
      )}

      {l && onglet === "infos" && (
        <details className="rounded-xl border border-line p-4 text-sm">
          <summary className="cursor-pointer text-muted">Supprimer ce lead (RGPD)</summary>
          <form action={supprimerLead} className="mt-3 flex items-center justify-between gap-3">
            <input type="hidden" name="id" value={l.id} />
            <span>Sa fiche et ses échanges seront supprimés définitivement.</span>
            <button className="btn btn-sm text-bad">Confirmer</button>
          </form>
        </details>
      )}
    </div>
  );
}

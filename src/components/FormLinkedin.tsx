"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { analyserMonLinkedin, enregistrerLinkedinUrl, type EtatLinkedin } from "@/app/espace/actions";

function Message({ etat }: { etat: EtatLinkedin }) {
  if (etat.erreur) return <p className="rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{etat.erreur}</p>;
  if (etat.ok) return <p className="rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{etat.ok}</p>;
  return null;
}

export function FormLinkedinUrl({ url }: { url: string }) {
  const [etat, action, enCours] = useActionState<EtatLinkedin, FormData>(enregistrerLinkedinUrl, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label className="text-sm font-semibold" htmlFor="linkedin_url">Adresse de mon profil LinkedIn</label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input id="linkedin_url" name="linkedin_url" className="input sm:flex-1" defaultValue={url} placeholder="https://www.linkedin.com/in/prenom-nom" inputMode="url" />
        <button className="btn" disabled={enCours}>{enCours ? "…" : "Enregistrer"}</button>
      </div>
      <span className="hint">Ton conseiller pourra l&apos;ouvrir depuis ta fiche, et elle s&apos;ajoute à ton CV amélioré.</span>
      <Message etat={etat} />
    </form>
  );
}

/** Réduit une capture d'écran (1600 px max, JPEG) pour l'envoyer rapidement. */
async function reduire(f: File): Promise<File> {
  if (!f.type.startsWith("image/")) return f;
  try {
    const img = await createImageBitmap(f);
    const r = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * r);
    canvas.height = Math.round(img.height * r);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
    return blob ? new File([blob], f.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }) : f;
  } catch {
    return f;
  }
}

export function FormLinkedinAnalyse({ deja }: { deja: boolean }) {
  const [etat, action, enCours] = useActionState<EtatLinkedin, FormData>(analyserMonLinkedin, {});
  const [prepa, setPrepa] = useState(false);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem("fichiers") as HTMLInputElement;
        setPrepa(true);
        const fd = new FormData();
        for (const f of Array.from(input.files ?? [])) fd.append("fichiers", await reduire(f));
        setPrepa(false);
        startTransition(() => action(fd));
      }}
    >
      <input
        name="fichiers" type="file" multiple required accept="application/pdf,image/png,image/jpeg,image/webp"
        aria-label="PDF ou captures d'écran de ton profil LinkedIn"
        className="input file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:font-semibold file:text-accent"
      />
      <span className="hint">Le PDF de ton profil et/ou jusqu&apos;à 4 captures d&apos;écran (le haut de la page avec la photo, la section Infos, les expériences).</span>
      <button className="btn btn-primary w-fit" disabled={enCours || prepa}>
        {prepa ? "Préparation des images…" : enCours ? "Analyse en cours… (30 s environ)" : deja ? "Analyser à nouveau" : "Analyser mon profil"}
      </button>
      <Message etat={etat} />
    </form>
  );
}

export function BoutonKitLinkedin({ deja }: { deja: boolean }) {
  const [etat, action, enCours] = useActionState<EtatLinkedin, FormData>(analyserMonLinkedin, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="mode" value="creation" />
      <button className="btn btn-primary w-fit" disabled={enCours}>
        {enCours ? "Préparation… (30 s environ)" : deja ? "Refaire mon kit de départ" : "Préparer mon titre et mon texte « Infos »"}
      </button>
      <Message etat={etat} />
    </form>
  );
}

/** Liste à cocher, mémorisée sur cet appareil. */
export function Checklist({ id, items }: { id: string; items: string[] }) {
  const cle = `checklist-${id}`;
  const [faits, setFaits] = useState<number[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      try { setFaits(JSON.parse(localStorage.getItem(cle) ?? "[]")); } catch { /* stockage indisponible */ }
    }, 0);
    return () => clearTimeout(t);
  }, [cle]);
  const basculer = (i: number) => {
    const n = faits.includes(i) ? faits.filter((x) => x !== i) : [...faits, i];
    setFaits(n);
    try { localStorage.setItem(cle, JSON.stringify(n)); } catch { /* stockage indisponible */ }
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 text-sm">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-[var(--sauge)] transition-all" style={{ width: `${(faits.length / Math.max(1, items.length)) * 100}%` }} /></div>
        <span className="text-muted">{faits.length}/{items.length}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {items.map((t, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bg">
              <input type="checkbox" className="mt-1 accent-[var(--accent)]" checked={faits.includes(i)} onChange={() => basculer(i)} />
              <span className={faits.includes(i) ? "text-muted line-through" : ""}>{t}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

import { Copier } from "@/components/Copier";

/** Message prêt à copier, avec destinataire et objet. */
export function BlocMessage({ titre, a, objet, texte }: { titre: string; a: string; objet: string; texte: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="eyebrow">{titre}</span>
      <p className="text-sm">
        <span className="text-muted">À : </span>
        {a ? <span className="select-all break-all font-mono text-xs">{a}</span> : <span className="text-muted">pas de coordonnées sur la fiche</span>}
      </p>
      <p className="text-sm"><span className="text-muted">Objet : </span><span className="select-all">{objet}</span></p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-bg p-3 font-sans text-sm">{texte}</pre>
      <div><Copier texte={texte} /></div>
    </div>
  );
}

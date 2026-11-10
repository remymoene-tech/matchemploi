"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { modelesPour, remplir, telInternational, type Cible, type Modele } from "@/lib/modeles";

export type Messagerie = { cible: Cible; statut?: string; email?: string; telephone?: string; valeurs: Record<string, string>; modeles: Modele[] };

/** Choix d'un modèle (SMS ou email), à côté de la date dans « Noter un échange ». */
export function EnvoiMessage({ messages, canal, onModele }: { messages: Messagerie; canal: "sms" | "email"; onModele: (texte: string, sujet: string) => void }) {
  const [choisi, setChoisi] = useState("");
  const { conseilles, autres } = modelesPour(messages.modeles, messages.cible, messages.statut);
  const bouton = (m: Modele) => (
    <button key={m.id} type="button" onClick={() => { setChoisi(m.id); onModele(remplir(canal === "sms" ? m.sms : m.email, messages.valeurs), remplir(m.sujet, messages.valeurs)); }}
      className={`rounded-full border px-3 py-1 text-sm ${choisi === m.id ? "border-accent bg-accent-soft font-semibold" : "border-line hover:border-ink"}`}>{m.titre}</button>
  );
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line bg-bg p-3">
      <p className="text-sm font-semibold">{canal === "sms" ? "💬 Modèles de SMS" : "✉️ Modèles d'emails"} <span className="font-normal text-muted">· clique pour remplir le message</span></p>
      {conseilles.length > 0 && <div className="flex flex-wrap gap-1.5">{conseilles.map(bouton)}</div>}
      {autres.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted hover:text-ink">{conseilles.length ? "Autres modèles" : "Tous les modèles"} ({autres.length})</summary>
          <div className="mt-2 flex flex-wrap gap-1.5">{autres.map(bouton)}</div>
        </details>
      )}
    </div>
  );
}

/** Envoyer le SMS : Messages sur iPhone, ou QR code à scanner depuis l'ordinateur. */
export function EnvoiSms({ telephone, texte }: { telephone: string; texte: string }) {
  const [mobile, setMobile] = useState(false);
  const [ios, setIos] = useState(true);
  const [ouvert, setOuvert] = useState(false);
  const [qr, setQr] = useState("");
  useEffect(() => {
    const ua = navigator.userAgent;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- détection de l'appareil, côté navigateur seulement
    setMobile(/iPhone|iPad|iPod|Android/i.test(ua));
    setIos(!/Android/i.test(ua));
  }, []);
  const numero = telInternational(telephone);
  const lien = `sms:${numero}${ios ? "&" : "?"}body=${encodeURIComponent(texte)}`;
  // Le QR code suit le texte (s'il est modifié après l'ouverture)
  useEffect(() => {
    if (!ouvert) return;
    let actif = true;
    QRCode.toDataURL(`SMSTO:${numero}:${texte}`, { width: 240, margin: 2, errorCorrectionLevel: "L" }).then((u) => { if (actif) setQr(u); });
    return () => { actif = false; };
  }, [numero, texte, ouvert]);

  if (mobile) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-accent-soft p-3 text-sm">
        <a href={lien} className="btn btn-sm btn-primary">💬 Ouvrir dans Messages</a>
        <span>Envoie le SMS, puis reviens ici et clique sur « Enregistrer l&apos;échange ».</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-accent-soft p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOuvert(!ouvert)} className="btn btn-sm btn-primary">
          📱 {ouvert ? "Cacher le QR code" : "Envoyer avec mon iPhone (QR code)"}
        </button>
        <a href={lien} className="btn btn-sm">Ouvrir sur cet ordinateur</a>
      </div>
      {ouvert && qr && (
        <div className="flex flex-wrap items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- QR code généré dans le navigateur */}
          <img src={qr} alt={`QR code du SMS pour ${telephone}`} width={170} height={170} className="rounded-lg bg-white" />
          <ol className="flex max-w-sm list-decimal flex-col gap-1 pl-5">
            <li>Vise le QR code avec l&apos;<b>appareil photo</b> de ton iPhone.</li>
            <li>Touche la bannière : Messages s&apos;ouvre avec le numéro et le texte.</li>
            <li>Envoie, puis clique sur <b>« Enregistrer l&apos;échange »</b> ici.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

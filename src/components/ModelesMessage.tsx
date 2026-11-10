"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import QRCode from "qrcode";
import { MODELES, remplir, telInternational } from "@/lib/modeles";

type Etat = { erreur?: string; ok?: string };

/** ✉️ / 💬 Envoyer un message à partir d'un modèle (email depuis le site, SMS depuis l'iPhone). */
export function ModelesMessage({ leadId, email, telephone, valeurs, action }: {
  leadId: string; email: string; telephone: string; valeurs: Record<string, string>;
  action: (e: Etat, f: FormData) => Promise<Etat>;
}) {
  const [modeleId, setModeleId] = useState(MODELES[0].id);
  const [canal, setCanal] = useState<"sms" | "email">(telephone ? "sms" : "email");
  const m = MODELES.find((x) => x.id === modeleId)!;
  const [texte, setTexte] = useState(remplir(canal === "sms" ? m.sms : m.email, valeurs));
  const [sujet, setSujet] = useState(remplir(m.sujet, valeurs));
  const [etat, envoyer, enCours] = useActionState(action, {});
  const [, noter] = useTransition();
  const [qr, setQr] = useState("");
  const [mobile, setMobile] = useState(false);
  const [ios, setIos] = useState(true);

  useEffect(() => {
    const ua = navigator.userAgent;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- détection de l'appareil, côté navigateur seulement
    setMobile(/iPhone|iPad|iPod|Android/i.test(ua));
    setIos(!/Android/i.test(ua));
  }, []);

  const choisir = (id: string, c: "sms" | "email") => {
    const x = MODELES.find((y) => y.id === id)!;
    setModeleId(id); setCanal(c); setQr("");
    setTexte(remplir(c === "sms" ? x.sms : x.email, valeurs));
    setSujet(remplir(x.sujet, valeurs));
  };

  const numero = telInternational(telephone);
  const lienSms = `sms:${numero}${ios ? "&" : "?"}body=${encodeURIComponent(texte)}`;
  const donnees = (c: "sms" | "email") => {
    const f = new FormData();
    f.set("lead_id", leadId); f.set("canal", c); f.set("titre", m.titre.replace(/^\S+\s/, "")); f.set("sujet", sujet); f.set("texte", texte);
    return f;
  };
  const afficherQr = async () => setQr(await QRCode.toDataURL(`SMSTO:${numero}:${texte}`, { width: 240, margin: 2, errorCorrectionLevel: "L" }));
  const manque = texte.match(/\{\w+\}/g);

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h2 className="text-lg font-semibold">💬 Envoyer un message</h2>
        <p className="text-sm text-muted">Choisis un modèle, modifie le texte si besoin, puis envoie. Le message est noté tout seul dans les échanges.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODELES.map((x) => (
          <button key={x.id} type="button" onClick={() => choisir(x.id, canal)}
            className={`rounded-full border px-3 py-1.5 text-sm ${x.id === modeleId ? "border-accent bg-accent-soft font-semibold" : "border-line text-muted hover:text-ink"}`}>{x.titre}</button>
        ))}
      </div>

      <nav className="flex w-fit gap-1 rounded-full border border-line p-1 text-sm" aria-label="Canal">
        <button type="button" onClick={() => choisir(modeleId, "sms")} disabled={!telephone} aria-pressed={canal === "sms"}
          className={`rounded-full px-3 py-1 font-semibold disabled:opacity-40 ${canal === "sms" ? "bg-[var(--sauge)] text-ink" : "text-muted hover:text-ink"}`}>💬 SMS</button>
        <button type="button" onClick={() => choisir(modeleId, "email")} disabled={!email} aria-pressed={canal === "email"}
          className={`rounded-full px-3 py-1 font-semibold disabled:opacity-40 ${canal === "email" ? "bg-[var(--sauge)] text-ink" : "text-muted hover:text-ink"}`}>✉️ Email</button>
      </nav>

      {canal === "email" && (
        <label className="flex flex-col gap-1 text-sm"><span className="font-semibold">Objet</span>
          <input className="input" value={sujet} onChange={(e) => setSujet(e.target.value)} />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold">Message {canal === "sms" && <span className="font-normal text-muted">· {texte.length} caractères{texte.length > 160 ? ` (${Math.ceil(texte.length / 153)} SMS)` : ""}</span>}</span>
        <textarea className="input min-h-32" value={texte} onChange={(e) => { setTexte(e.target.value); setQr(""); }} rows={canal === "sms" ? 4 : 10} />
      </label>
      {manque && <p className="rounded-xl bg-warn-soft p-3 text-sm">À compléter dans le texte : {[...new Set(manque)].join(", ")}</p>}

      {canal === "email" ? (
        <button type="button" disabled={enCours || !email} onClick={() => noter(() => envoyer(donnees("email")))} className="btn btn-primary w-fit">
          {enCours ? "Envoi…" : `✉️ Envoyer à ${email}`}
        </button>
      ) : mobile ? (
        <a href={lienSms} onClick={() => noter(() => envoyer(donnees("sms")))} className="btn btn-primary w-fit">💬 Ouvrir dans Messages</a>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={afficherQr} className="btn btn-primary w-fit">📱 Envoyer avec mon iPhone (QR code)</button>
            <a href={lienSms} className="btn w-fit">💬 Ouvrir sur cet ordinateur</a>
          </div>
          {qr && (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR code généré dans le navigateur */}
              <img src={qr} alt={`QR code du SMS pour ${telephone}`} width={180} height={180} className="rounded-lg" />
              <div className="flex max-w-sm flex-col gap-2 text-sm">
                <p>1. Ouvre l&apos;<b>appareil photo</b> de ton iPhone et vise le QR code.</p>
                <p>2. Touche la bannière : Messages s&apos;ouvre avec le numéro et le texte.</p>
                <p>3. Appuie sur Envoyer, puis note-le ici :</p>
                <button type="button" disabled={enCours} onClick={() => noter(() => envoyer(donnees("sms")))} className="btn btn-sm btn-primary w-fit">✅ J&apos;ai envoyé le SMS</button>
              </div>
            </div>
          )}
        </div>
      )}
      {etat.ok && <p className="rounded-xl bg-good-soft p-3 text-sm text-good">{etat.ok}</p>}
      {etat.erreur && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">{etat.erreur}</p>}
    </section>
  );
}

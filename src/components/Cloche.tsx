"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type R = { id: string; nom: string; action: string; quand: string | null; lien: string };

const heure = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "";

/** Cloche des relances (équipe) : badge, liste, notification à l'heure prévue. Vérifie chaque minute. */
export function Cloche({ lien = "/admin?vue=relances", etudiant = false }: { lien?: string; etudiant?: boolean }) {
  const [briefing, setBriefing] = useState<{ cle: string; lien: string } | null>(null);
  const [dues, setDues] = useState<R[]>([]);
  const [prochaines, setProchaines] = useState<R[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [toast, setToast] = useState<R | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "indisponible">("indisponible");
  const vues = useRef<Set<string> | null>(null);
  const panneau = useRef<HTMLDivElement>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/relances", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { dues: R[]; prochaines: R[]; briefing?: { cle: string; lien: string } };
      // Briefing hebdomadaire : notifié une fois par semaine (mémorisé sur cet appareil)
      if (j.briefing) {
        let vu = "";
        try { vu = localStorage.getItem("briefing-vu") ?? ""; } catch { /* stockage indisponible */ }
        setBriefing(vu === j.briefing.cle ? null : j.briefing);
      }
      // Nouvelle relance arrivée à échéance depuis le dernier passage : petite notification
      if (vues.current) {
        const nouvelle = j.dues.find((d) => !vues.current!.has(d.id));
        if (nouvelle) {
          setToast(nouvelle);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification(`Relance : ${nouvelle.nom}`, { body: nouvelle.action, tag: nouvelle.id });
          }
        }
      }
      vues.current = new Set(j.dues.map((d) => d.id));
      setDues(j.dues);
      setProchaines(j.prochaines);
    } catch {
      /* réseau indisponible : on réessaiera à la prochaine minute */
    }
  }, []);

  useEffect(() => {
    const debut = setTimeout(() => {
      if (typeof Notification !== "undefined") setPermission(Notification.permission);
      charger();
    }, 0);
    const t = setInterval(charger, 60_000);
    return () => { clearTimeout(debut); clearInterval(t); };
  }, [charger]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 12_000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!ouvert) return;
    const fermer = (e: MouseEvent) => { if (!panneau.current?.contains(e.target as Node)) setOuvert(false); };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [ouvert]);

  const briefingVu = () => {
    if (briefing) { try { localStorage.setItem("briefing-vu", briefing.cle); } catch { /* stockage indisponible */ } }
    setBriefing(null);
    setOuvert(false);
  };
  const total = dues.length + (briefing ? 1 : 0);

  const faite = async (id: string) => {
    setDues((d) => d.filter((x) => x.id !== id));
    await fetch("/api/relances", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  };

  return (
    <div className="relative" ref={panneau}>
      <button type="button" className="btn btn-ghost btn-sm relative px-2" aria-label={`Notifications : ${total}`} aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <span aria-hidden className="text-lg leading-none">🔔</span>
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-bad px-1 font-mono text-[11px] font-bold text-white">{total}</span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 top-full z-50 mt-2 flex w-[min(92vw,380px)] flex-col gap-2 rounded-xl border border-line bg-surface p-3 shadow-xl">
          {briefing && (
            <Link href={briefing.lien} onClick={briefingVu} className="flex flex-col gap-0.5 rounded-lg bg-accent-soft p-2.5 text-sm hover:underline">
              <b>📋 Ton briefing de la semaine est prêt</b>
              <span className="text-xs text-muted">Ce que chaque étudiant a fait ces 7 derniers jours</span>
            </Link>
          )}
          <p className="text-sm font-semibold">{etudiant ? "⏰ Mes relances entreprises" : "Mes relances"}</p>
          {!dues.length && <p className="text-sm text-muted">Rien à faire pour l&apos;instant 👍</p>}
          {dues.map((d) => (
            <div key={d.id} className="flex flex-col gap-1 rounded-lg bg-bad-soft p-2.5 text-sm">
              <Link href={d.lien} className="font-semibold hover:underline" onClick={() => setOuvert(false)}>{d.nom}</Link>
              <span>{d.action}</span>
              <span className="flex items-center justify-between gap-2 text-xs text-muted">
                {heure(d.quand)}
                <button type="button" className="btn btn-sm" onClick={() => faite(d.id)}>Fait ✓</button>
              </span>
            </div>
          ))}
          {!!prochaines.length && (
            <>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">À venir</p>
              {prochaines.map((d) => (
                <Link key={d.id} href={d.lien} onClick={() => setOuvert(false)} className="flex flex-col rounded-lg border border-line p-2 text-sm hover:border-accent">
                  <span><b>{d.nom}</b> · {d.action}</span>
                  <span className="text-xs text-muted">{heure(d.quand)}</span>
                </Link>
              ))}
            </>
          )}
          {permission === "default" && (
            <button type="button" className="btn btn-sm mt-1"
              onClick={async () => setPermission(await Notification.requestPermission())}>
              Recevoir aussi les notifications du navigateur
            </button>
          )}
          <Link href={lien} className="text-center text-xs font-semibold text-accent" onClick={() => setOuvert(false)}>{etudiant ? "Voir mes prospections →" : "Voir toutes les relances →"}</Link>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed right-4 top-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-1 rounded-xl border border-line bg-surface p-4 shadow-2xl" style={{ top: "max(1rem, env(safe-area-inset-top, 0px))" }}>
          <p className="text-sm font-semibold">⏰ Relance : {toast.nom}</p>
          <p className="text-sm">{toast.action}</p>
          <div className="mt-1 flex justify-end gap-2">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setToast(null)}>Plus tard</button>
            <Link href={toast.lien} className="btn btn-sm btn-primary" onClick={() => setToast(null)}>{etudiant ? "Ouvrir" : "Ouvrir la fiche"}</Link>
          </div>
        </div>
      )}
    </div>
  );
}

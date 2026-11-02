/**
 * Aperçus des écrans du site, dessinés en HTML/SVG avec les couleurs du site
 * (nets sur tous les écrans, et lisibles en mode clair comme sombre). Données d'exemple.
 */
import { Chips, Score } from "@/components/Score";

function Ecran({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden shadow-lg">
      <div className="flex items-center gap-2 border-b border-line bg-bg px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-bad/60" /><span className="h-2.5 w-2.5 rounded-full bg-warn/60" /><span className="h-2.5 w-2.5 rounded-full bg-good/60" />
        <span className="ml-2 truncate rounded bg-surface px-2 py-0.5 font-mono text-[11px] text-muted">jobaprox.fr/{url}</span>
      </div>
      <div className="h-[340px] overflow-hidden p-4 sm:h-[360px]">{children}</div>
    </div>
  );
}

const Pastille = ({ x, y, n, c }: { x: number; y: number; n: string; c: string }) => (
  <g>
    <circle cx={x} cy={y} r="15" fill="var(--surface)" stroke={c} strokeWidth="3" />
    <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={c} fontFamily="var(--font-jetbrains), monospace">{n}</text>
  </g>
);

export function ApercuCarte() {
  return (
    <Ecran url="espace">
      <div className="grid h-full grid-cols-[1.1fr_1fr] gap-3">
        <svg viewBox="0 0 260 320" preserveAspectRatio="xMidYMid slice" className="h-full w-full rounded-lg border border-line" role="img" aria-label="Carte des offres autour du domicile">
          <rect width="260" height="320" fill="var(--bg)" />
          <path d="M0 210 C 60 190, 120 240, 260 200" stroke="var(--line)" strokeWidth="10" fill="none" />
          <path d="M120 0 C 110 90, 150 180, 130 320" stroke="var(--line)" strokeWidth="7" fill="none" />
          <path d="M0 90 L 260 130" stroke="var(--line)" strokeWidth="4" fill="none" />
          <path d="M190 0 C 200 60, 240 90, 260 100" stroke="var(--line)" strokeWidth="4" fill="none" />
          <circle cx="130" cy="160" r="105" fill="var(--accent)" fillOpacity=".08" stroke="var(--accent)" strokeWidth="2" strokeDasharray="6 6" />
          <rect x="117" y="122" width="26" height="26" rx="6" fill="var(--accent)" />
          <text x="130" y="140" textAnchor="middle" fontSize="15" fill="#fff">⌂</text>
          <Pastille x={130} y={168} n="88" c="var(--good)" />
          <Pastille x={84} y={205} n="77" c="var(--good)" />
          <Pastille x={176} y={110} n="81" c="var(--good)" />
          <Pastille x={190} y={220} n="62" c="var(--warn)" />
          <Pastille x={60} y={120} n="79" c="var(--good)" />
          <Pastille x={238} y={258} n="54" c="var(--bad)" />
        </svg>
        <div className="flex min-w-0 flex-col gap-2">
          {[
            [88, "Négociateur·rice immobilier", "Salon-de-Provence · Alternance"],
            [81, "Conseiller clientèle", "Lançon-Provence · Apprentissage"],
            [79, "Conseiller commercial", "Pélissanne · CDI"],
          ].map(([s, t, d]) => (
            <div key={t as string} className="flex gap-2 rounded-lg border border-line bg-surface p-2.5">
              <Score score={s as number} seuil={75} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold">{t}</p>
                <p className="truncate text-[11px] text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Ecran>
  );
}

export function ApercuCV() {
  return (
    <Ecran url="espace/cv">
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center gap-4 rounded-lg border border-line p-3">
          <b className="font-mono text-4xl font-bold text-warn">6<small className="text-base text-muted">/10</small></b>
          <p className="text-[13px]">Ta vraie expérience client est là, mais tes missions sont trop vagues pour convaincre en un coup d&apos;œil.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
            <span className="chip chip-minus w-fit text-[11px]">CV trop modèle</span>
            <p className="text-[12px] text-muted">Jauges, pictos, colonne violette : on reconnaît un modèle Canva.</p>
          </div>
          <div className="flex flex-col gap-1.5 rounded-lg border border-line p-3">
            <span className="eyebrow">Ta description</span>
            <p className="text-[12px]">« Étudiante en BTS NDRC, je cherche une alternance de chargée de clientèle à Salon… »</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-line p-3 text-[12px]"><span className="chip chip-minus mb-1.5 text-[11px]">✕ Trop vague</span><p className="font-semibold">Vendeuse – Boulangerie</p><p className="text-muted">Vente, caisse.</p></div>
          <div className="rounded-lg border p-3 text-[12px]" style={{ borderColor: "var(--accent)" }}><span className="chip chip-plus mb-1.5 text-[11px]">✓ Précis</span><p className="font-semibold">Vendeuse – Boulangerie Martin</p><p><b>Servir</b> 150 clients par jour</p></div>
        </div>
      </div>
    </Ecran>
  );
}

export function ApercuApprend() {
  return (
    <Ecran url="espace">
      <div className="flex h-full flex-col gap-3">
        <div className="flex gap-3 rounded-lg border border-line p-3 opacity-75">
          <Score score={72} seuil={75} />
          <div><p className="text-[13px] font-semibold">Hôte(sse) d&apos;accueil · Marseille</p><p className="text-[11px] text-muted">CDD · week-ends</p></div>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-line bg-bg p-3">
          <p className="text-[13px] font-semibold">Pourquoi cette offre n&apos;est pas pour toi ?</p>
          <div className="flex flex-wrap gap-1.5 text-[12px]">
            {["Trop loin", "Pas le bon métier", "Horaires", "Salaire"].map((r, i) => (
              <span key={r} className={`rounded-full border px-2.5 py-0.5 ${i === 0 || i === 2 ? "border-accent bg-accent-soft text-accent" : "border-line"}`}>{r}</span>
            ))}
          </div>
          <p className="rounded-md border border-line bg-surface px-2 py-1 text-[12px]">je ne veux pas travailler le samedi</p>
        </div>
        <div className="flex items-start gap-2 rounded-lg p-3 text-[12px]" style={{ background: "var(--accent-soft)" }}>
          <span className="text-lg leading-none">↻</span>
          <p><b>Tes offres sont renotées.</b> Les postes loin de chez toi ou le samedi baissent : Jobaprox a compris ce que tu ne veux pas.</p>
        </div>
      </div>
    </Ecran>
  );
}

export function ApercuEcole() {
  return (
    <Ecran url="ecole">
      <div className="flex h-full flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          {[["Étudiants", "42"], ["À traiter", "9"], ["Embauches", "6"]].map(([l, v]) => (
            <div key={l} className="rounded-lg border border-line p-2"><p className="eyebrow">{l}</p><b className="font-mono text-xl">{v}</b></div>
          ))}
        </div>
        <div className="flex gap-3 rounded-lg border border-line p-3">
          <Score score={88} seuil={75} />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold">Inès B. → Agence Provence Immo</p>
            <Chips forts={["Stage en agence", "Proche"]} manques={[]} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          {[["Message étudiant", "Bonjour Inès, une offre correspond à ton profil à 88 %…"], ["Message entreprise", "Bonjour M. Garcia, pour votre offre, nous avons un candidat…"]].map(([t, m]) => (
            <div key={t} className="flex flex-col gap-1.5 rounded-lg border border-line bg-bg p-2">
              <span className="eyebrow">{t}</span><p className="line-clamp-3">{m}</p>
              <span className="w-fit rounded border border-line bg-surface px-2 py-0.5 font-semibold">Copier</span>
            </div>
          ))}
        </div>
      </div>
    </Ecran>
  );
}

export function ApercuAlerte() {
  return (
    <Ecran url="email">
      <div className="mx-auto flex h-full max-w-sm flex-col gap-3">
        <div className="flex items-center gap-3 rounded-lg border border-line p-3">
          <span className="grid h-9 w-9 place-items-center rounded-full font-bold text-accent-ink" style={{ background: "var(--accent)" }}>J</span>
          <div className="min-w-0"><p className="text-[13px] font-semibold">Jobaprox</p><p className="truncate text-[12px] text-muted">3 offres correspondent à ton profil</p></div>
          <span className="ml-auto text-[11px] text-muted">7:12</span>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-line p-3 text-[13px]">
          <p>Bonjour Inès,</p>
          <p>Nous avons trouvé des offres qui te correspondent à 75 % ou plus :</p>
          {[["88 %", "Négociateur·rice immobilier · Salon"], ["81 %", "Conseiller clientèle · Lançon"], ["79 %", "Conseiller commercial · Pélissanne"]].map(([s, t]) => (
            <p key={t}><b className="font-mono text-good">{s}</b> · {t}</p>
          ))}
          <span className="mt-1 w-fit rounded-lg px-3 py-1.5 text-[12px] font-semibold" style={{ background: "var(--primary-bg)", color: "var(--primary-ink)" }}>Voir le détail</span>
        </div>
      </div>
    </Ecran>
  );
}

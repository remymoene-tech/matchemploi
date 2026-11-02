/**
 * Schémas d'exemple pour illustrer les conseils sur le CV (« à éviter » / « conseillé »).
 * Dessinés en HTML/SVG avec les couleurs du site : légers, et lisibles en mode clair comme sombre.
 */

function Cadre({ titre, ton, children }: { titre: string; ton: "bad" | "good"; children: React.ReactNode }) {
  return (
    <figure className="flex min-w-0 flex-col items-center gap-2">
      <div className="aspect-[1/1.414] w-full max-w-[180px] overflow-hidden rounded-md border border-line bg-surface shadow-sm">{children}</div>
      <figcaption className={`chip ${ton === "bad" ? "chip-minus" : "chip-plus"}`}>{ton === "bad" ? "✕ " : "✓ "}{titre}</figcaption>
    </figure>
  );
}

/** Une ligne de texte simulée. */
const L = ({ w, fort, c }: { w: string; fort?: boolean; c?: string }) => (
  <div className={`h-[5px] rounded-full ${fort ? "h-[7px]" : ""}`} style={{ width: w, background: c ?? (fort ? "var(--ink)" : "var(--line)") }} />
);

function Jauge({ v }: { v: number }) {
  return (
    <div className="flex gap-[2px]">
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="h-[5px] w-[5px] rounded-full" style={{ background: i < v ? "#fff" : "rgb(255 255 255 / .35)" }} />
      ))}
    </div>
  );
}

export function SchemaMiseEnPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Cadre titre="Modèle tout fait" ton="bad">
        <div className="flex h-full">
          <div className="flex w-[38%] flex-col items-center gap-2 p-2" style={{ background: "#7c3aed" }}>
            <div className="h-7 w-7 rounded-full" style={{ background: "rgb(255 255 255 / .5)" }} />
            {[4, 3, 5, 2].map((v, i) => (
              <div key={i} className="flex w-full flex-col gap-1">
                <div className="h-[4px] w-3/4 rounded-full" style={{ background: "rgb(255 255 255 / .7)" }} />
                <Jauge v={v} />
              </div>
            ))}
            {["★", "✉", "☎", "⌂"].map((p) => <span key={p} className="text-[9px] leading-none text-white">{p}</span>)}
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-2">
            <L w="80%" fort c="#f59e0b" />
            <L w="60%" c="#ec4899" />
            <div className="mt-1 h-[6px] w-1/2 rounded-full" style={{ background: "#10b981" }} />
            <L w="95%" /><L w="85%" /><L w="90%" />
            <div className="mt-1 h-[6px] w-1/2 rounded-full" style={{ background: "#3b82f6" }} />
            <L w="90%" /><L w="70%" />
          </div>
        </div>
      </Cadre>
      <Cadre titre="Sobre et personnel" ton="good">
        <div className="flex h-full flex-col gap-1.5 p-3">
          <L w="55%" fort />
          <L w="40%" />
          <div className="my-1 rounded-sm p-1" style={{ background: "var(--accent-soft)" }}><L w="95%" c="var(--accent)" /><div className="h-[3px]" /><L w="70%" c="var(--accent)" /></div>
          {["Expériences", "Formation", "Compétences"].map((t) => (
            <div key={t} className="mt-1 flex flex-col gap-1">
              <div className="h-[6px] w-2/5 rounded-full" style={{ background: "var(--accent)" }} />
              <L w="92%" /><L w="80%" />
            </div>
          ))}
        </div>
      </Cadre>
      <p className="col-span-2 text-xs text-muted">
        Une seule colonne, une seule couleur, des titres clairs : le recruteur lit ton parcours, pas un modèle. Les jauges et les étoiles ne veulent rien dire pour un recruteur, et les logiciels de recrutement lisent mal les colonnes et les pictos.
      </p>
    </div>
  );
}

export function SchemaDescription() {
  return (
    <div className="grid grid-cols-[minmax(0,180px)_1fr] items-center gap-4">
      <Cadre titre="Tout en haut du CV" ton="good">
        <div className="flex h-full flex-col gap-1.5 p-3">
          <L w="55%" fort />
          <L w="40%" />
          <div className="relative my-1 rounded-sm border-2 border-dashed p-1" style={{ borderColor: "var(--accent)", background: "var(--accent-soft)" }}>
            <L w="95%" c="var(--accent)" /><div className="h-[3px]" /><L w="88%" c="var(--accent)" /><div className="h-[3px]" /><L w="60%" c="var(--accent)" />
          </div>
          {[0, 1, 2].map((i) => <div key={i} className="mt-1 flex flex-col gap-1"><L w="40%" fort /><L w="90%" /><L w="75%" /></div>)}
        </div>
      </Cadre>
      <div className="flex flex-col gap-2 text-sm">
        <p><b>2 à 3 lignes</b>, juste sous ton nom, qui répondent à :</p>
        <ul className="flex flex-col gap-1 text-muted">
          <li>• Qui es-tu ? (formation, ce que tu sais déjà faire)</li>
          <li>• Que cherches-tu ? (poste, type de contrat)</li>
          <li>• Quand et où ? (rythme, date, ville)</li>
        </ul>
        <p className="text-xs text-muted">Le recruteur la lit en premier : c&apos;est souvent elle qui décide s&apos;il continue.</p>
      </div>
    </div>
  );
}

function Portrait({ bon }: { bon: boolean }) {
  return (
    <svg viewBox="0 0 100 120" className="h-full w-full" role="img" aria-label={bon ? "Photo bien cadrée sur fond neutre" : "Photo sombre, coupée, fond chargé"}>
      <rect width="100" height="120" fill={bon ? "#e9eef0" : "#3b3f46"} />
      {!bon && (
        <g opacity=".55">
          <rect x="5" y="10" width="18" height="40" fill="#6b4f2a" />
          <rect x="70" y="20" width="25" height="30" fill="#2f5d3a" />
          <circle cx="80" cy="85" r="10" fill="#8a3a3a" />
          <rect x="0" y="95" width="100" height="25" fill="#55402a" />
        </g>
      )}
      {bon ? (
        <g fill="#8a96a3">
          <circle cx="50" cy="48" r="17" />
          <path d="M18 120 C 20 88, 80 88, 82 120 Z" />
        </g>
      ) : (
        <g fill="#1f2228">
          <circle cx="72" cy="30" r="24" />
          <path d="M40 120 C 42 70, 100 70, 104 120 Z" />
        </g>
      )}
    </svg>
  );
}

export function SchemaPhoto() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-4">
        {[false, true].map((bon) => (
          <figure key={String(bon)} className="flex flex-col items-center gap-2">
            <div className="aspect-[5/6] w-full max-w-[140px] overflow-hidden rounded-md border border-line"><Portrait bon={bon} /></div>
            <figcaption className={`chip ${bon ? "chip-plus" : "chip-minus"}`}>{bon ? "✓ Visage et épaules, fond uni" : "✕ Sombre, coupée, fond chargé"}</figcaption>
          </figure>
        ))}
      </div>
      <p className="text-xs text-muted">Lumière de face (près d&apos;une fenêtre), fond clair et uni, cadrage du haut du buste, tenue adaptée au métier visé. La photo reste facultative en France.</p>
    </div>
  );
}

export function SchemaExperience() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
        <span className="chip chip-minus w-fit">✕ Trop vague</span>
        <p className="text-sm font-semibold">Vendeuse – Boulangerie</p>
        <p className="text-sm text-muted">Vente, caisse, accueil clients.</p>
      </div>
      <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--accent)" }}>
        <span className="chip chip-plus w-fit">✓ Précis et concret</span>
        <p className="text-sm font-semibold">Vendeuse – Boulangerie Martin, Salon-de-Provence</p>
        <p className="text-xs text-muted">Week-ends, 2023 – 2025</p>
        <ul className="flex flex-col gap-0.5 text-sm">
          <li>• <b>Conseiller</b> et servir <b>150 clients</b> par jour</li>
          <li>• <b>Gérer</b> la caisse et le fond de caisse</li>
          <li>• <b>Traiter</b> les réclamations avec calme</li>
        </ul>
      </div>
      <p className="text-xs text-muted sm:col-span-2">Pour chaque expérience : le poste, l&apos;entreprise, la ville, les dates, puis 2 à 4 missions qui commencent par un verbe d&apos;action, avec un chiffre quand c&apos;est possible.</p>
    </div>
  );
}

/** Le bon schéma pour une catégorie de conseil, ou rien. */
export function SchemaPourCategorie({ categorie }: { categorie: string }) {
  if (categorie === "Mise en page" || categorie === "Personnalisation") return <SchemaMiseEnPage />;
  if (categorie === "Description du projet" || categorie === "Accroche") return <SchemaDescription />;
  if (categorie === "Photo") return <SchemaPhoto />;
  if (categorie === "Expériences") return <SchemaExperience />;
  return null;
}

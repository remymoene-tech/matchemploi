import { COULEURS, STYLES } from "@/lib/tests";

type Res = { scores: Record<string, number>; dominante: string; passe_par: string; created_at: string } | null;
const dateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

function Barres({ items, max }: { items: { nom: string; hex: string; v: number }[]; max: number }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((it) => (
        <li key={it.nom} className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-3 text-sm">
          <span className="font-semibold">{it.nom}</span>
          <span className="h-3 overflow-hidden rounded-full bg-line"><span className="block h-full rounded-full" style={{ width: `${(it.v / max) * 100}%`, background: it.hex }} /></span>
          <span className="text-right font-mono tabular-nums">{it.v}</span>
        </li>
      ))}
    </ul>
  );
}

/** Résultat du test DISC : barres de couleurs + explication détaillée. */
export function ResultatDisc({ r, tutoie = true }: { r: Res; tutoie?: boolean }) {
  if (!r) return null;
  const [dom, sec] = r.dominante.split(",");
  const D = COULEURS.find((c) => c.id === dom)!, S = COULEURS.find((c) => c.id === sec);
  const sD = r.scores[dom] ?? 0, sS = sec ? r.scores[sec] ?? 0 : 0;
  const tri = [...COULEURS].sort((a, b) => (r.scores[b.id] ?? 0) - (r.scores[a.id] ?? 0));
  const faible = tri[tri.length - 1];
  const equilibre = sD - sS <= 1;
  const tu = (a: string, b: string) => (tutoie ? a : b);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-full text-lg font-extrabold text-white" style={{ background: D.hex }}>{D.lettre}</span>
        <div>
          <p className="text-lg font-semibold">{tu("Ta couleur", "Couleur dominante")} : {D.nom}{S ? ` · secondaire ${S.nom}` : ""}</p>
          <p className="text-xs text-muted">Passé le {dateFr(r.created_at)}{r.passe_par === "conseiller" ? " avec un conseiller" : ""}</p>
        </div>
      </div>
      <Barres max={15} items={COULEURS.map((c) => ({ nom: c.nom, hex: c.hex, v: r.scores[c.id] ?? 0 }))} />

      <div className="flex flex-col gap-2 rounded-lg border border-line p-3 text-sm">
        <h4 className="font-semibold">Comment lire {tu("ton", "le")} résultat</h4>
        <p>
          Chaque réponse du questionnaire correspond à une couleur. Le chiffre indique combien de réponses sur 15 vont vers chaque couleur.
          Tout le monde a les 4 couleurs en soi : on regarde surtout la <b>dominante</b> (la plus haute), qui décrit la façon naturelle d&apos;agir,
          et la <b>secondaire</b>, qui la nuance.
        </p>
        {equilibre && S ? (
          <p>
            {tu("Ton", "Son")} profil est <b>équilibré</b> entre {D.nom} ({sD}) et {S.nom} ({sS}) : {tu("tu passes", "il passe")} facilement de l&apos;un à l&apos;autre selon les situations.
          </p>
        ) : (
          <p>
            Le {D.nom} ressort nettement ({sD} sur 15) : c&apos;est {tu("ton", "son")} réflexe naturel, surtout quand {tu("tu es", "il est")} sous pression.
          </p>
        )}
        <p className="text-muted">Il n&apos;y a pas de bonne ou de mauvaise couleur : chaque profil a ses forces et ses pièges.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 rounded-lg p-3 text-sm" style={{ background: `${D.hex}14`, borderLeft: `4px solid ${D.hex}` }}>
          <h4 className="font-semibold">{D.nom} : {tu("ta", "sa")} couleur dominante</h4>
          <p>{D.resume}</p>
          <p><b>Points forts :</b> {D.forces}</p>
          <p><b>À travailler :</b> {D.vigilance}</p>
          <p><b>Où {tu("tu es", "il est")} à l&apos;aise :</b> {D.environnements}</p>
        </div>
        {S && (
          <div className="flex flex-col gap-1.5 rounded-lg p-3 text-sm" style={{ background: `${S.hex}14`, borderLeft: `4px solid ${S.hex}` }}>
            <h4 className="font-semibold">{S.nom} : {tu("ta", "sa")} couleur secondaire</h4>
            <p>{S.resume}</p>
            <p><b>Ce qu&apos;elle {tu("t'", "lui ")}apporte :</b> {S.forces}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg border border-line p-3 text-sm">
        <h4 className="font-semibold">En pratique{tutoie ? "" : " (conseils tels que l'étudiant les lit)"}</h4>
        <p><b>En entretien :</b> {CONSEIL_ENTRETIEN[D.id]}</p>
        <p><b>Avec un tuteur ou un collègue :</b> {CONSEIL_EQUIPE[D.id]}</p>
        <p><b>{tu("Ta", "Sa")} couleur la moins présente ({faible.nom}, {r.scores[faible.id] ?? 0}/15) :</b> {CONSEIL_FAIBLE[faible.id]}</p>
      </div>
    </div>
  );
}

const CONSEIL_ENTRETIEN: Record<string, string> = {
  rouge: "va droit au but et parle de résultats concrets, mais laisse le recruteur finir ses questions et montre que tu sais aussi écouter.",
  jaune: "ton énergie fait bonne impression ; prépare des exemples précis et chiffrés pour ne pas rester dans le général, et surveille ton temps de parole.",
  vert: "ton calme rassure ; ose parler de tes réussites et donner ton avis, même si ce n'est pas naturel pour toi.",
  bleu: "ta préparation est un atout ; donne des réponses courtes avant d'entrer dans les détails, et montre aussi ta motivation, pas seulement les faits.",
};
const CONSEIL_EQUIPE: Record<string, string> = {
  rouge: "tu apprécies l'autonomie et les objectifs clairs ; prends l'habitude de demander l'avis des autres avant de trancher.",
  jaune: "tu aimes le contact et la variété ; note les consignes et les échéances pour garder le fil.",
  vert: "tu as besoin d'un cadre stable et de temps pour t'adapter ; n'hésite pas à poser des questions quand quelque chose change.",
  bleu: "tu aimes les consignes précises et le travail bien fait ; accepte d'avancer même quand tout n'est pas parfait.",
};
const CONSEIL_FAIBLE: Record<string, string> = {
  rouge: "décider vite et s'affirmer demande un effort ; entraîne-toi à donner ton avis clairement et à prendre des initiatives.",
  jaune: "aller vers les autres et se mettre en avant demande un effort ; prépare ta présentation orale pour être à l'aise.",
  vert: "la patience et l'écoute demandent un effort ; prends le temps de reformuler ce que disent les autres.",
  bleu: "la rigueur et les détails demandent un effort ; relis-toi et utilise des listes pour ne rien oublier.",
};

/** Résultat du style de management : 4 styles sur 40 (total 100) + explication détaillée. */
export function ResultatManagement({ r, tutoie = true }: { r: Res; tutoie?: boolean }) {
  if (!r) return null;
  const D = STYLES.find((s) => s.id === r.dominante)!;
  const tri = [...STYLES].sort((a, b) => (r.scores[b.id] ?? 0) - (r.scores[a.id] ?? 0));
  const faible = tri[tri.length - 1];
  const niveau = (v: number) => (v >= 30 ? "très présent" : v >= 25 ? "présent" : v >= 20 ? "modéré" : "peu utilisé");
  const tu = (a: string, b: string) => (tutoie ? a : b);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-lg font-semibold">{tu("Ton style", "Style dominant")} : {D.nom}</p>
        <p className="text-xs text-muted">{D.mots} · passé le {dateFr(r.created_at)}{r.passe_par === "conseiller" ? " avec un conseiller" : ""}</p>
      </div>
      <Barres max={40} items={STYLES.map((s) => ({ nom: s.nom, hex: s.hex, v: r.scores[s.id] ?? 0 }))} />

      <div className="flex flex-col gap-2 rounded-lg border border-line p-3 text-sm">
        <h4 className="font-semibold">Comment lire {tu("ton", "le")} résultat</h4>
        <p>
          Dans chaque série, {tu("tu as", "il a")} classé 4 façons d&apos;accompagner quelqu&apos;un, de 4 (me ressemble le plus) à 1. Chaque style reçoit entre 10 et 40 points,
          et le total fait toujours 100. Plus un score est haut, plus ce style est naturel pour {tu("toi", "lui")}.
        </p>
        <p>
          Les 4 styles correspondent au niveau d&apos;autonomie de la personne accompagnée : on <b>dirige</b> un débutant, on <b>entraîne</b> quelqu&apos;un qui apprend,
          on <b>épaule</b> quelqu&apos;un de compétent qui manque de confiance, et on <b>délègue</b> à quelqu&apos;un d&apos;autonome. Le bon accompagnement consiste à adapter son style à la personne.
        </p>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {tri.map((s) => {
          const v = r.scores[s.id] ?? 0;
          return (
            <li key={s.id} className="flex flex-col gap-1 rounded-lg p-3 text-sm" style={{ background: `${s.hex}14`, borderLeft: `4px solid ${s.hex}` }}>
              <span className="flex items-center justify-between gap-2"><b>{s.nom}</b><span className="font-mono text-xs">{v}/40 · {niveau(v)}</span></span>
              <span className="text-xs text-muted">{s.mots}</span>
              <span>{s.resume}</span>
              <span className="text-muted">{UTILE_QUAND[s.id]}</span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-1.5 rounded-lg border border-line p-3 text-sm">
        <h4 className="font-semibold">En pratique{tutoie ? "" : " (tel que l'étudiant le lit)"}</h4>
        <p><b>Ce que ça dit de toi :</b> {PORTRAIT_STYLE[D.id]}</p>
        <p><b>En alternance :</b> {ALTERNANCE_STYLE[D.id]}</p>
        <p><b>Style le moins utilisé ({faible.nom}) :</b> {A_DEVELOPPER[faible.id]}</p>
      </div>
    </div>
  );
}

const UTILE_QUAND: Record<string, string> = {
  diriger: "Utile avec un débutant ou dans l'urgence, quand il faut des consignes claires.",
  entrainer: "Utile avec quelqu'un qui apprend : on montre, on corrige, on encourage.",
  epauler: "Utile avec quelqu'un de compétent qui doute : on écoute et on donne confiance.",
  deleguer: "Utile avec quelqu'un d'autonome : on fixe le cadre et on laisse faire.",
};
const PORTRAIT_STYLE: Record<string, string> = {
  diriger: "tu aimes que les choses soient claires et cadrées, et tu n'hésites pas à montrer comment faire.",
  entrainer: "tu aimes transmettre et faire progresser les autres, pas à pas, en donnant des conseils concrets.",
  epauler: "tu es à l'écoute et tu cherches à donner confiance ; tu aides les autres à trouver leurs propres solutions.",
  deleguer: "tu fais confiance et tu aimes laisser de l'autonomie ; tu valorises l'initiative et la responsabilité.",
};
const ALTERNANCE_STYLE: Record<string, string> = {
  diriger: "tu seras à l'aise avec un tuteur qui donne des objectifs précis ; propose aussi tes idées pour montrer ton autonomie.",
  entrainer: "tu apprécieras un tuteur qui prend le temps d'expliquer ; c'est aussi ce que tu sauras faire avec un nouvel arrivant.",
  epauler: "tu t'épanouiras dans une équipe bienveillante, où l'on échange et où l'on se soutient.",
  deleguer: "tu apprécieras qu'on te confie des missions en autonomie ; pense à faire des points réguliers avec ton tuteur.",
};
const A_DEVELOPPER: Record<string, string> = {
  diriger: "ose donner des consignes claires et trancher quand la situation l'exige.",
  entrainer: "prends le temps de montrer et d'expliquer, étape par étape.",
  epauler: "écoute davantage et encourage avant de proposer tes solutions.",
  deleguer: "apprends à faire confiance et à laisser les autres prendre des initiatives.",
};

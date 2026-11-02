/** Vérifie les variables indispensables, sans jamais afficher leur valeur. */
export function verifierConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const propre = (v: string) => v === v.trim() && !/^["']|["']$/.test(v) && !v.includes("...");
  const controles = [
    {
      nom: "NEXT_PUBLIC_SUPABASE_URL",
      ok: /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url), // local : supabase start
      aide: url
        ? `Doit être exactement de la forme https://xxxx.supabase.co (sans espace, guillemets ni / à la fin). Actuellement : ${url.length} caractères, commence par « ${url.slice(0, 8)} », finit par « ${url.slice(-4)} ».`
        : "Absente.",
    },
    { nom: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: anon.length > 30 && propre(anon), aide: anon ? "Présente mais semble incomplète, ou contient des espaces / guillemets." : "Absente." },
    { nom: "SUPABASE_SERVICE_ROLE_KEY", ok: service.length > 30 && propre(service) && service !== anon, aide: !service ? "Absente." : service === anon ? "Identique à la clé anon : il faut la clé service_role (secrète)." : "Présente mais semble incomplète, ou contient des espaces / guillemets." },
    { nom: "ANTHROPIC_API_KEY", ok: (process.env.ANTHROPIC_API_KEY ?? "").startsWith("sk-ant-"), aide: "Doit commencer par sk-ant- (facultative pour démarrer)." },
    { nom: "ADMIN_EMAILS", ok: (process.env.ADMIN_EMAILS ?? "").includes("@"), aide: "Ton email, pour accéder à l'espace admin." },
    { nom: "NEXT_PUBLIC_SITE_URL", ok: /^https:\/\/[^ ]+[^/]$/.test(process.env.NEXT_PUBLIC_SITE_URL ?? ""), aide: "Adresse du site, sans / à la fin." },
    { nom: "CRON_SECRET", ok: (process.env.CRON_SECRET ?? "").length >= 16, aide: "Mot de passe de la recherche automatique (16 caractères minimum)." },
  ];
  const supabaseOk = controles.slice(0, 3).every((c) => c.ok);
  return { controles, supabaseOk };
}

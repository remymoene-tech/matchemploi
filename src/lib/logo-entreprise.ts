import "server-only";

/**
 * Logo d'une entreprise à partir de son site internet : icône déclarée par le site (apple-touch-icon,
 * icône, image de partage), sinon l'icône récupérée par Google. Ne bloque jamais (5 s maximum).
 */
export async function logoDepuisSite(site: string | null | undefined): Promise<string | null> {
  if (!site) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`);
  } catch {
    return null;
  }
  const google = `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=128`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (MagnusMatch)" }, redirect: "follow" });
    clearTimeout(t);
    if (!res.ok) return google;
    const html = (await res.text()).slice(0, 200_000);
    const attr = (tag: string, nom: string) => tag.match(new RegExp(`${nom}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
    const liens = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
    const icone =
      liens.find((l) => /rel=["'][^"']*apple-touch-icon/i.test(l)) ??
      liens.find((l) => /rel=["'][^"']*icon/i.test(l) && /sizes=["'](1[2-9]\d|[2-9]\d\d)/i.test(l));
    const href = icone ? attr(icone, "href") : [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]).filter((m) => /property=["']og:(logo|image)["']/i.test(m)).map((m) => attr(m, "content"))[0];
    return href ? new URL(href, res.url).toString() : google;
  } catch {
    return google;
  }
}

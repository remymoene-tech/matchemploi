/**
 * Supabase renvoie au plus 1 000 lignes par requête : on lit par paquets jusqu'au bout.
 * `page(de, a)` doit construire la requête avec un ordre stable et `.range(de, a)`.
 */
export async function toutLire<T>(
  page: (de: number, a: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  max = 100_000,
): Promise<{ data: T[] | null; error: { message: string } | null }> {
  const TAILLE = 1000;
  const lignes: T[] = [];
  for (let de = 0; de < max; de += TAILLE) {
    const { data, error } = await page(de, de + TAILLE - 1);
    if (error) return { data: de === 0 ? null : lignes, error };
    const lot = (data ?? []) as T[];
    lignes.push(...lot);
    if (lot.length < TAILLE) break;
  }
  return { data: lignes, error: null };
}

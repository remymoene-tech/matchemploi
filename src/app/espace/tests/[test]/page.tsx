import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerUtilisateur } from "@/lib/auth";
import { TESTS } from "@/lib/tests";
import { FormTestDisc, FormTestManagement } from "@/components/FormTests";
import { passerTestDisc, passerTestManagement } from "../../actions";

export const metadata = { title: "Test · Jobaprox" };
export const maxDuration = 120;

export default async function PasserTest({ params }: { params: Promise<{ test: string }> }) {
  const { test } = await params;
  await exigerUtilisateur();
  const t = TESTS.find((x) => x.id === test);
  if (!t) notFound();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <Link href="/espace/tests" className="text-sm text-muted">← Mes tests</Link>
      <div><h1 className="text-3xl font-extrabold">{t.nom}</h1><p className="text-muted">{t.duree}</p></div>
      {t.id === "disc" ? <FormTestDisc action={passerTestDisc} /> : <FormTestManagement action={passerTestManagement} />}
    </div>
  );
}

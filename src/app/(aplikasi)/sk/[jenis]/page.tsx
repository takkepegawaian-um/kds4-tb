import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { JudulHalaman, MemuatData } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { cariJenisSk } from "@/lib/sk/jenis";
import { FormSk } from "./form-sk";

export default function HalamanBuatSk({ params }: PageProps<"/sk/[jenis]">) {
  return (
    <Suspense fallback={<MemuatData baris={8} />}>
      <IsiForm params={params} />
    </Suspense>
  );
}

async function IsiForm({ params }: { params: Promise<{ jenis: string }> }) {
  await wajibLogin();
  const jenis = cariJenisSk((await params).jenis);
  if (!jenis) notFound();

  const pegawai = await prisma.pegawaiTB.findMany({
    where: { dihapusPada: null },
    orderBy: { nama: "asc" },
    select: { id: true, nama: true, nip: true, statusAkhir: true },
  });

  return (
    <>
      <Link href="/sk" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-hijau-700 hover:underline">
        <ChevronLeft size={16} /> Buat SK
      </Link>
      <JudulHalaman judul={jenis.nama} />
      <FormSk
        jenisId={jenis.id}
        isian={jenis.isian.map(({ dariPegawai: _dari, ...f }) => ({ ...f, dariData: !!_dari }))}
        pegawai={pegawai.map((p) => ({ id: p.id, label: `${p.nama} · ${p.nip}${p.statusAkhir ? ` · ${p.statusAkhir}` : ""}` }))}
      />
    </>
  );
}

import { notFound } from "next/navigation";
import { Suspense } from "react";
import { JudulHalaman, MemuatData } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { FormPegawai } from "../../form-pegawai";
import { siapkanForm } from "../../siapkan-form";

export const metadata = { title: "Ubah data pegawai" };

export default function HalamanUbah({ params }: PageProps<"/data-tb/[id]/ubah">) {
  return (
    <Suspense fallback={<MemuatData baris={8} />}>
      <IsiForm params={params} />
    </Suspense>
  );
}

async function IsiForm({ params }: { params: Promise<{ id: string }> }) {
  await wajibLogin();
  const id = Number((await params).id);
  const pegawai = Number.isInteger(id) ? await prisma.pegawaiTB.findFirst({ where: { id, dihapusPada: null } }) : null;
  if (!pegawai) notFound();
  const props = await siapkanForm(pegawai);
  return (
    <>
      <JudulHalaman judul={`Ubah data: ${pegawai.nama}`} keterangan={`NIP ${pegawai.nip}. Setiap perubahan dicatat di riwayat.`} />
      <FormPegawai id={pegawai.id} {...props} />
    </>
  );
}

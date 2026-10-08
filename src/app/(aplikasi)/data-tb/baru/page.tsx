import { Suspense } from "react";
import { JudulHalaman, MemuatData } from "@/components/ui";
import { FormPegawai } from "../form-pegawai";
import { siapkanForm } from "../siapkan-form";

export default function HalamanTambah() {
  return (
    <>
      <JudulHalaman judul="Tambah pegawai TB" />
      <Suspense fallback={<MemuatData baris={8} />}>
        <IsiForm />
      </Suspense>
    </>
  );
}

async function IsiForm() {
  const props = await siapkanForm(null);
  return <FormPegawai id={null} {...props} />;
}

import { Suspense } from "react";
import { connection } from "next/server";
import { JudulHalaman, JudulKartu, Kartu, MemuatData, TombolTautan } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { formatWaktu } from "@/lib/tanggal";
import { FormImpor } from "./form-impor";

// Impor/ekspor ratusan baris bisa memakan beberapa detik di server (batas Vercel).
export const maxDuration = 60;

export default function HalamanImpor() {
  return (
    <>
      <JudulHalaman
        judul="Impor dari Excel"
        keterangan="Unggah DATA_TB.xlsx untuk memasukkan orang baru atau memperbarui data yang sudah ada."
        aksi={
          <TombolTautan href="/data-tb/ekspor" prefetch={false}>
            Ekspor Data TB ke Excel
          </TombolTautan>
        }
      />
      <div className="grid gap-6">
        <FormImpor />
        <Kartu>
          <JudulKartu>Riwayat impor</JudulKartu>
          <Suspense fallback={<MemuatData baris={3} />}>
            <RiwayatImpor />
          </Suspense>
        </Kartu>
      </div>
    </>
  );
}

async function RiwayatImpor() {
  await connection();
  await wajibLogin();
  const riwayat = await prisma.riwayatImpor.findMany({ orderBy: { waktu: "desc" }, take: 20 });
  if (riwayat.length === 0) return <p className="text-[15px] text-gray-500">Belum pernah ada impor.</p>;
  const th = "px-3 py-2 text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase";
  const td = "px-3 py-2.5 text-sm";
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="border-b border-krem-200">
          <tr>
            <th className={th}>Waktu</th>
            <th className={th}>Berkas</th>
            <th className={th}>Oleh</th>
            <th className={`${th} text-right`}>Baris</th>
            <th className={`${th} text-right`}>Ditambah</th>
            <th className={`${th} text-right`}>Diubah</th>
            <th className={`${th} text-right`}>Tidak dipilih</th>
            <th className={`${th} text-right`}>Gagal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-krem-100">
          {riwayat.map((r) => (
            <tr key={r.id}>
              <td className={`${td} whitespace-nowrap`}>{formatWaktu(r.waktu)}</td>
              <td className={td}>{r.namaBerkas}</td>
              <td className={td}>{r.email}</td>
              <td className={`${td} text-right`}>{r.jumlahBaris}</td>
              <td className={`${td} text-right`}>{r.ditambah}</td>
              <td className={`${td} text-right`}>{r.diubah}</td>
              <td className={`${td} text-right`}>{r.dilewati}</td>
              <td className={`${td} text-right ${r.gagal ? "font-semibold text-kritis-fg" : ""}`}>{r.gagal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

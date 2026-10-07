import { Suspense } from "react";
import { JudulHalaman, JudulKartu, Kartu, MemuatData } from "@/components/ui";
import { PANJANG_SANDI_MIN, wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { formatWaktu } from "@/lib/tanggal";
import { FormSandi, TombolKeluarSemua } from "./form-sandi";

export const metadata = { title: "Akun" };

export default function HalamanAkun() {
  return (
    <>
      <JudulHalaman judul="Akun" keterangan="Kata sandi dan perangkat yang sedang masuk." />
      <div className="grid gap-6">
        <Kartu>
          <JudulKartu>Ganti kata sandi</JudulKartu>
          <FormSandi panjangMin={PANJANG_SANDI_MIN} />
        </Kartu>
        <Kartu>
          <JudulKartu keterangan="Setiap sesi berlaku 8 jam sejak masuk.">Perangkat yang sedang masuk</JudulKartu>
          <Suspense fallback={<MemuatData baris={2} />}>
            <DaftarSesi />
          </Suspense>
        </Kartu>
      </div>
    </>
  );
}

async function DaftarSesi() {
  const p = await wajibLogin();
  const sesi = await prisma.sesi.findMany({
    where: { penggunaId: p.id, kedaluwarsa: { gt: new Date() } },
    orderBy: { dibuatPada: "desc" },
  });
  return (
    <div className="grid gap-4">
      <p className="text-[15px]">
        Masuk sebagai <b>{p.nama}</b> ({p.email}).
      </p>
      <ul className="divide-y divide-krem-100 text-sm">
        {sesi.map((s) => (
          <li key={s.id} className="py-2">
            Masuk {formatWaktu(s.dibuatPada)} · berlaku s.d. {formatWaktu(s.kedaluwarsa)}
            <div className="truncate text-xs text-gray-500">
              {s.ip ?? "IP tidak diketahui"} · {s.userAgent ?? "peramban tidak diketahui"}
            </div>
          </li>
        ))}
      </ul>
      <TombolKeluarSemua />
    </div>
  );
}

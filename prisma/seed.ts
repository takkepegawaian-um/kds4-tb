import "dotenv/config";
// Mengisi tabel Pengaturan dengan nilai bawaan dari Excel.
// Aman dijalankan berulang kali: baris yang sudah ada TIDAK ditimpa,
// sehingga perubahan admin lewat layar Pengaturan tetap terjaga.
//
// Jalankan: npm run db:seed

import { prisma } from "../src/lib/db";
import {
  ATURAN_HAMBATAN_BAWAAN,
  PARAMETER_BAWAAN,
  PILIHAN_BAWAAN,
  REKAP_PENERBITAN_SK_BAWAAN,
  REKAP_RESMI_FAKULTAS_BAWAAN,
  STATUS_SK_BAWAAN,
} from "../src/lib/pengaturan/bawaan";

async function main() {
  const hasil: Record<string, number> = {};

  hasil.parameter = (
    await prisma.parameter.createMany({
      data: PARAMETER_BAWAAN.map((p, i) => ({ ...p, keterangan: p.keterangan ?? null, urutan: i + 1 })),
      skipDuplicates: true,
    })
  ).count;

  hasil.statusSk = (
    await prisma.pemetaanStatusSk.createMany({
      data: STATUS_SK_BAWAAN.map((s, i) => ({ ...s, urutan: i + 1 })),
      skipDuplicates: true,
    })
  ).count;

  hasil.aturan = (
    await prisma.aturanHambatan.createMany({ data: ATURAN_HAMBATAN_BAWAAN, skipDuplicates: true })
  ).count;

  hasil.pilihan = (
    await prisma.pilihanNilai.createMany({
      data: PILIHAN_BAWAAN.flatMap((k) =>
        k.nilai.map((nilai, i) => ({
          kategori: k.kategori,
          nilai,
          urutan: i + 1,
          sistem: k.sistem?.includes(nilai) ?? false,
        })),
      ),
      skipDuplicates: true,
    })
  ).count;

  hasil.rekapFakultas = (
    await prisma.rekapResmiFakultas.createMany({ data: REKAP_RESMI_FAKULTAS_BAWAAN, skipDuplicates: true })
  ).count;

  if ((await prisma.rekapPenerbitanSk.count()) === 0) {
    hasil.rekapSk = (
      await prisma.rekapPenerbitanSk.createMany({
        data: REKAP_PENERBITAN_SK_BAWAAN.map((r, i) => ({ ...r, kelompok: r.kelompok ?? null, urutan: i + 1 })),
      })
    ).count;
  }

  console.log("Pengisian awal selesai. Baris baru per tabel:", hasil);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

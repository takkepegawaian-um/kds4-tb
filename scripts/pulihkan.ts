// PEMULIHAN: memasukkan isi berkas cadangan ke database yang MASIH KOSONG.
//
//   npm run pulihkan -- backup/kds4-cadangan-....json
//
// Demi keamanan, pemulihan ditolak bila database tujuan sudah berisi data pegawai, akun,
// atau log. Siapkan dulu database baru yang kosong (lihat docs/PANDUAN-PERAWATAN.md),
// jalankan "npm run db:terapkan", lalu jalankan perintah ini. Pengaturan bawaan yang
// mungkin sudah terisi di database tujuan diganti dengan Pengaturan dari cadangan.

import "dotenv/config";
import fs from "node:fs";
import { prisma } from "../src/lib/db";
import { MODEL_CADANGAN } from "./cadangan-model";

async function main() {
  const lokasi = process.argv[2];
  if (!lokasi || !fs.existsSync(lokasi)) {
    throw new Error("Tulis lokasi berkas cadangan, contoh: npm run pulihkan -- backup/kds4-cadangan-2026-10-07-14-30.json");
  }
  const cadangan = JSON.parse(fs.readFileSync(lokasi, "utf8"));
  if (cadangan.aplikasi !== "KDS4" || cadangan.versiFormat !== 1) throw new Error("Berkas ini bukan cadangan KDS4.");

  // 1. Database tujuan harus kosong (selain Pengaturan bawaan).
  const terisi: string[] = [];
  for (const m of MODEL_CADANGAN.filter((x) => !x.pengaturan)) {
    const n = await m.hitung();
    if (n > 0) terisi.push(`${m.nama} (${n} baris)`);
  }
  if (terisi.length) {
    throw new Error(
      `Database tujuan TIDAK kosong: ${terisi.join(", ")}.\nPemulihan dibatalkan supaya tidak ada data yang tertimpa. Pakai database baru yang kosong.`,
    );
  }
  const migrasiTujuan = (
    await prisma.$queryRawUnsafe<{ migration_name: string }[]>('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')
  ).map((m) => m.migration_name);
  const kurang = (cadangan.migrasi as string[]).filter((m) => !migrasiTujuan.includes(m));
  if (kurang.length) {
    throw new Error(`Struktur database tujuan lebih lama dari cadangan. Jalankan dulu: npm run db:terapkan\n(kurang: ${kurang.join(", ")})`);
  }

  // 2. Masukkan semua tabel, berurutan.
  for (const m of MODEL_CADANGAN) {
    const baris = ((cadangan.isi[m.nama] ?? []) as Record<string, unknown>[]).map((b) => {
      const r = { ...b };
      for (const k of m.tanggal) if (r[k]) r[k] = new Date(r[k] as string);
      return r;
    });
    if (m.pengaturan && m.hapusSemua) await m.hapusSemua();
    if (baris.length) await m.masukkan(baris as never[]);
    console.log(`  ${m.nama.padEnd(20)} ${baris.length} baris dipulihkan`);
  }

  // 3. Sesuaikan penghitung nomor urut otomatis supaya data baru tidak bentrok.
  for (const m of MODEL_CADANGAN.filter((x) => x.urutOtomatis)) {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${m.nama}"', 'id'), COALESCE((SELECT MAX(id) FROM "${m.nama}"), 0) + 1, false)`,
    );
  }
  console.log(`\nPemulihan selesai dari ${lokasi} (cadangan dibuat ${cadangan.dibuat}).`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

// Mengisi Status SK yang KOSONG untuk pegawai "Sedang TB", lewat terminal.
// (Cara yang lebih mudah: tombolnya ada di menu Pengaturan > Perawatan data. Logikanya sama persis.)
//
//   npm run isi-status-sk                       pratinjau saja: jumlah orang dan dampaknya
//   npm run isi-status-sk -- --simpan           menerapkan (nilai bawaan: "TB Aktif")
//   npm run isi-status-sk -- --nilai="IB Aktif" --simpan

import "dotenv/config";
import { LEVEL } from "../src/lib/aturan/pengaturan";
import { NILAI_BAWAAN_ISI, pratinjauIsiStatusSk, terapkanIsiStatusSk } from "../src/lib/data/isi-status-sk";
import { prisma } from "../src/lib/db";

const EMAIL = (process.env.ADMIN_EMAIL ?? "admin@kds.um.ac.id").trim().toLowerCase();
const argumen = (nama: string) => process.argv.find((a) => a.startsWith(`--${nama}=`))?.slice(nama.length + 3);

async function main() {
  const nilai = (argumen("nilai") ?? NILAI_BAWAAN_ISI).trim();
  const p = await pratinjauIsiStatusSk(nilai);

  console.log(`Tanggal acuan: ${p.tanggalAcuan}.`);
  console.log(`Sedang TB dengan Status SK kosong: ${p.jumlah} orang -> akan diisi "${p.nilai}"`);
  console.log(`  (Tahap "${p.tahap}", pihak penahan "${p.pihakPenahan}", SK terbit: ${p.skTerbit})\n`);
  console.log("Dampak pada orang Sedang TB:");
  for (const l of LEVEL) {
    console.log(`  ${l.padEnd(10)} ${String(p.sebelum[l]).padStart(4)} -> ${String(p.sesudah[l]).padStart(4)}${p.sebelum[l] === p.sesudah[l] ? "" : "  (berubah)"}`);
  }
  console.log("\nPerpindahan hambatan utama (jumlah orang):");
  for (const g of p.perpindahan) console.log(`  kode ${g.dari} -> kode ${g.ke}`.padEnd(22) + g.jumlah);

  if (!process.argv.includes("--simpan")) {
    console.log('\nBELUM DISIMPAN. Bila angkanya sudah sesuai, jalankan lagi dengan "--simpan".');
    return;
  }
  const n = await terapkanIsiStatusSk(nilai, EMAIL);
  console.log(`\nTERSIMPAN: ${n} orang diisi Status SK "${p.nilai}" dan tercatat di Log perubahan.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

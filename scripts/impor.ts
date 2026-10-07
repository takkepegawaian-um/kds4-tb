// Impor DATA_TB.xlsx lewat terminal (cara lain selain halaman Impor).
// Memakai proses yang sama persis dengan halaman Impor.
//
//   Periksa saja (tidak menyimpan):  npm run impor -- DATA_TB.xlsx
//   Periksa lalu simpan semua:       npm run impor -- DATA_TB.xlsx --simpan

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db";
import { bacaBerkasImpor, simpanRencanaImpor } from "../src/lib/impor/proses";

async function main() {
  const lokasi = process.argv[2];
  const simpan = process.argv.includes("--simpan");
  if (!lokasi) throw new Error("Tulis nama berkas, contoh: npm run impor -- DATA_TB.xlsx");

  const isi = fs.readFileSync(lokasi); // hanya dibaca
  const bacaan = await bacaBerkasImpor(isi.buffer.slice(isi.byteOffset, isi.byteOffset + isi.byteLength) as ArrayBuffer, path.basename(lokasi));
  const r = bacaan.rencana;

  console.log(`Berkas      : ${bacaan.namaBerkas} (sheet "${bacaan.namaSheet}", judul di baris ${bacaan.sheet.barisJudul})`);
  console.log(`Baris       : ${bacaan.sheet.data.length}`);
  console.log(`Orang baru  : ${r.baru.length}`);
  console.log(`Berubah     : ${r.ubah.length}`);
  console.log(`Sama        : ${r.sama.length}`);
  console.log(`Gagal       : ${r.gagal.length}`);
  console.log(`Tidak ada di berkas (dibiarkan): ${r.tidakAdaDiBerkas}`);
  if (bacaan.sheet.kolomHilang.length) console.log(`Kolom tidak ditemukan: ${bacaan.sheet.kolomHilang.join(", ")}`);
  for (const g of r.gagal) console.log(`  GAGAL baris ${g.baris}: ${g.alasan.join("; ")}`);
  const berperingatan = [...r.baru, ...r.ubah, ...r.sama].filter((b) => b.peringatan.length).sort((a, b) => a.baris - b.baris);
  console.log(`Peringatan  : ${berperingatan.length} baris`);
  for (const b of berperingatan) console.log(`  baris ${b.baris} (NIP ${b.nip}): ${b.peringatan.join("; ")}`);

  if (!simpan) {
    console.log('\nBelum disimpan. Tambahkan "--simpan" untuk menyimpan semua baris baru dan berubah.');
    return;
  }
  const hasil = await simpanRencanaImpor(bacaan, "semua", "admin@kds.um.ac.id");
  console.log(`\nTersimpan: ${hasil.ditambah} ditambah, ${hasil.diubah} diubah (riwayat impor #${hasil.imporId}).`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

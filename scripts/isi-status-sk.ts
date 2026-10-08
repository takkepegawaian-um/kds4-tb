// Mengisi Status SK yang KOSONG untuk pegawai "Sedang TB" (tahap "Belum dicatat", hambatan kode 11).
//
//   npm run isi-status-sk                       pratinjau saja: jumlah orang dan dampaknya, tidak mengubah apa pun
//   npm run isi-status-sk -- --simpan           menerapkan (nilai bawaan: "TB Aktif")
//   npm run isi-status-sk -- --nilai="IB Aktif" --simpan    memakai Status SK lain yang ada di Pengaturan
//
// Hanya orang berstatus akhir "Sedang TB" yang ikut. Arsip (Sudah PK, Lulus, Rencana studi) tidak disentuh.
// Setiap perubahan tercatat di Log perubahan (Status SK: kosong -> nilai baru).
// Perintah ini bekerja pada database di DATABASE_URL (untuk produksi, isi dulu di terminal; lihat
// docs/PANDUAN-PERAWATAN.md).

import "dotenv/config";
import { hitungSemua } from "../src/lib/aturan/mesin";
import { LEVEL, susunPengaturan, type Level } from "../src/lib/aturan/pengaturan";
import { prisma } from "../src/lib/db";
import { keInputAturan } from "../src/lib/data/peta";
import { dariDb, hariIniJakarta } from "../src/lib/tanggal";

const EMAIL = (process.env.ADMIN_EMAIL ?? "admin@kds.um.ac.id").trim().toLowerCase();

function argumen(nama: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${nama}=`))?.slice(nama.length + 3);
}

async function main() {
  const simpan = process.argv.includes("--simpan");
  const nilai = (argumen("nilai") ?? "TB Aktif").trim();

  // Kueri dikirim satu per satu (bukan bersamaan): tugas sekali jalan, jadi kecepatan tidak penting.
  const parameter = await prisma.parameter.findMany();
  const statusSk = await prisma.pemetaanStatusSk.findMany({ orderBy: { urutan: "asc" } });
  const aturan = await prisma.aturanHambatan.findMany();
  const libur = await prisma.hariLibur.findMany();
  const peta = statusSk.find((s) => s.statusSk.toLowerCase() === nilai.toLowerCase());
  if (!peta) throw new Error(`Status SK "${nilai}" tidak ada di Pengaturan. Pilihan: ${statusSk.map((s) => s.statusSk).join(", ")}.`);

  const pengaturan = susunPengaturan({ parameter, statusSk, aturan, hariLibur: libur.map((h) => dariDb(h.tanggal)!) });
  const acuan = parameter.find((p) => p.kunci === "tanggalAcuan")?.nilai || hariIniJakarta();

  const semua = await prisma.pegawaiTB.findMany({ where: { dihapusPada: null }, orderBy: { urutan: "asc" } });
  const sasaran = semua.filter((p) => p.statusAkhir.toLowerCase() === "sedang tb" && (p.statusSk ?? "").trim() === "");

  // Dampak: hitung level sebelum dan sesudah (di memori, belum menyimpan apa pun).
  const hitungLevel = (data: typeof semua) => {
    const hasil = hitungSemua(data.map(keInputAturan), pengaturan, acuan);
    const per = Object.fromEntries(LEVEL.map((l) => [l, hasil.filter((h) => h.level === l).length])) as Record<Level, number>;
    return { per, hasil };
  };
  const ids = new Set(sasaran.map((p) => p.id));
  const sebelum = hitungLevel(semua);
  const sesudah = hitungLevel(semua.map((p) => (ids.has(p.id) ? { ...p, statusSk: peta.statusSk } : p)));

  console.log(`Database: ${semua.length} orang. Tanggal acuan: ${acuan}.`);
  console.log(`Sedang TB dengan Status SK kosong: ${sasaran.length} orang -> akan diisi "${peta.statusSk}"`);
  console.log(`  (Tahap "${peta.tahap}", pihak penahan "${peta.pihakPenahan}", SK terbit: ${peta.skTerbit})\n`);
  console.log("Dampak pada orang Sedang TB:");
  for (const l of LEVEL) console.log(`  ${l.padEnd(10)} ${String(sebelum.per[l]).padStart(4)} -> ${String(sesudah.per[l]).padStart(4)}${sebelum.per[l] === sesudah.per[l] ? "" : "  (berubah)"}`);

  // Perubahan hambatan utama per kode
  const indeks = new Map(semua.map((p, i) => [p.id, i]));
  const perpindahan = new Map<string, number>();
  for (const p of sasaran) {
    const i = indeks.get(p.id)!;
    const k = `kode ${sebelum.hasil[i].kode} -> kode ${sesudah.hasil[i].kode}`;
    perpindahan.set(k, (perpindahan.get(k) ?? 0) + 1);
  }
  console.log("\nPerpindahan hambatan utama (jumlah orang):");
  for (const [k, n] of [...perpindahan].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(18)} ${n}`);

  if (!simpan) {
    console.log('\nBELUM DISIMPAN. Bila angkanya sudah sesuai, jalankan lagi dengan "--simpan".');
    return;
  }
  if (sasaran.length === 0) return console.log("\nTidak ada yang perlu diubah.");

  await prisma.$transaction(
    async (tx) => {
      await tx.pegawaiTB.updateMany({ where: { id: { in: [...ids] } }, data: { statusSk: peta.statusSk, diubahOleh: EMAIL } });
      await tx.logPerubahan.createMany({
        data: sasaran.map((p) => ({
          email: EMAIL,
          entitas: "PegawaiTB",
          entitasId: String(p.id),
          aksi: "UBAH",
          kolom: "statusSk",
          nilaiLama: null,
          nilaiBaru: peta.statusSk,
        })),
      });
    },
    { timeout: 60_000 },
  );
  console.log(`\nTERSIMPAN: ${sasaran.length} orang diisi Status SK "${peta.statusSk}" dan tercatat di Log perubahan.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

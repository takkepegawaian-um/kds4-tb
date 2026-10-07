// CADANGAN: menyimpan seluruh isi database ke satu berkas JSON di folder "backup/".
//
//   npm run cadangan
//
// Berkas berisi NIP dan data kepegawaian: simpan di tempat aman (mis. drive kantor terbatas),
// jangan dikirim lewat email/chat. Folder backup/ tidak pernah ikut diunggah ke GitHub.
// Sesi login tidak ikut dicadangkan (semua orang cukup masuk ulang setelah pemulihan).

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db";
import { MODEL_CADANGAN } from "./cadangan-model";

async function main() {
  const isi: Record<string, unknown[]> = {};
  for (const m of MODEL_CADANGAN) {
    isi[m.nama] = await m.ambil();
    console.log(`  ${m.nama.padEnd(20)} ${isi[m.nama].length} baris`);
  }
  const migrasi = await prisma.$queryRawUnsafe<{ migration_name: string }[]>(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name',
  );
  const waktu = new Date();
  const cap = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short" })
    .format(waktu)
    .replace(/[: ]/g, "-");
  fs.mkdirSync("backup", { recursive: true });
  const berkas = path.join("backup", `kds4-cadangan-${cap}.json`);
  const data = { aplikasi: "KDS4", versiFormat: 1, dibuat: waktu.toISOString(), migrasi: migrasi.map((m) => m.migration_name), isi };
  fs.writeFileSync(berkas, JSON.stringify(data, null, 1));
  console.log(`\nCadangan tersimpan: ${berkas} (${(fs.statSync(berkas).size / 1024).toFixed(0)} KB)`);
  console.log("Berkas ini berisi data pribadi pegawai. Simpan di tempat yang aman.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

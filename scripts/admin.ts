// Pengelolaan akun admin lewat terminal.
//
//   npm run admin -- buat          membuat akun admin pertama
//                                  (email ADMIN_EMAIL, sandi ADMIN_SANDI_AWAL dari file .env)
//   npm run admin -- reset-sandi   mengganti sandi admin bila lupa; sandi baru dibuat acak
//                                  dan ditampilkan SEKALI di terminal ini
//   npm run admin -- buka-kunci    membuka kunci akun setelah terlalu banyak percobaan gagal
//
// Setiap tindakan dicatat di Log akses.

import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db";

const EMAIL = (process.env.ADMIN_EMAIL ?? "admin@kds.um.ac.id").trim().toLowerCase();
const NAMA = process.env.ADMIN_NAMA ?? "Admin SDM";
const PANJANG_MIN = 10;

async function catat(peristiwa: string, keterangan: string) {
  await prisma.logAkses.create({ data: { email: EMAIL, peristiwa, keterangan, userAgent: "terminal (scripts/admin.ts)" } });
}

async function buat() {
  const ada = await prisma.pengguna.findUnique({ where: { email: EMAIL } });
  if (ada) return console.log(`Akun ${EMAIL} sudah ada. Pakai "reset-sandi" bila lupa kata sandi.`);
  const sandi = process.env.ADMIN_SANDI_AWAL ?? "";
  if (sandi.length < PANJANG_MIN) {
    throw new Error(`Isi ADMIN_SANDI_AWAL di file .env (minimal ${PANJANG_MIN} karakter), lalu jalankan lagi.`);
  }
  await prisma.pengguna.create({ data: { email: EMAIL, nama: NAMA, hashSandi: await bcrypt.hash(sandi, 12), peran: "ADMIN" } });
  await catat("AKUN_DIBUAT", "Akun admin dibuat lewat terminal");
  console.log(`Akun admin ${EMAIL} dibuat. Segera ganti kata sandinya lewat menu Akun setelah masuk,`);
  console.log(`lalu hapus baris ADMIN_SANDI_AWAL dari file .env.`);
}

async function resetSandi() {
  const p = await prisma.pengguna.findUnique({ where: { email: EMAIL } });
  if (!p) throw new Error(`Akun ${EMAIL} belum ada. Jalankan "buat" dulu.`);
  const sandi = randomBytes(12).toString("base64url");
  await prisma.$transaction([
    prisma.pengguna.update({ where: { id: p.id }, data: { hashSandi: await bcrypt.hash(sandi, 12), gagalLogin: 0, terkunciSampai: null } }),
    prisma.sesi.deleteMany({ where: { penggunaId: p.id } }),
  ]);
  await catat("RESET_SANDI", "Sandi direset lewat terminal; semua sesi dicabut");
  console.log(`Kata sandi baru untuk ${EMAIL}:\n\n    ${sandi}\n`);
  console.log("Catat sekarang (tidak akan ditampilkan lagi), masuk, lalu ganti lewat menu Akun.");
}

async function bukaKunci() {
  const n = await prisma.pengguna.updateMany({ where: { email: EMAIL }, data: { gagalLogin: 0, terkunciSampai: null } });
  await catat("BUKA_KUNCI", "Kunci akun dibuka lewat terminal");
  console.log(n.count ? `Kunci akun ${EMAIL} dibuka.` : `Akun ${EMAIL} tidak ditemukan.`);
}

const perintah: Record<string, () => Promise<unknown>> = { buat, "reset-sandi": resetSandi, "buka-kunci": bukaKunci };

const nama = process.argv[2] ?? "";
(perintah[nama] ?? (async () => console.log('Pilih perintah: buat | reset-sandi | buka-kunci (contoh: npm run admin -- buat)')))()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

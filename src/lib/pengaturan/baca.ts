// Membaca Pengaturan dari database (dipakai halaman di server).
import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { wajibLogin } from "@/lib/auth/sesi";
import { susunPengaturan } from "@/lib/aturan/pengaturan";
import type { DaftarPilihanForm } from "@/lib/data/formulir";
import { KATEGORI_PILIHAN, type KategoriPilihan } from "@/lib/pengaturan/bawaan";
import { dariDb, hariIniJakarta } from "@/lib/tanggal";

/** Tanggal acuan yang berlaku: isian Pengaturan, atau hari ini (Asia/Jakarta) bila kosong. */
export async function tanggalAcuanBerlaku(): Promise<{ tanggal: string; simulasi: boolean }> {
  await connection();
  await wajibLogin();
  const p = await prisma.parameter.findUnique({ where: { kunci: "tanggalAcuan" } });
  if (p?.nilai) return { tanggal: p.nilai, simulasi: true };
  return { tanggal: hariIniJakarta(), simulasi: false };
}

export async function semuaPengaturan() {
  await connection();
  await wajibLogin();
  const [parameter, statusSk, aturan, pilihan, hariLibur] = await Promise.all([
    prisma.parameter.findMany({ orderBy: { urutan: "asc" } }),
    prisma.pemetaanStatusSk.findMany({ orderBy: { urutan: "asc" } }),
    prisma.aturanHambatan.findMany({ orderBy: { kode: "asc" } }),
    prisma.pilihanNilai.findMany({ orderBy: [{ kategori: "asc" }, { urutan: "asc" }] }),
    prisma.hariLibur.findMany({ orderBy: { tanggal: "asc" } }),
  ]);
  return { parameter, statusSk, aturan, pilihan, hariLibur };
}

/** Pengaturan dalam bentuk yang dipakai mesin aturan. */
export async function pengaturanAturan() {
  const { parameter, statusSk, aturan, hariLibur } = await semuaPengaturan();
  return susunPengaturan({
    parameter,
    statusSk,
    aturan,
    hariLibur: hariLibur.map((h) => dariDb(h.tanggal)!),
  });
}

/** Daftar pilihan untuk dropdown form Data TB. */
export async function daftarPilihanForm(): Promise<DaftarPilihanForm> {
  await connection();
  await wajibLogin();
  const [pilihan, statusSk] = await Promise.all([
    prisma.pilihanNilai.findMany({ where: { aktif: true }, orderBy: { urutan: "asc" } }),
    prisma.pemetaanStatusSk.findMany({ orderBy: { urutan: "asc" } }),
  ]);
  const hasil = Object.fromEntries(
    (Object.keys(KATEGORI_PILIHAN) as KategoriPilihan[]).map((k) => [k, pilihan.filter((p) => p.kategori === k).map((p) => p.nilai)]),
  ) as DaftarPilihanForm;
  hasil.STATUS_SK = statusSk.map((s) => s.statusSk);
  return hasil;
}

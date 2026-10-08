// Mengisi Status SK yang KOSONG untuk pegawai "Sedang TB" (tahap "Belum dicatat", hambatan kode 11).
// Dipakai oleh tombol di Pengaturan dan oleh perintah terminal (scripts/isi-status-sk.ts),
// sehingga keduanya selalu berperilaku sama.
//
// Tanpa import khusus Next.js supaya bisa dijalankan juga dari terminal.

import type { PegawaiTB } from "@/generated/prisma/client";
import { hitungSemua } from "@/lib/aturan/mesin";
import { LEVEL, susunPengaturan, type Level } from "@/lib/aturan/pengaturan";
import { prisma } from "@/lib/db";
import { dariDb, hariIniJakarta } from "@/lib/tanggal";
import { keInputAturan } from "./peta";

export const NILAI_BAWAAN_ISI = "TB Aktif";

export type PratinjauIsiStatusSk = {
  nilai: string;
  tahap: string;
  pihakPenahan: string;
  skTerbit: string;
  tanggalAcuan: string;
  jumlah: number;
  sebelum: Record<Level, number>;
  sesudah: Record<Level, number>;
  /** Perpindahan hambatan utama, mis. kode 11 -> kode 0, dengan jumlah orangnya. */
  perpindahan: { dari: number; ke: number; jumlah: number }[];
};

const kosongStatusSk = (p: Pick<PegawaiTB, "statusAkhir" | "statusSk">) =>
  p.statusAkhir.toLowerCase() === "sedang tb" && (p.statusSk ?? "").trim() === "";

/** Jumlah orang Sedang TB yang Status SK-nya kosong. */
export async function hitungStatusSkKosong(): Promise<number> {
  const semua = await prisma.pegawaiTB.findMany({
    where: { dihapusPada: null },
    select: { statusAkhir: true, statusSk: true },
  });
  return semua.filter(kosongStatusSk).length;
}

/** Menghitung dampak tanpa menyimpan apa pun. Kueri dikirim satu per satu. */
export async function pratinjauIsiStatusSk(nilai: string = NILAI_BAWAAN_ISI): Promise<PratinjauIsiStatusSk> {
  const parameter = await prisma.parameter.findMany();
  const statusSk = await prisma.pemetaanStatusSk.findMany({ orderBy: { urutan: "asc" } });
  const aturan = await prisma.aturanHambatan.findMany();
  const libur = await prisma.hariLibur.findMany();
  const peta = statusSk.find((s) => s.statusSk.toLowerCase() === nilai.trim().toLowerCase());
  if (!peta) throw new Error(`Status SK "${nilai}" tidak ada di Pengaturan.`);

  const pengaturan = susunPengaturan({ parameter, statusSk, aturan, hariLibur: libur.map((h) => dariDb(h.tanggal)!) });
  const tanggalAcuan = parameter.find((p) => p.kunci === "tanggalAcuan")?.nilai || hariIniJakarta();
  const semua = await prisma.pegawaiTB.findMany({ where: { dihapusPada: null }, orderBy: { urutan: "asc" } });
  const sasaran = new Set(semua.filter(kosongStatusSk).map((p) => p.id));

  const hitung = (data: PegawaiTB[]) => {
    const hasil = hitungSemua(data.map(keInputAturan), pengaturan, tanggalAcuan);
    const per = Object.fromEntries(LEVEL.map((l) => [l, hasil.filter((h) => h.level === l).length])) as Record<Level, number>;
    return { per, hasil };
  };
  const sebelum = hitung(semua);
  const sesudah = hitung(semua.map((p) => (sasaran.has(p.id) ? { ...p, statusSk: peta.statusSk } : p)));

  const gerak = new Map<string, { dari: number; ke: number; jumlah: number }>();
  semua.forEach((p, i) => {
    if (!sasaran.has(p.id)) return;
    const k = `${sebelum.hasil[i].kode}>${sesudah.hasil[i].kode}`;
    const g = gerak.get(k) ?? { dari: sebelum.hasil[i].kode, ke: sesudah.hasil[i].kode, jumlah: 0 };
    g.jumlah++;
    gerak.set(k, g);
  });

  return {
    nilai: peta.statusSk,
    tahap: peta.tahap,
    pihakPenahan: peta.pihakPenahan,
    skTerbit: peta.skTerbit,
    tanggalAcuan,
    jumlah: sasaran.size,
    sebelum: sebelum.per,
    sesudah: sesudah.per,
    perpindahan: [...gerak.values()].sort((a, b) => b.jumlah - a.jumlah),
  };
}

/**
 * Menyimpan: mengisi Status SK semua orang Sedang TB yang masih kosong, dalam satu transaksi,
 * lengkap dengan catatan di Log perubahan. Mengembalikan jumlah orang yang diubah.
 */
export async function terapkanIsiStatusSk(nilai: string, email: string): Promise<number> {
  const statusSk = await prisma.pemetaanStatusSk.findMany();
  const peta = statusSk.find((s) => s.statusSk.toLowerCase() === nilai.trim().toLowerCase());
  if (!peta) throw new Error(`Status SK "${nilai}" tidak ada di Pengaturan.`);

  return prisma.$transaction(
    async (tx) => {
      // Sasaran dibaca ulang di dalam transaksi, supaya hanya yang MASIH kosong yang diubah.
      const semua = await tx.pegawaiTB.findMany({
        where: { dihapusPada: null },
        select: { id: true, statusAkhir: true, statusSk: true },
      });
      const ids = semua.filter(kosongStatusSk).map((p) => p.id);
      if (ids.length === 0) return 0;
      await tx.pegawaiTB.updateMany({ where: { id: { in: ids } }, data: { statusSk: peta.statusSk, diubahOleh: email } });
      await tx.logPerubahan.createMany({
        data: ids.map((id) => ({
          email,
          entitas: "PegawaiTB",
          entitasId: String(id),
          aksi: "UBAH",
          kolom: "statusSk",
          nilaiLama: null,
          nilaiBaru: peta.statusSk,
        })),
      });
      return ids.length;
    },
    { timeout: 60_000 },
  );
}

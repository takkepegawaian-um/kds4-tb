// Menyaring dan mengurutkan daftar orang menurut parameter alamat (URL).
// Dipakai halaman Data TB dan ekspor Excel supaya isinya selalu sama.

import type { PengaturanAturan } from "@/lib/aturan/pengaturan";
import { labelAbsensi } from "@/lib/aturan/label-absensi";
import { KOSONG, saring, type BarisDihitung, type Saringan } from "@/lib/aturan/saringan";
import { saringanDariUrl } from "@/lib/aturan/saringan-url";

export type Parameter = Record<string, string | string[] | undefined>;

export const PILIHAN_URUT = {
  urutan: "Urutan data",
  peringkat: "Peringkat",
  nama: "Nama",
  skor: "Skor (tertinggi dulu)",
  sisa: "Sisa hari (tersedikit dulu)",
  fakultas: "Fakultas",
} as const;
export type Urut = keyof typeof PILIHAN_URUT;

const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function bacaUrut(p: Parameter, bawaan: Urut = "urutan"): Urut {
  const u = satu(p.urut);
  return u && u in PILIHAN_URUT ? (u as Urut) : bawaan;
}

const pembanding: Record<Urut, (a: BarisDihitung, b: BarisDihitung) => number> = {
  urutan: (a, b) => a.input.urutan - b.input.urutan,
  // Tanpa peringkat ditaruh di akhir.
  peringkat: (a, b) => (a.hasil.peringkat ?? Infinity) - (b.hasil.peringkat ?? Infinity) || a.input.urutan - b.input.urutan,
  nama: (a, b) => (a.input.nama ?? "").localeCompare(b.input.nama ?? "", "id"),
  skor: (a, b) => b.hasil.skor - a.hasil.skor || a.input.urutan - b.input.urutan,
  // Sisa hari kosong ditaruh di akhir.
  sisa: (a, b) => (a.hasil.sisaHari ?? Infinity) - (b.hasil.sisaHari ?? Infinity) || a.input.urutan - b.input.urutan,
  fakultas: (a, b) => (a.input.fakultas ?? "~").localeCompare(b.input.fakultas ?? "~", "id") || a.input.urutan - b.input.urutan,
};

export function pilihBaris<T extends BarisDihitung>(
  baris: readonly T[],
  p: Parameter,
  opsi: { urutBawaan?: Urut; wajib?: Saringan } = {},
): { saringan: Saringan; urut: Urut; hasil: T[] } {
  const saringan = { ...saringanDariUrl(p), ...opsi.wajib };
  const urut = bacaUrut(p, opsi.urutBawaan);
  const hasil = (saring(baris, saringan) as T[]).sort(pembanding[urut]);
  return { saringan, urut, hasil };
}

/** Uraian saringan dalam kalimat sederhana, mis. "Jenis: Bebas", "Hambatan: kode 3". */
export function uraikanSaringan(s: Saringan, p: PengaturanAturan): string[] {
  const u: string[] = [];
  if (s.tidakAda) u.push("Tidak ada orang (filter bertentangan)");
  if (s.q) u.push(`Cari: "${s.q}"`);
  if (s.sedangTb === true) u.push("Hanya Sedang TB");
  if (s.sedangTb === false) u.push("Hanya arsip (selain Sedang TB)");
  if (s.statusAkhir) u.push(`Status akhir: ${s.statusAkhir}`);
  if (s.fakultas) u.push(`Fakultas: ${s.fakultas}`);
  if (s.fakultasBukan) u.push("Fakultas kosong atau tidak dikenal");
  if (s.jenis) u.push(`Jenis: ${s.jenis}`);
  if (s.jenisTerisi) u.push("Jenis Bebas atau Tetap");
  if (s.level) u.push(`Level: ${s.level.join(" atau ")}`);
  if (s.kode !== undefined) u.push(`Hambatan: ${s.kode} ${p.aturan.find((a) => a.kode === s.kode)?.nama ?? ""}`.trim());
  if (s.berhambatan) u.push("Punya hambatan");
  if (s.tahap) u.push(`Tahap: ${s.tahap}`);
  if (s.pihak) u.push(`Pihak penahan: ${s.pihak}`);
  if (s.pihakBukan) u.push("Pihak penahan lainnya");
  if (s.sisaHariMin !== undefined && s.sisaHariMax !== undefined) u.push(`Sisa hari ${s.sisaHariMin} s.d. ${s.sisaHariMax}`);
  else if (s.sisaHariMax !== undefined) u.push(s.sisaHariMax < 0 ? "Masa TB sudah lewat" : `Sisa hari ≤ ${s.sisaHariMax}`);
  else if (s.sisaHariMin !== undefined) u.push(`Sisa hari ≥ ${s.sisaHariMin}`);
  if (s.presensi) u.push(`Absensi: ${labelAbsensi(s.presensi)}`);
  if (s.presensiTbTerisi) u.push("Ditandai TB s.d. terisi");
  if (s.statusSk) u.push(s.statusSk === KOSONG ? "Status SK kosong" : `Status SK: ${s.statusSk}`);
  if (s.adaCekData) u.push("Ada catatan Cek data");
  return u;
}


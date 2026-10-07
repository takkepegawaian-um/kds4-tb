// Daftar Perhatian: orang dengan hambatan (skor > 0), diurutkan menurut peringkat.
// Definisi kolom dipakai bersama oleh halaman, ekspor Excel, dan ekspor PDF.
// Isi kolom sama dengan sheet "Daftar Perhatian" di Excel.

import type { PegawaiTB } from "@/generated/prisma/client";
import type { BarisDihitung } from "@/lib/aturan/saringan";
import { formatTanggal } from "@/lib/tanggal";
import { pilihBaris, type Parameter } from "./daftar";

export type BarisPerhatian = BarisDihitung & { pegawai: PegawaiTB };

export function pilihPerhatian(baris: readonly BarisPerhatian[], p: Parameter) {
  return pilihBaris(baris, p, { urutBawaan: "peringkat", wajib: { berhambatan: true } });
}

export type KolomPerhatian = {
  judul: string;
  ambil: (b: BarisPerhatian) => string | number | null;
  tanggal?: boolean;
  angka?: boolean;
};

export const KOLOM_PERHATIAN: KolomPerhatian[] = [
  { judul: "Peringkat", ambil: (b) => b.hasil.peringkat, angka: true },
  { judul: "Nama", ambil: (b) => b.pegawai.nama },
  { judul: "NIP", ambil: (b) => b.pegawai.nip },
  { judul: "Fakultas", ambil: (b) => b.pegawai.fakultas },
  { judul: "Jenis", ambil: (b) => b.pegawai.jenisPelaksanaan },
  { judul: "Level", ambil: (b) => b.hasil.level },
  { judul: "Hambatan utama", ambil: (b) => b.hasil.hambatan },
  { judul: "Pihak penahan", ambil: (b) => b.hasil.pihakPenahan },
  { judul: "Akhir efektif", ambil: (b) => b.hasil.akhirEfektif, tanggal: true },
  { judul: "Sisa hari", ambil: (b) => b.hasil.sisaHari, angka: true },
  { judul: "Hari tertahan", ambil: (b) => b.hasil.hariTertahan, angka: true },
  { judul: "Catatan", ambil: (b) => b.pegawai.catatan },
  { judul: "Saran tindakan", ambil: (b) => b.hasil.saran },
];

/** Nilai kolom sebagai teks tampilan (tanggal dd/mm/yyyy). */
export function teksKolom(k: KolomPerhatian, b: BarisPerhatian): string {
  const v = k.ambil(b);
  if (v === null || v === undefined) return "";
  return k.tanggal ? formatTanggal(String(v)) : String(v);
}

export type { Parameter };

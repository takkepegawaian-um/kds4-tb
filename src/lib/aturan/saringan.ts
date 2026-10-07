// Saringan orang: syarat untuk memilih baris.
// Dipakai Dashboard untuk menghitung angka, dan dipakai lagi untuk membuka
// daftar orang di balik angka itu (angka dan daftar selalu cocok).

import { NILAI, sama, type HasilPegawai, type InputPegawai } from "./mesin";
import type { Level } from "./pengaturan";

export type BarisDihitung = { input: InputPegawai; hasil: HasilPegawai };

export type Saringan = {
  /** true = hanya Sedang TB; false = hanya selain Sedang TB (arsip) */
  sedangTb?: boolean;
  statusAkhir?: string;
  jenis?: string;
  fakultas?: string;
  /** Fakultas tidak termasuk daftar ini (untuk baris "Fakultas kosong / lainnya") */
  fakultasBukan?: string[];
  level?: Level[];
  kode?: number;
  tahap?: string;
  pihak?: string;
  pihakBukan?: string[];
  /** Skor > 0 */
  berhambatan?: boolean;
  /** Rentang sisa hari, batas ikut dihitung. null = tidak dibatasi. */
  sisaHariMin?: number;
  sisaHariMax?: number;
  presensi?: string;
  /** Kolom "Presensi ditandai TB s.d." terisi */
  presensiTbTerisi?: boolean;
  /** Status SK; KOSONG = belum diisi */
  statusSk?: string;
  /** Ada catatan di kolom "Cek data" atau peringatan tambahan */
  adaCekData?: boolean;
  /** Pencarian bebas: nama atau NIP */
  q?: string;
  /** Jenis pelaksanaan Bebas atau Tetap (terisi) */
  jenisTerisi?: boolean;
  /** Saringan yang tidak mungkin terpenuhi (mis. kolom "Tetap" saat filter global "Bebas"). */
  tidakAda?: boolean;
};

/** Penanda nilai kosong di saringan (mis. Status SK belum diisi). */
export const KOSONG = "(kosong)";

export function cocok({ input: i, hasil: h }: BarisDihitung, s: Saringan): boolean {
  if (s.tidakAda) return false;
  const sedang = sama(i.statusAkhir, NILAI.SEDANG_TB);
  if (s.sedangTb !== undefined && sedang !== s.sedangTb) return false;
  if (s.statusAkhir !== undefined && !sama(i.statusAkhir, s.statusAkhir)) return false;
  if (s.jenis !== undefined && !sama(i.jenisPelaksanaan, s.jenis)) return false;
  if (s.jenisTerisi && !(sama(i.jenisPelaksanaan, NILAI.BEBAS) || sama(i.jenisPelaksanaan, NILAI.TETAP))) return false;
  if (s.fakultas !== undefined && !sama(i.fakultas, s.fakultas)) return false;
  if (s.fakultasBukan && s.fakultasBukan.some((f) => sama(i.fakultas, f))) return false;
  if (s.level && !(h.level && s.level.includes(h.level))) return false;
  if (s.kode !== undefined && h.kode !== s.kode) return false;
  if (s.tahap !== undefined && !sama(h.tahap, s.tahap)) return false;
  if (s.pihak !== undefined && !sama(h.pihakPenahan, s.pihak)) return false;
  if (s.pihakBukan && s.pihakBukan.some((p) => sama(h.pihakPenahan, p))) return false;
  if (s.berhambatan && !(h.skor > 0)) return false;
  if (s.sisaHariMin !== undefined && !(h.sisaHari !== null && h.sisaHari >= s.sisaHariMin)) return false;
  if (s.sisaHariMax !== undefined && !(h.sisaHari !== null && h.sisaHari <= s.sisaHariMax)) return false;
  if (s.presensi !== undefined && !sama(i.presensi, s.presensi)) return false;
  if (s.presensiTbTerisi && !i.presensiTbSd) return false;
  if (s.statusSk !== undefined && (s.statusSk === KOSONG ? !!i.statusSk : !sama(i.statusSk, s.statusSk))) return false;
  if (s.adaCekData && !(h.cekData || h.peringatan.length)) return false;
  if (s.q) {
    const cari = s.q.trim().toLowerCase();
    const nama = (i.nama ?? "").toLowerCase();
    const nip = (i.nip ?? "").replace(/\s/g, "");
    if (cari && !nama.includes(cari) && !nip.includes(cari.replace(/\s/g, ""))) return false;
  }
  return true;
}

export function saring(baris: readonly BarisDihitung[], s: Saringan): BarisDihitung[] {
  return baris.filter((b) => cocok(b, s));
}

/** Angka di Dashboard beserta saringan yang menghasilkannya. */
export type Angka = { jumlah: number; saringan: Saringan };

export function angka(baris: readonly BarisDihitung[], s: Saringan): Angka {
  return { jumlah: saring(baris, s).length, saringan: s };
}

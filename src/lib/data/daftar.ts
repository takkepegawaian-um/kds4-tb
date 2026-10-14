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
/** Kunci urutan tambahan yang dipakai judul kolom di Daftar Perhatian (tidak ada di dropdown Data TB). */
const URUT_TAMBAHAN = ["hambatan", "pihak", "tertahan"] as const;
export type Urut = keyof typeof PILIHAN_URUT | (typeof URUT_TAMBAHAN)[number];
export type Arah = "naik" | "turun";

const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function bacaUrut(p: Parameter, bawaan: Urut = "sisa"): Urut {
  const u = satu(p.urut);
  return u && (u in PILIHAN_URUT || (URUT_TAMBAHAN as readonly string[]).includes(u)) ? (u as Urut) : bawaan;
}

/** Arah urutan dari alamat; kosong = arah alami kunci itu. */
export function bacaArah(p: Parameter): Arah | undefined {
  const a = satu(p.arah);
  return a === "naik" || a === "turun" ? a : undefined;
}

type Nilai = number | string | null;

/**
 * Cara mengurutkan tiap kunci. `alami` = arah bila tidak diminta lain: "naik" = kecil/A dulu,
 * "turun" = besar dulu (mis. skor tertinggi, hari tertahan terlama). Nilai kosong (null) selalu di akhir.
 */
export const KUNCI_URUT: Record<Urut, { ambil: (b: BarisDihitung) => Nilai; alami: Arah }> = {
  urutan: { ambil: (b) => b.input.urutan, alami: "naik" },
  peringkat: { ambil: (b) => b.hasil.peringkat, alami: "naik" },
  nama: { ambil: (b) => b.input.nama ?? "", alami: "naik" },
  skor: { ambil: (b) => b.hasil.skor, alami: "turun" },
  sisa: { ambil: (b) => b.hasil.sisaHari, alami: "naik" },
  fakultas: { ambil: (b) => b.input.fakultas || null, alami: "naik" },
  hambatan: { ambil: (b) => b.hasil.kode, alami: "naik" },
  pihak: { ambil: (b) => b.hasil.pihakPenahan || null, alami: "naik" },
  tertahan: { ambil: (b) => b.hasil.hariTertahan, alami: "turun" },
};

const bandingkanNilai = (a: number | string, b: number | string) =>
  typeof a === "string" || typeof b === "string" ? String(a).localeCompare(String(b), "id") : a - b;

function pembanding(urut: Urut, arah?: Arah) {
  const k = KUNCI_URUT[urut];
  const balik = (arah ?? k.alami) !== "naik";
  return (x: BarisDihitung, y: BarisDihitung) => {
    const a = k.ambil(x);
    const b = k.ambil(y);
    if (a === null || b === null) {
      if (a !== b) return a === null ? 1 : -1;
    } else {
      const c = bandingkanNilai(a, b);
      if (c) return balik ? -c : c;
    }
    return x.input.urutan - y.input.urutan;
  };
}

export function pilihBaris<T extends BarisDihitung>(
  baris: readonly T[],
  p: Parameter,
  opsi: { urutBawaan?: Urut; wajib?: Saringan } = {},
): { saringan: Saringan; urut: Urut; arah: Arah; hasil: T[] } {
  const saringan = { ...saringanDariUrl(p), ...opsi.wajib };
  const urut = bacaUrut(p, opsi.urutBawaan);
  const arah = bacaArah(p) ?? KUNCI_URUT[urut].alami;
  const hasil = (saring(baris, saringan) as T[]).sort(pembanding(urut, arah));
  return { saringan, urut, arah, hasil };
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
  if (s.biaya) u.push(`Sumber biaya: ${s.biaya}`);
  if (s.kampus) u.push(s.kampus === KOSONG ? "Tempat studi belum diisi" : `Kampus: ${s.kampus}`);
  if (s.negara) u.push(s.negara === KOSONG ? "Negara kampus belum diketahui" : `Negara kampus: ${s.negara}`);
  return u;
}


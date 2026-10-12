// Pembantu penulisan isi SK: tanggal Indonesia, terbilang, lama studi, nama pada judul.
// Fungsi murni (tanpa akses database) supaya mudah diuji.

/** Isian yang belum diketahui ditulis titik-titik, seperti pada contoh SK. */
export const ISIAN_KOSONG = "……";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/** "yyyy-mm-dd" -> [tahun, bulan, hari]; null bila bukan tanggal yang sah. */
export function bagianTanggal(iso: string | null | undefined): [number, number, number] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return null;
  const [y, b, h] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const uji = new Date(Date.UTC(y, b - 1, h));
  return uji.getUTCFullYear() === y && uji.getUTCMonth() === b - 1 && uji.getUTCDate() === h ? [y, b, h] : null;
}

/** "2026-09-10" -> "10 September 2026"; kosong bila bukan tanggal. */
export function tanggalIndonesia(iso: string | null | undefined): string {
  const p = bagianTanggal(iso);
  return p ? `${p[2]} ${BULAN[p[1] - 1]} ${p[0]}` : "";
}

/** Menambah (atau mengurangi) hari pada tanggal "yyyy-mm-dd". */
export function tambahHari(iso: string, hari: number): string {
  const p = bagianTanggal(iso);
  if (!p) return "";
  const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + hari));
  return d.toISOString().slice(0, 10);
}

const SATUAN = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

/** Bilangan bulat 0 sampai 999.999.999.999 dalam kata, mis. 375000 -> "tiga ratus tujuh puluh lima ribu". */
export function terbilang(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999_999) return "";
  const t = (x: number): string => {
    if (x < 12) return x === 0 ? "" : SATUAN[x];
    if (x < 20) return `${t(x - 10)} belas`;
    if (x < 100) return `${t(Math.floor(x / 10))} puluh${x % 10 ? ` ${t(x % 10)}` : ""}`;
    if (x < 200) return `seratus${x > 100 ? ` ${t(x - 100)}` : ""}`;
    if (x < 1000) return `${t(Math.floor(x / 100))} ratus${x % 100 ? ` ${t(x % 100)}` : ""}`;
    if (x < 2000) return `seribu${x > 1000 ? ` ${t(x - 1000)}` : ""}`;
    if (x < 1_000_000) return `${t(Math.floor(x / 1000))} ribu${x % 1000 ? ` ${t(x % 1000)}` : ""}`;
    if (x < 1_000_000_000) return `${t(Math.floor(x / 1_000_000))} juta${x % 1_000_000 ? ` ${t(x % 1_000_000)}` : ""}`;
    return `${t(Math.floor(x / 1_000_000_000))} miliar${x % 1_000_000_000 ? ` ${t(x % 1_000_000_000)}` : ""}`;
  };
  return n === 0 ? "nol" : t(n);
}

/** 3 -> "3 (tiga)" */
export const angkaTerbilang = (n: number) => `${n} (${terbilang(n)})`;

/**
 * Lama masa studi dari tanggal mulai sampai tanggal akhir (tanggal akhir ikut dihitung),
 * ditulis seperti pada SK: "3 (tiga) tahun", "1 (satu) tahun 6 (enam) bulan", "6 (enam) bulan".
 * Sisa hari kurang dari satu bulan diabaikan. Kosong bila tanggal tidak sah atau akhir sebelum mulai.
 */
export function lamaStudi(mulai: string, akhir: string): string {
  const a = bagianTanggal(mulai);
  const b = bagianTanggal(tambahHari(akhir, 1));
  if (!a || !b) return "";
  const bulan = (b[0] - a[0]) * 12 + (b[1] - a[1]) - (b[2] < a[2] ? 1 : 0);
  if (bulan <= 0) return "";
  const tahun = Math.floor(bulan / 12);
  const sisa = bulan % 12;
  return [tahun ? `${angkaTerbilang(tahun)} tahun` : "", sisa ? `${angkaTerbilang(sisa)} bulan` : ""].filter(Boolean).join(" ");
}

/**
 * Nama untuk judul SK: bagian sebelum koma pertama ditulis kapital, gelar dibiarkan seperti aslinya.
 * "Fulan Contoh, S.E., M.S.A., CSRS" -> "FULAN CONTOH, S.E., M.S.A., CSRS"
 */
export function namaJudul(nama: string): string {
  const n = nama.trim();
  const i = n.indexOf(",");
  return i < 0 ? n.toUpperCase() : n.slice(0, i).toUpperCase() + n.slice(i);
}

/** Nama fakultas lengkap menurut singkatan yang dipakai di Data TB. */
export const NAMA_FAKULTAS: Record<string, string> = {
  FIP: "Fakultas Ilmu Pendidikan",
  FS: "Fakultas Sastra",
  FMIPA: "Fakultas Matematika dan Ilmu Pengetahuan Alam",
  FEB: "Fakultas Ekonomi dan Bisnis",
  FT: "Fakultas Teknik",
  FIK: "Fakultas Ilmu Keolahragaan",
  FIS: "Fakultas Ilmu Sosial",
  FPsi: "Fakultas Psikologi",
  FV: "Fakultas Vokasi",
  FK: "Fakultas Kedokteran",
};

export const DAFTAR_FAKULTAS = Object.values(NAMA_FAKULTAS);

/** Singkatan Data TB (atau nama lengkap) -> nama fakultas lengkap. */
export function fakultasLengkap(f: string | null | undefined): string {
  const t = (f ?? "").trim();
  if (!t) return "";
  const kunci = Object.keys(NAMA_FAKULTAS).find((k) => k.toLowerCase() === t.toLowerCase());
  return kunci ? NAMA_FAKULTAS[kunci] : t;
}

export const JENJANG = {
  "Doktor (S3)": { nama: "Doktor", kode: "S3" },
  "Magister (S2)": { nama: "Magister", kode: "S2" },
  "Spesialis (PPDS SP-1)": { nama: "Spesialis", kode: "PPDS SP-1" },
  Subspesialis: { nama: "Subspesialis", kode: "Subspesialis" },
} as const;

export type NamaJenjang = keyof typeof JENJANG;

/** Isi kolom Jenjang di Data TB -> pilihan jenjang di formulir SK ("" bila tidak dikenal). */
export function jenjangDariData(j: string | null | undefined): string {
  const t = (j ?? "").trim().toLowerCase();
  if (!t) return "";
  if (t === "s3") return "Doktor (S3)";
  if (t === "s2") return "Magister (S2)";
  if (t.startsWith("ppds")) return "Spesialis (PPDS SP-1)";
  if (t.startsWith("subspes")) return "Subspesialis";
  return "";
}

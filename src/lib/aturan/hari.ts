// Hitungan tanggal yang meniru Excel persis.
//
// Excel menyimpan tanggal sebagai "nomor seri": jumlah hari sejak 30/12/1899.
// Di program ini tanggal ditulis sebagai teks ISO "yyyy-mm-dd", lalu diubah ke
// nomor seri supaya pengurangan tanggal menghasilkan angka hari yang sama dengan Excel.

const MS_SEHARI = 86_400_000;
const SERI_1970 = 25_569; // nomor seri Excel untuk 01/01/1970

/** "yyyy-mm-dd" -> nomor seri Excel. */
export function keSeri(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d) / MS_SEHARI + SERI_1970;
}

/** Nomor seri Excel -> "yyyy-mm-dd". */
export function dariSeri(seri: number): string {
  return new Date((seri - SERI_1970) * MS_SEHARI).toISOString().slice(0, 10);
}

/** Hari dalam minggu: 0 = Minggu ... 6 = Sabtu. */
function hariDalamMinggu(seri: number): number {
  return new Date((seri - SERI_1970) * MS_SEHARI).getUTCDay();
}

/**
 * EDATE(tanggal, bulan): tanggal yang sama sekian bulan sesudah/sebelumnya.
 * Bila tanggal tidak ada di bulan tujuan (mis. 31 ke Februari), dipakai hari terakhir bulan itu.
 */
export function edate(seri: number, bulan: number): number {
  const t = new Date((seri - SERI_1970) * MS_SEHARI);
  const totalBulan = t.getUTCFullYear() * 12 + t.getUTCMonth() + bulan;
  const y = Math.floor(totalBulan / 12);
  const m = totalBulan - y * 12;
  const hariTerakhir = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return Date.UTC(y, m, Math.min(t.getUTCDate(), hariTerakhir)) / MS_SEHARI + SERI_1970;
}

/**
 * WORKDAY(tanggal, hari, libur): maju (hari > 0) atau mundur (hari < 0) sekian hari kerja.
 * Sabtu, Minggu, dan tanggal libur dilewati. Tanggal awal sendiri tidak dihitung.
 */
export function workday(seri: number, hari: number, libur: ReadonlySet<number> = new Set()): number {
  const langkah = hari < 0 ? -1 : 1;
  let sisa = Math.abs(Math.trunc(hari));
  let d = seri;
  while (sisa > 0) {
    d += langkah;
    const h = hariDalamMinggu(d);
    if (h !== 0 && h !== 6 && !libur.has(d)) sisa--;
  }
  return d;
}

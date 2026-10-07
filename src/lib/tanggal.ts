// Pembantu tanggal. Semua tanggal di aplikasi ini adalah "tanggal saja" (tanpa jam)
// dan ditulis sebagai teks ISO "yyyy-mm-dd" di dalam program, lalu ditampilkan
// sebagai dd/mm/yyyy. Hari ini dihitung menurut zona waktu Asia/Jakarta.

export const ZONA_WAKTU = "Asia/Jakarta";

/** Tanggal hari ini di Asia/Jakarta, format "yyyy-mm-dd". */
export function hariIniJakarta(sekarang: Date = new Date()): string {
  // en-CA menghasilkan format yyyy-mm-dd
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_WAKTU,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(sekarang);
}

/** "yyyy-mm-dd" -> "dd/mm/yyyy". Nilai kosong menjadi "". */
export function formatTanggal(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** Tanggal dari database (kolom @db.Date, tengah malam UTC) -> "yyyy-mm-dd". */
export function dariDb(tanggal: Date | null | undefined): string | null {
  return tanggal ? tanggal.toISOString().slice(0, 10) : null;
}

/** "yyyy-mm-dd" -> Date untuk disimpan ke kolom @db.Date. */
export function keDb(iso: string | null | undefined): Date | null {
  return iso ? new Date(`${iso.slice(0, 10)}T00:00:00.000Z`) : null;
}

/** Waktu lengkap (untuk log) dalam format dd/mm/yyyy HH:MM WIB. */
export function formatWaktu(waktu: Date): string {
  const f = new Intl.DateTimeFormat("id-ID", {
    timeZone: ZONA_WAKTU,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(waktu);
  const b = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  return `${b("day")}/${b("month")}/${b("year")} ${b("hour")}:${b("minute")} WIB`;
}

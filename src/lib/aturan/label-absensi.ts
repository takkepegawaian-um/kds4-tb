// Tulisan di layar untuk status absensi.
//
// Nilai yang TERSIMPAN di database dan dipakai aturan hambatan tetap "AKTIF" dan "NON AKTIF"
// (sama dengan Excel). Hanya tulisan yang ditampilkan ke pengguna yang diganti, supaya tidak
// membingungkan:
//   AKTIF     = absensi pegawai ditandai TB oleh Admin (bebas absen selama TB)
//   NON AKTIF = tidak ada tanda TB, sehingga pegawai harus absen sendiri

export const LABEL_ABSENSI: Record<string, string> = {
  AKTIF: "Ditandai TB",
  "NON AKTIF": "Tidak ditandai TB (absen sendiri)",
};

/** Tulisan untuk ditampilkan. Nilai di luar daftar ditampilkan apa adanya. */
export function labelAbsensi(nilai: string | null | undefined): string {
  if (!nilai) return "";
  return LABEL_ABSENSI[nilai.toUpperCase()] ?? nilai;
}

/**
 * Mengubah isian (nilai asli maupun tulisan di layar) menjadi nilai yang disimpan.
 * Dipakai impor Excel supaya berkas hasil ekspor (yang memuat tulisan baru) tetap bisa diimpor.
 * Mengembalikan null bila tidak dikenal.
 */
export function bacaAbsensi(teks: string | null | undefined): string | null {
  const t = (teks ?? "").trim().toLowerCase();
  if (!t) return null;
  for (const [nilai, label] of Object.entries(LABEL_ABSENSI)) {
    if (t === nilai.toLowerCase() || t === label.toLowerCase()) return nilai;
  }
  return null;
}

// Label dan pembantu untuk halaman Log Aktivitas (fungsi murni, mudah diuji).

import { bacaTanggal } from "@/lib/excel/data-tb";
import { ISIAN } from "@/lib/data/formulir";

export const LABEL_AKSI_PERUBAHAN: Record<string, string> = {
  TAMBAH: "Ditambahkan",
  UBAH: "Diubah",
  HAPUS: "Dihapus",
  PULIHKAN: "Dipulihkan",
  IMPOR: "Impor Excel",
};

export const LABEL_PERISTIWA: Record<string, string> = {
  LOGIN_BERHASIL: "Masuk",
  LOGIN_GAGAL: "Gagal masuk",
  LOGIN_DITOLAK: "Masuk ditolak (akun terkunci)",
  AKUN_TERKUNCI: "Akun dikunci",
  LOGOUT: "Keluar",
  EKSPOR: "Ekspor data",
  GANTI_SANDI: "Ganti kata sandi",
  GANTI_SANDI_GAGAL: "Gagal ganti kata sandi",
  KELUAR_SEMUA_PERANGKAT: "Keluarkan perangkat lain",
  RESET_SANDI: "Reset kata sandi (terminal)",
  BUKA_KUNCI: "Buka kunci (terminal)",
  AKUN_DIBUAT: "Akun dibuat (terminal)",
};

/** Peristiwa yang patut diperhatikan (ditandai merah). */
export const PERISTIWA_PENTING = new Set(["LOGIN_GAGAL", "LOGIN_DITOLAK", "AKUN_TERKUNCI", "GANTI_SANDI_GAGAL", "RESET_SANDI"]);

export const LABEL_ENTITAS: Record<string, string> = {
  PegawaiTB: "Data TB",
  Parameter: "Pengaturan: parameter",
  HariLibur: "Pengaturan: hari libur",
  PilihanNilai: "Pengaturan: daftar pilihan",
  PemetaanStatusSk: "Pengaturan: Status SK",
  AturanHambatan: "Pengaturan: aturan hambatan",
  RekapResmiFakultas: "Pengaturan: rekap resmi",
  RekapPenerbitanSk: "Pengaturan: rekap penerbitan SK",
};

/** Nama kolom yang mudah dibaca (kolom Data TB memakai label form). */
export function labelKolom(kolom: string | null): string {
  if (!kolom) return "";
  return ISIAN[kolom as keyof typeof ISIAN]?.label ?? kolom;
}

/**
 * Rentang waktu satu hari atau lebih menurut WIB (UTC+7, tanpa musim panas).
 * @param dari, sampai tanggal "dd/mm/yyyy" atau "yyyy-mm-dd"; boleh kosong
 * @returns batas bawah (termasuk) dan batas atas (tidak termasuk) dalam waktu UTC
 */
export function rentangWib(dari?: string, sampai?: string): { gte?: Date; lt?: Date } {
  const r: { gte?: Date; lt?: Date } = {};
  const a = dari ? bacaTanggal(dari.trim()) : null;
  const b = sampai ? bacaTanggal(sampai.trim()) : null;
  if (a) r.gte = new Date(`${a}T00:00:00+07:00`);
  if (b) r.lt = new Date(new Date(`${b}T00:00:00+07:00`).getTime() + 86_400_000);
  return r;
}

/** Ringkasan perangkat dari user-agent, mis. "Edge · Windows". */
export function ringkasPerangkat(ua: string | null): string {
  if (!ua) return "–";
  if (ua.startsWith("terminal")) return "Terminal server";
  const peramban = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Peramban lain";
  const sistem = /Android/.test(ua)
    ? "Android"
    : /iPhone|iPad/.test(ua)
      ? "iPhone/iPad"
      : /Windows/.test(ua)
        ? "Windows"
        : /Mac OS X/.test(ua)
          ? "Mac"
          : /Linux/.test(ua)
            ? "Linux"
            : "sistem lain";
  return `${peramban} · ${sistem}`;
}

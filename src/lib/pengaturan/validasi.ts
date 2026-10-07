// Pemeriksaan isian layar Pengaturan (fungsi murni, mudah diuji).

import { bacaTanggal } from "@/lib/excel/data-tb";
import { NILAI } from "@/lib/aturan/mesin";
import type { KategoriPilihan } from "./bawaan";

/** Rentang yang masuk akal untuk setiap parameter angka. */
export const BATAS_PARAMETER: Record<string, { min: number; max: number; satuan: string }> = {
  toleransiUsulBulan: { min: 1, max: 36, satuan: "bulan" },
  tenggatPerpanjanganBulan: { min: 0, max: 24, satuan: "bulan" },
  ambangMasaTbHari: { min: 0, max: 3650, satuan: "hari" },
  ambangPresensiHari: { min: 0, max: 3650, satuan: "hari" },
  batasTertahanHari: { min: 1, max: 3650, satuan: "hari" },
  pengurangSkorTetap: { min: 0, max: 100, satuan: "poin" },
  batasUsulHariKerja: { min: 0, max: 365, satuan: "hari kerja" },
  batasLaporHariKerja: { min: 0, max: 365, satuan: "hari kerja" },
  batasKritis: { min: 1, max: 100, satuan: "poin" },
  batasWaspada: { min: 1, max: 100, satuan: "poin" },
};

export type Galat = Record<string, string>;

/**
 * Memeriksa nilai parameter.
 * @param definisi kunci -> tipe ("angka" | "tanggal" | "teks")
 * @returns nilai yang sudah dirapikan (tanggal jadi yyyy-mm-dd) dan galat per kunci
 */
export function periksaParameter(isian: Record<string, string>, definisi: Record<string, string>) {
  const nilai: Record<string, string> = {};
  const galat: Galat = {};
  for (const [kunci, tipe] of Object.entries(definisi)) {
    const v = (isian[kunci] ?? "").trim();
    if (tipe === "angka") {
      const b = BATAS_PARAMETER[kunci];
      if (!/^-?\d+$/.test(v)) galat[kunci] = "Isi dengan bilangan bulat.";
      else if (b && (Number(v) < b.min || Number(v) > b.max)) galat[kunci] = `Harus antara ${b.min} dan ${b.max} ${b.satuan}.`;
      nilai[kunci] = String(Number(v));
    } else if (tipe === "tanggal") {
      if (v === "") nilai[kunci] = "";
      else {
        const t = bacaTanggal(v);
        if (!t) galat[kunci] = "Tulis tanggal dengan format dd/mm/yyyy, atau kosongkan.";
        nilai[kunci] = t ?? "";
      }
    } else {
      if (v === "") galat[kunci] = "Wajib diisi.";
      else if (v.length > 100) galat[kunci] = "Maksimal 100 karakter.";
      nilai[kunci] = v;
    }
  }
  if (!galat.batasKritis && !galat.batasWaspada && "batasKritis" in definisi && Number(nilai.batasWaspada) >= Number(nilai.batasKritis)) {
    galat.batasWaspada = "Batas Waspada harus lebih kecil dari batas Kritis.";
  }
  return { nilai, galat };
}

export type BarisAturan = { kode: number; nama: string; skorDasar: number | string; saran: string; aktif: boolean };

export function periksaAturan(baris: BarisAturan[]) {
  const galat: Galat = {};
  const nilai = baris.map((b) => {
    const skor = Number(b.skorDasar);
    const nama = b.nama.trim();
    const saran = b.saran.trim();
    if (!nama) galat[`${b.kode}.nama`] = "Nama hambatan wajib diisi.";
    else if (nama.length > 200) galat[`${b.kode}.nama`] = "Maksimal 200 karakter.";
    if (!saran) galat[`${b.kode}.saran`] = "Saran tindakan wajib diisi (pakai - bila tidak ada).";
    else if (saran.length > 1000) galat[`${b.kode}.saran`] = "Maksimal 1000 karakter.";
    if (b.kode === 0) return { kode: 0, nama, skorDasar: 0, saran, aktif: true }; // kode 0 selalu skor 0 dan aktif
    if (!Number.isInteger(skor) || skor < 1 || skor > 100) galat[`${b.kode}.skorDasar`] = "Skor 1 sampai 100.";
    return { kode: b.kode, nama, skorDasar: skor, saran, aktif: !!b.aktif };
  });
  return { nilai, galat };
}

export type BarisStatusSk = { statusSk: string; tahap: string; pihakPenahan: string; skTerbit: string };

/** Status SK yang namanya dipakai langsung oleh aturan hambatan (kode 4 dan 10). */
export const STATUS_SK_SISTEM = [NILAI.USUL_PENGAKTIFAN] as readonly string[];

export function periksaStatusSk(baris: BarisStatusSk[]) {
  const galat: Galat = {};
  const lihat = new Set<string>();
  const nilai = baris.map((b, i) => {
    const r = { statusSk: b.statusSk.trim(), tahap: b.tahap.trim(), pihakPenahan: b.pihakPenahan.trim(), skTerbit: b.skTerbit };
    if (!r.statusSk) galat[`${i}.statusSk`] = "Wajib diisi.";
    else if (lihat.has(r.statusSk.toLowerCase())) galat[`${i}.statusSk`] = "Status SK ini sudah ada.";
    lihat.add(r.statusSk.toLowerCase());
    if (!r.tahap) galat[`${i}.tahap`] = "Wajib diisi.";
    if (!r.pihakPenahan) galat[`${i}.pihakPenahan`] = "Wajib diisi.";
    if (r.skTerbit !== NILAI.SK_YA && r.skTerbit !== NILAI.SK_BELUM) galat[`${i}.skTerbit`] = "Pilih Ya atau Belum.";
    return r;
  });
  if (!nilai.some((r) => r.tahap.toLowerCase() === NILAI.TAHAP_TB_BERJALAN.toLowerCase())) {
    galat.umum = `Minimal satu Status SK harus bertahap "${NILAI.TAHAP_TB_BERJALAN}" (dipakai aturan kode 9).`;
  }
  for (const s of STATUS_SK_SISTEM) {
    if (!nilai.some((r) => r.statusSk.toLowerCase() === s.toLowerCase())) galat.umum = `Status SK "${s}" dipakai aturan hambatan dan tidak boleh dihapus.`;
  }
  return { nilai, galat };
}

/** Kolom Data TB yang memakai setiap kategori daftar pilihan (untuk cek "masih dipakai"). */
export const KOLOM_KATEGORI: Record<KategoriPilihan, string> = {
  FAKULTAS: "fakultas",
  STATUS_AKHIR: "statusAkhir",
  JENIS_PELAKSANAAN: "jenisPelaksanaan",
  LOKASI: "lokasi",
  KONDISI_KULIAH: "kondisiKuliah",
  PRESENSI: "presensi",
  JENJANG: "jenjang",
};

export function periksaNilaiPilihan(nilai: string, yangAda: string[]): string | null {
  const v = nilai.trim();
  if (!v) return "Nilai wajib diisi.";
  if (v.length > 100) return "Maksimal 100 karakter.";
  if (yangAda.some((x) => x.toLowerCase() === v.toLowerCase())) return "Nilai ini sudah ada di daftar.";
  return null;
}

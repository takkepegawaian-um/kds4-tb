// Bentuk Pengaturan yang dipakai mesin aturan, dan cara menyusunnya
// dari baris-baris tabel Pengaturan (database) atau dari nilai bawaan Excel.

import {
  ATURAN_HAMBATAN_BAWAAN,
  PARAMETER_BAWAAN,
  STATUS_SK_BAWAAN,
} from "@/lib/pengaturan/bawaan";

export const LEVEL = ["Kritis", "Waspada", "Perhatian", "Aman"] as const;
export type Level = (typeof LEVEL)[number];

export type PengaturanAturan = {
  toleransiUsulBulan: number;
  tenggatPerpanjanganBulan: number;
  ambangMasaTbHari: number;
  ambangPresensiHari: number;
  batasTertahanHari: number;
  pengurangSkorTetap: number;
  batasUsulHariKerja: number;
  batasLaporHariKerja: number;
  batasKritis: number;
  batasWaspada: number;
  tahapStatusKosong: string;
  pihakStatusKosong: string;
  statusSk: { statusSk: string; tahap: string; pihakPenahan: string; skTerbit: string }[];
  aturan: { kode: number; nama: string; skorDasar: number; saran: string; aktif: boolean }[];
  /** Tanggal libur "yyyy-mm-dd" */
  hariLibur: string[];
};

const KUNCI_ANGKA = [
  "toleransiUsulBulan",
  "tenggatPerpanjanganBulan",
  "ambangMasaTbHari",
  "ambangPresensiHari",
  "batasTertahanHari",
  "pengurangSkorTetap",
  "batasUsulHariKerja",
  "batasLaporHariKerja",
  "batasKritis",
  "batasWaspada",
] as const;

type SumberPengaturan = {
  parameter: { kunci: string; nilai: string }[];
  statusSk: PengaturanAturan["statusSk"];
  aturan: (Omit<PengaturanAturan["aturan"][number], "aktif"> & { aktif?: boolean })[];
  hariLibur: string[];
};

/** Menyusun Pengaturan dari baris-baris tabel. Melempar galat bila ada parameter yang hilang/tidak valid. */
export function susunPengaturan(s: SumberPengaturan): PengaturanAturan {
  const nilai = new Map(s.parameter.map((p) => [p.kunci, p.nilai]));
  const angka = {} as Record<(typeof KUNCI_ANGKA)[number], number>;
  for (const kunci of KUNCI_ANGKA) {
    const v = Number(nilai.get(kunci));
    if (!nilai.has(kunci) || nilai.get(kunci) === "" || !Number.isFinite(v)) {
      throw new Error(`Parameter "${kunci}" kosong atau bukan angka. Periksa layar Pengaturan.`);
    }
    angka[kunci] = v;
  }
  return {
    ...angka,
    tahapStatusKosong: nilai.get("tahapStatusKosong") || "Belum dicatat",
    pihakStatusKosong: nilai.get("pihakStatusKosong") || "Unit UM",
    statusSk: s.statusSk.map(({ statusSk, tahap, pihakPenahan, skTerbit }) => ({ statusSk, tahap, pihakPenahan, skTerbit })),
    aturan: s.aturan.map((a) => ({ kode: a.kode, nama: a.nama, skorDasar: a.skorDasar, saran: a.saran, aktif: a.aktif ?? true })),
    hariLibur: [...s.hariLibur],
  };
}

/** Pengaturan bawaan (sama dengan sheet "Pengaturan" di Excel). Dipakai tes. */
export function pengaturanBawaan(): PengaturanAturan {
  return susunPengaturan({
    parameter: PARAMETER_BAWAAN,
    statusSk: STATUS_SK_BAWAAN,
    aturan: ATURAN_HAMBATAN_BAWAAN,
    hariLibur: [],
  });
}

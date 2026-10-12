// Pembakuan dan hitungan "Sebaran": sumber biaya (Beasiswa / Mandiri) dan kampus tujuan.
//
// Kolom Sumber biaya dan Tempat studi di Data TB berisi tulisan bebas (mis. "Sendiri", "LPDP",
// "UGM", "Universitas Gadjah Mada Yogyakarta"). Tabel pembakuan di Pengaturan menerjemahkan
// tiap tulisan ke satu kelompok / nama baku. Isi Data TB sendiri tidak diubah.
// Fungsi di sini murni (tanpa akses database) supaya mudah diuji.

import { NILAI, sama } from "./mesin";
import { angka, saring, KOSONG, type Angka, type BarisDihitung, type Kelompok, type Saringan } from "./saringan";

export const BIAYA = {
  BEASISWA: "Beasiswa",
  MANDIRI: "Mandiri",
  BELUM_JELAS: "Belum jelas",
  /** Tulisan yang belum ada di tabel pembakuan (bukan pilihan admin; muncul otomatis). */
  BELUM_DIKELOMPOKKAN: "Belum dikelompokkan",
} as const;

/** Kelompok yang boleh dipilih admin di tabel pembakuan Sumber biaya. */
export const PILIHAN_KELOMPOK_BIAYA: string[] = [BIAYA.BEASISWA, BIAYA.MANDIRI, BIAYA.BELUM_JELAS];

export const NEGARA_DALAM_NEGERI = "Indonesia";

export type JenisPembakuan = "BIAYA" | "KAMPUS";

export type BarisPembakuan = { jenis: string; asli: string; baku: string; negara: string | null };

export type Pembakuan = {
  biaya: Map<string, string>;
  kampus: Map<string, { nama: string; negara: string | null }>;
};

/** Kunci pembanding tulisan: tanpa spasi berlebih dan tidak membedakan huruf besar/kecil. */
export const kunciTeks = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** Tulisan dengan spasi dirapikan (huruf besar/kecil dipertahankan). */
export const rapikanTeks = (s: string) => s.trim().replace(/\s+/g, " ");

export function susunPembakuan(baris: readonly BarisPembakuan[]): Pembakuan {
  const p: Pembakuan = { biaya: new Map(), kampus: new Map() };
  for (const b of baris) {
    const k = kunciTeks(b.asli);
    if (!k || !b.baku.trim()) continue;
    if (b.jenis === "BIAYA") p.biaya.set(k, rapikanTeks(b.baku));
    else if (b.jenis === "KAMPUS") p.kampus.set(k, { nama: rapikanTeks(b.baku), negara: b.negara?.trim() || null });
  }
  return p;
}

/** Kelompok sumber biaya dan kampus untuk satu orang. */
export function kelompokkan(sumberBiaya: string | null | undefined, tempatStudi: string | null | undefined, p: Pembakuan): Kelompok {
  const biayaAsli = (sumberBiaya ?? "").trim();
  let biaya: string = BIAYA.BELUM_JELAS;
  if (biayaAsli) {
    const m = p.biaya.get(kunciTeks(biayaAsli));
    biaya = m && PILIHAN_KELOMPOK_BIAYA.some((x) => sama(x, m)) ? PILIHAN_KELOMPOK_BIAYA.find((x) => sama(x, m))! : BIAYA.BELUM_DIKELOMPOKKAN;
  }

  const kampusAsli = (tempatStudi ?? "").trim();
  if (!kampusAsli) return { biaya, kampus: KOSONG, negara: null };
  const k = p.kampus.get(kunciTeks(kampusAsli));
  return { biaya, kampus: k ? k.nama : rapikanTeks(kampusAsli), negara: k?.negara ?? null };
}

// ---------------------------------------------------------------------------
// Hitungan untuk Dashboard
// ---------------------------------------------------------------------------

export type Irisan = { nama: string; angka: Angka };

export type KampusHitung = { nama: string; negara: string | null; angka: Angka };
export type NegaraHitung = { nama: string; angka: Angka };

/**
 * @param baris baris yang sudah disaring filter global Dashboard
 * @param s     penyusun saringan (membawa filter global, supaya tautan daftar ikut tersaring)
 */
export function hitungSebaran(baris: readonly BarisDihitung[], s: (tambahan: Saringan) => Saringan) {
  const irisan = (nama: string, t: Saringan): Irisan => ({ nama, angka: angka(baris, s(t)) });
  const tb: Saringan = { sedangTb: true };

  const jenis = [NILAI.BEBAS, NILAI.TETAP].map((j) => irisan(j, { ...tb, jenis: j }));

  const urutanBiaya = [BIAYA.BEASISWA, BIAYA.MANDIRI, BIAYA.BELUM_JELAS, BIAYA.BELUM_DIKELOMPOKKAN];
  const biayaPer = (j: string) => urutanBiaya.map((b) => irisan(b, { ...tb, jenis: j, biaya: b }));

  // Kampus dan negara dikelompokkan dari baris Sedang TB.
  const sedang = saring(baris, s(tb));
  const kampusPer = new Map<string, { nama: string; negara: string | null }>();
  const negaraPer = new Map<string, string>();
  for (const b of sedang) {
    const kel = b.kelompok;
    if (!kel) continue;
    const kk = kel.kampus.toLowerCase();
    if (!kampusPer.has(kk)) kampusPer.set(kk, { nama: kel.kampus, negara: kel.negara });
    const n = kel.negara ?? KOSONG;
    if (!negaraPer.has(n.toLowerCase())) negaraPer.set(n.toLowerCase(), n);
  }

  const kampus: KampusHitung[] = [...kampusPer.values()]
    .map((k) => ({ ...k, angka: angka(baris, s({ ...tb, kampus: k.nama })) }))
    // "Belum diisi" selalu di bawah, sisanya menurut jumlah lalu nama.
    .sort((a, b) => Number(a.nama === KOSONG) - Number(b.nama === KOSONG) || b.angka.jumlah - a.angka.jumlah || a.nama.localeCompare(b.nama, "id"));

  const negara: NegaraHitung[] = [...negaraPer.values()]
    .map((n) => ({ nama: n, angka: angka(baris, s({ ...tb, negara: n })) }))
    .sort((a, b) => {
      // Indonesia di atas, "belum diketahui" di bawah, sisanya menurut jumlah.
      const bobot = (x: NegaraHitung) => (x.nama === NEGARA_DALAM_NEGERI ? 0 : x.nama === KOSONG ? 2 : 1);
      return bobot(a) - bobot(b) || b.angka.jumlah - a.angka.jumlah || a.nama.localeCompare(b.nama, "id");
    });

  return {
    jenis,
    biayaBebas: biayaPer(NILAI.BEBAS),
    biayaTetap: biayaPer(NILAI.TETAP),
    kampus,
    negara,
    totalTb: sedang.length,
  };
}

export type Sebaran = ReturnType<typeof hitungSebaran>;

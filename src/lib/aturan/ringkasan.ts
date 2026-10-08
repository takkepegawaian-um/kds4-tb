// Hitungan Dashboard: terjemahan rumus sheet "Dashboard".
//
// Perbedaan yang disetujui: angka Bebas/Tetap hanya menghitung orang "Sedang TB".
// Excel menghitung semua baris yang kolom Jenis-nya terisi; karena kolom Jenis
// hanya terisi untuk Sedang TB, hasilnya sama untuk data saat ini.

import { NILAI } from "./mesin";
import type { PengaturanAturan } from "./pengaturan";
import { angka, saring, type Angka, type BarisDihitung, type Saringan } from "./saringan";

export type PerJenis = { bebas: Angka; tetap: Angka; total: number; semua: Angka };

export type FilterDashboard = { fakultas?: string; jenis?: string };

type Daftar = {
  statusAkhir: string[];
  fakultas: string[];
};

const LEVEL_DASHBOARD = ["Kritis", "Waspada", "Perhatian", "Aman"] as const;

/** Rentang "Masa TB berakhir" (sisa hari dari akhir efektif). */
export const RENTANG_MASA_TB: { label: string; min?: number; max?: number }[] = [
  { label: "Sudah lewat", max: -1 },
  { label: "0 sampai 30 hari", min: 0, max: 30 },
  { label: "31 sampai 60 hari", min: 31, max: 60 },
  { label: "61 sampai 90 hari", min: 61, max: 90 },
  { label: "Lebih dari 90 hari", min: 91 },
];

export function hitungRingkasan(
  semua: readonly BarisDihitung[],
  pengaturan: PengaturanAturan,
  daftar: Daftar,
  filter: FilterDashboard = {},
) {
  // Filter global (fakultas, jenis) diterapkan sebelum semua hitungan.
  const dasar: Saringan = {};
  if (filter.fakultas) dasar.fakultas = filter.fakultas;
  if (filter.jenis) dasar.jenis = filter.jenis;
  const baris = saring(semua, dasar);

  // Bila tambahan bertentangan dengan filter global (mis. jenis Tetap saat filter Bebas),
  // hasilnya pasti kosong; ditandai "tidakAda" supaya tautan daftarnya juga kosong.
  const s = (tambahan: Saringan): Saringan => {
    const bentrok = (["jenis", "fakultas"] as const).some((k) => dasar[k] !== undefined && tambahan[k] !== undefined && dasar[k] !== tambahan[k]);
    return bentrok ? { ...dasar, ...tambahan, tidakAda: true } : { ...dasar, ...tambahan };
  };
  const perJenis = (tambahan: Saringan): PerJenis => {
    const bebas = angka(baris, s({ sedangTb: true, ...tambahan, jenis: NILAI.BEBAS }));
    const tetap = angka(baris, s({ sedangTb: true, ...tambahan, jenis: NILAI.TETAP }));
    // "semua" = Bebas + Tetap, dipakai untuk tautan angka total.
    const semua = angka(baris, s({ sedangTb: true, ...tambahan, jenisTerisi: true }));
    return { bebas, tetap, total: bebas.jumlah + tetap.jumlah, semua };
  };

  // --- Ringkasan (B8:E12)
  const ringkasan = {
    jumlahTb: perJenis({}),
    level: LEVEL_DASHBOARD.map((level) => ({ level, ...perJenis({ level: [level] }) })),
  };

  // --- Posisi per status akhir (B16:E21)
  const total = baris.length;
  const statusAkhir = daftar.statusAkhir.map((status) => {
    const a = angka(baris, s({ statusAkhir: status }));
    return { status, jumlah: a, persen: total === 0 ? 0 : a.jumlah / total };
  });
  const jumlahStatus = statusAkhir.reduce((t, x) => t + x.jumlah.jumlah, 0);

  // --- Hambatan terdeteksi (B26:E38): kode 1..12, lalu "Tidak ada hambatan" (kode 0)
  const urutanKode = [...pengaturan.aturan.map((a) => a.kode).filter((k) => k !== 0).sort((a, b) => a - b), 0];
  const hambatan = urutanKode.map((kode) => ({
    kode,
    nama: pengaturan.aturan.find((a) => a.kode === kode)?.nama ?? `Kode ${kode}`,
    ...perJenis({ kode }),
  }));

  // --- Posisi per tahap (B43:F47)
  const daftarTahap = unik([...pengaturan.statusSk.map((x) => x.tahap), pengaturan.tahapStatusKosong]);
  const tahap = daftarTahap.map((t) => {
    const di = saring(baris, s({ sedangTb: true, tahap: t }));
    const hari = di.map((b) => b.hasil.hariTertahan).filter((h): h is number => h !== null);
    // Excel menampilkan "belum ada data" bila tidak ada hari tertahan >= 0.
    const adaData = hari.some((h) => h >= 0);
    return {
      tahap: t,
      jumlah: { jumlah: di.length, saringan: s({ sedangTb: true, tahap: t }) } as Angka,
      rataRataTertahan: adaData ? hari.reduce((a, b) => a + b, 0) / hari.length : null,
      terlama: adaData ? Math.max(...hari) : null,
      kritisWaspada: angka(baris, s({ sedangTb: true, tahap: t, level: ["Kritis", "Waspada"] })),
    };
  });

  // --- Siapa yang menahan (B53:E56), hanya baris yang punya hambatan (skor > 0)
  const daftarPihak = unik([...pengaturan.statusSk.map((x) => x.pihakPenahan), pengaturan.pihakStatusKosong]);
  const penahan = [
    ...daftarPihak.map((pihak) => ({ pihak, ...perJenis({ pihak, berhambatan: true }) })),
    { pihak: "Lainnya", ...perJenis({ pihakBukan: daftarPihak, berhambatan: true }) },
  ];

  // --- Per fakultas (B61:H72)
  const perFakultas = (f: Saringan) => ({
    total: angka(baris, s(f)),
    bebas: angka(baris, s({ ...f, sedangTb: true, jenis: NILAI.BEBAS })),
    kritis: angka(baris, s({ ...f, level: ["Kritis"] })),
    waspada: angka(baris, s({ ...f, level: ["Waspada"] })),
    perhatian: angka(baris, s({ ...f, level: ["Perhatian"] })),
    arsip: angka(baris, s({ ...f, sedangTb: false })),
  });
  const fakultasBaris = [
    ...daftar.fakultas.map((fakultas) => ({ fakultas, ...perFakultas({ fakultas }) })),
    { fakultas: "(Fakultas kosong atau tidak dikenal)", ...perFakultas({ fakultasBukan: daftar.fakultas }) },
  ];
  const jumlahKolom = (k: "total" | "bebas" | "kritis" | "waspada" | "perhatian" | "arsip") =>
    fakultasBaris.reduce((t, f) => t + f[k].jumlah, 0);
  const fakultas = {
    baris: fakultasBaris,
    jumlah: {
      total: jumlahKolom("total"),
      bebas: jumlahKolom("bebas"),
      kritis: jumlahKolom("kritis"),
      waspada: jumlahKolom("waspada"),
      perhatian: jumlahKolom("perhatian"),
      arsip: jumlahKolom("arsip"),
    },
  };

  // --- Masa TB berakhir (B76:E80)
  const masaTb = RENTANG_MASA_TB.map((r) => ({
    label: r.label,
    ...perJenis({
      ...(r.min !== undefined && { sisaHariMin: r.min }),
      ...(r.max !== undefined && { sisaHariMax: r.max }),
    }),
  }));

  // --- Absensi, khusus Bebas TriDharma (B86:C92; baris "tidak jelas / MISTERY" sudah dihapus)
  const bebas: Saringan = { sedangTb: true, jenis: NILAI.BEBAS };
  const presensi = {
    aktif: angka(baris, s({ ...bebas, presensi: NILAI.AKTIF })),
    nonAktif: angka(baris, s({ ...bebas, presensi: NILAI.NON_AKTIF })),
    ditandaiTerisi: angka(baris, s({ ...bebas, presensiTbTerisi: true })),
    kode5: angka(baris, s({ sedangTb: true, kode: 5 })),
    kode1: angka(baris, s({ sedangTb: true, kode: 1 })),
    kode2: angka(baris, s({ sedangTb: true, kode: 2 })),
  };

  return {
    ringkasan,
    statusAkhir: { baris: statusAkhir, total: jumlahStatus, cocok: jumlahStatus === total },
    hambatan,
    tahap,
    penahan,
    fakultas,
    masaTb,
    presensi,
  };
}

export type Ringkasan = ReturnType<typeof hitungRingkasan>;

/** Rekap resmi per fakultas dibandingkan dengan jumlah Sedang TB di Data TB (B97:G107). */
export function hitungRekapResmi(
  semua: readonly BarisDihitung[],
  rekap: { fakultas: string; tugasBelajar: number; biayaMandiri: number }[],
) {
  const baris = rekap.map((r) => {
    const sedang = angka(semua, { fakultas: r.fakultas, statusAkhir: NILAI.SEDANG_TB });
    const jumlahRekap = r.tugasBelajar + r.biayaMandiri;
    return { ...r, jumlahRekap, sedangTb: sedang, selisih: sedang.jumlah - jumlahRekap };
  });
  const t = (f: (x: (typeof baris)[number]) => number) => baris.reduce((a, x) => a + f(x), 0);
  return {
    baris,
    jumlah: {
      tugasBelajar: t((x) => x.tugasBelajar),
      biayaMandiri: t((x) => x.biayaMandiri),
      jumlahRekap: t((x) => x.jumlahRekap),
      sedangTb: t((x) => x.sedangTb.jumlah),
      selisih: t((x) => x.selisih),
    },
  };
}

function unik(xs: string[]): string[] {
  const lihat = new Set<string>();
  return xs.filter((x) => {
    const k = x.toLowerCase();
    if (lihat.has(k)) return false;
    lihat.add(k);
    return true;
  });
}

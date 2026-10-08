// MESIN ATURAN HAMBATAN
//
// Terjemahan persis rumus kolom X sampai AJ di sheet "Data TB" (DATA_TB.xlsx).
// Rumus Excel aslinya ditulis di komentar setiap bagian supaya mudah dicocokkan.
// Semua angka (ambang hari, skor, batas level, dst.) diambil dari Pengaturan,
// bukan ditulis mati di sini. Yang tertulis di sini hanya SYARAT tiap kode.
//
// Catatan sifat Excel yang ditiru:
// - Perbandingan teks Excel ("=" , VLOOKUP, COUNTIFS) tidak membedakan huruf besar/kecil.
// - Sel kosong dianggap teks "" dalam perbandingan, dan 0 dalam N(...).

import { edate, keSeri, dariSeri, workday } from "./hari";
import type { Level, PengaturanAturan } from "./pengaturan";

/** Nilai isian yang dipakai langsung oleh syarat aturan. */
export const NILAI = {
  SEDANG_TB: "Sedang TB",
  BEBAS: "Bebas",
  TETAP: "Tetap",
  AKTIF: "AKTIF",
  NON_AKTIF: "NON AKTIF",
  USUL_PENGAKTIFAN: "Usul Pengaktifan",
  TAHAP_TB_BERJALAN: "TB berjalan",
  SK_YA: "Ya",
  SK_BELUM: "Belum",
  SK_TIDAK_DIKETAHUI: "?",
} as const;

/** Kolom input dari satu baris Data TB. Tanggal ditulis "yyyy-mm-dd" atau null. */
export type InputPegawai = {
  /** Urutan baris; memecah peringkat bila skor sama (baris lebih atas menang). */
  urutan: number;
  nama: string | null;
  nip: string | null;
  statusAkhir: string | null;
  fakultas: string | null;
  jenisPelaksanaan: string | null;
  statusSk: string | null;
  presensi: string | null;
  tmtTb: string | null;
  masaStudiSd: string | null;
  perpanjanganSd: string | null;
  presensiTbSd: string | null;
  tanggalMasukTahap: string | null;
};

export type HasilPegawai = {
  /** X  Akhir efektif ("yyyy-mm-dd") */
  akhirEfektif: string | null;
  /** Y  Sisa hari */
  sisaHari: number | null;
  /** Z  Tahap (hanya Sedang TB) */
  tahap: string | null;
  /** AA SK terbit? (hanya Sedang TB): "Ya" / "Belum" / "?" */
  skTerbit: string | null;
  /** AB Hari kuliah tanpa SK */
  hariKuliahTanpaSk: number | null;
  /** AC Hari tertahan */
  hariTertahan: number | null;
  /** AD Pihak penahan (hanya Sedang TB) */
  pihakPenahan: string | null;
  /** AE Kode hambatan utama (0 bila tidak ada / bukan Sedang TB) */
  kode: number;
  /** AF Hambatan utama (hanya Sedang TB) */
  hambatan: string | null;
  /** Saran tindakan untuk kode ini (dari tabel aturan) */
  saran: string | null;
  /** AH Skor */
  skor: number;
  /** AG Level (hanya Sedang TB) */
  level: Level | null;
  /** AI Peringkat (hanya bila skor > 0) */
  peringkat: number | null;
  /** AJ Cek data (hanya Sedang TB). null bila tidak ada catatan. */
  cekData: string | null;
  /** Peringatan tambahan di luar Excel (mis. NIP bukan 18 digit). */
  peringatan: string[];
};

// ---------------------------------------------------------------------------
// Pembantu yang meniru perilaku Excel
// ---------------------------------------------------------------------------

/** Perbandingan teks ala Excel: tidak membedakan huruf besar/kecil; kosong = "". */
export function sama(a: string | null | undefined, b: string): boolean {
  return (a ?? "").toLowerCase() === b.toLowerCase();
}

const kosong = (v: string | null | undefined) => v == null || v === "";

/** N(tanggal): nomor seri bila ada, 0 bila kosong. */
const n = (seri: number | null) => seri ?? 0;

const seriAtauNull = (iso: string | null) => (kosong(iso) ? null : keSeri(iso!));

// ---------------------------------------------------------------------------
// Hitungan per baris
// ---------------------------------------------------------------------------

/** Konteks yang sama untuk semua baris (disiapkan sekali oleh hitungSemua). */
type Konteks = {
  acuan: number; // nomor seri tanggal acuan
  p: PengaturanAturan;
  libur: Set<number>;
  statusSk: Map<string, PengaturanAturan["statusSk"][number]>;
  aturan: Map<number, PengaturanAturan["aturan"][number]>;
  jumlahNip: Map<string, number>;
};

function hitungBaris(r: InputPegawai, k: Konteks): Omit<HasilPegawai, "peringkat"> {
  const { acuan, p } = k;
  const M = seriAtauNull(r.tmtTb);
  const N = seriAtauNull(r.masaStudiSd);
  const O = seriAtauNull(r.perpanjanganSd);
  const U = seriAtauNull(r.presensiTbSd);
  const W = seriAtauNull(r.tanggalMasukTahap);
  const I = r.jenisPelaksanaan;
  const T = r.presensi;
  const P = r.statusSk;
  const sedang = sama(r.statusAkhir, NILAI.SEDANG_TB);

  // X  =IF($N="","",IF($O="",$N,MAX($N,$O)))
  const X = N === null ? null : O === null ? N : Math.max(N, O);

  // Y  =IF($X="","",$X-TanggalAcuan)
  const Y = X === null ? null : X - acuan;

  // Z, AA, AD  =VLOOKUP($P, tabel Status SK, ...) dengan nilai cadangan bila tidak ketemu
  const peta = k.statusSk.get((P ?? "").toLowerCase());
  const Z = sedang ? (peta?.tahap ?? p.tahapStatusKosong) : null;
  const AA = sedang ? (peta?.skTerbit ?? NILAI.SK_TIDAK_DIKETAHUI) : null;
  const AD = sedang ? (peta?.pihakPenahan ?? p.pihakStatusKosong) : null;

  // AB =IF(AND($AA="Belum",N($M)>0),IF($M<=Acuan,Acuan-$M,""),"")
  const AB = sedang && sama(AA, NILAI.SK_BELUM) && n(M) > 0 && M! <= acuan ? acuan - M! : null;

  // AC =IF($W="","",Acuan-$W)
  const AC = sedang && W !== null ? acuan - W : null;

  // AE  Kode hambatan: syarat diperiksa berurutan, kode pertama yang terpenuhi dipakai.
  const bebas = sama(I, NILAI.BEBAS);
  const belum = sama(AA, NILAI.SK_BELUM);
  const syarat: [number, () => boolean][] = [
    // 1 Masa TB berakhir, tetapi absensi masih ditandai TB (AKTIF)
    //   AND($I="Bebas",N($X)>0,$T="AKTIF",$X<Acuan)
    [1, () => bebas && n(X) > 0 && sama(T, NILAI.AKTIF) && X! < acuan],
    // 2 SK TB berlaku, tetapi absensi tidak ditandai TB (NON AKTIF)
    //   AND($I="Bebas",$T="NON AKTIF",$AA="Ya",N($X)>0,$X>=Acuan)
    [2, () => bebas && sama(T, NILAI.NON_AKTIF) && sama(AA, NILAI.SK_YA) && n(X) > 0 && X! >= acuan],
    // 3 Kuliah berjalan lebih dari 1 semester tanpa SK
    //   AND($AA="Belum",N($M)>0,EDATE($M,Toleransi)<Acuan)
    [3, () => belum && n(M) > 0 && edate(M!, p.toleransiUsulBulan) < acuan],
    // 4 Masa TB berakhir, belum ada perpanjangan atau pengaktifan
    //   AND(N($X)>0,$P<>"Usul Pengaktifan",$X<Acuan)
    [4, () => n(X) > 0 && !sama(P, NILAI.USUL_PENGAKTIFAN) && X! < acuan],
    // 5 Penandaan TB di absensi lebih pendek dari masa TB
    //   AND($I="Bebas",N($U)>0,N($X)>0,$U<$X,$U-Acuan<=AmbangPresensi)
    [5, () => bebas && n(U) > 0 && n(X) > 0 && U! < X! && U! - acuan <= p.ambangPresensiHari],
    // 6 Usul melewati batas 14 hari kerja sebelum kuliah
    //   AND($AA="Belum",N($M)>0,$M>Acuan,WORKDAY($M,-BatasUsul,Libur)<Acuan)
    [6, () => belum && n(M) > 0 && M! > acuan && workday(M!, -p.batasUsulHariKerja, k.libur) < acuan],
    // 7 Kuliah berjalan, SK belum terbit (dalam toleransi 1 semester)
    //   AND($AA="Belum",N($M)>0,$M<=Acuan)
    [7, () => belum && n(M) > 0 && M! <= acuan],
    // 8 Tenggat usul perpanjangan sudah lewat
    //   AND($O="",N($N)>0,$N>=Acuan,EDATE($N,-Tenggat)<Acuan)
    [8, () => O === null && n(N) > 0 && N! >= acuan && edate(N!, -p.tenggatPerpanjanganBulan) < acuan],
    // 9 Tertahan di tahap yang sama melebihi batas hari
    //   AND(N($AC)>BatasTertahan,$Z<>"TB berjalan")
    [9, () => (AC ?? 0) > p.batasTertahanHari && !sama(Z, NILAI.TAHAP_TB_BERJALAN)],
    // 10 Masa TB segera berakhir atau menunggu pengaktifan
    //   OR($P="Usul Pengaktifan",AND(N($X)>0,$X>=Acuan,$X-Acuan<=AmbangMasaTb))
    [10, () => sama(P, NILAI.USUL_PENGAKTIFAN) || (n(X) > 0 && X! >= acuan && X! - acuan <= p.ambangMasaTbHari)],
    // 11 Status SK belum dicatat
    //   $AA="?"
    [11, () => sama(AA, NILAI.SK_TIDAK_DIKETAHUI)],
    // 12 Tanggal TMT atau masa studi kosong atau tidak terbaca
    //   N($N)=0
    [12, () => n(N) === 0],
  ];

  let kode = 0;
  if (sedang) {
    for (const [kd, cek] of syarat) {
      // Admin bisa menonaktifkan sebuah kode dari Pengaturan; bawaannya semua aktif (sama dengan Excel).
      if (k.aturan.get(kd)?.aktif === false) continue;
      if (cek()) {
        kode = kd;
        break;
      }
    }
  }

  // AH =IF($AE=0,0,MAX(1,SkorDasar(AE)-IF($I="Tetap",Pengurang,0)))
  const aturan = k.aturan.get(kode);
  const skor =
    kode === 0
      ? 0
      : Math.max(1, (aturan?.skorDasar ?? 0) - (sama(I, NILAI.TETAP) ? p.pengurangSkorTetap : 0));

  // AG =IF(AH>=80,"Kritis",IF(AH>=55,"Waspada",IF(AH>0,"Perhatian","Aman")))
  const level: Level | null = !sedang
    ? null
    : skor >= p.batasKritis
      ? "Kritis"
      : skor >= p.batasWaspada
        ? "Waspada"
        : skor > 0
          ? "Perhatian"
          : "Aman";

  // AJ Cek data (hanya Sedang TB)
  //   TRIM(IF(COUNTIF(NIP,$C)>1,"NIP kembar. ","") & IF($N="","TMT atau masa studi kosong. ","")
  //        & IF($I="","Jenis pelaksanaan kosong. ","")
  //        & IF($E="","Fakultas kosong. ",""))
  // Perbedaan yang disengaja: NIP dibandingkan utuh 18 digit. COUNTIF di Excel hanya
  // membandingkan 15 digit pertama sehingga keliru menandai NIP yang mirip sebagai kembar.
  let cekData: string | null = null;
  const peringatan: string[] = [];
  if (sedang) {
    const nip = (r.nip ?? "").trim();
    const isi = [
      nip !== "" && (k.jumlahNip.get(nip) ?? 0) > 1 ? "NIP kembar." : "",
      N === null ? "TMT atau masa studi kosong." : "",
      kosong(I) ? "Jenis pelaksanaan kosong." : "",
      kosong(r.fakultas) ? "Fakultas kosong." : "",
    ].filter(Boolean);
    cekData = isi.length ? isi.join(" ") : null;
    if (nip !== "" && !/^\d{18}$/.test(nip)) peringatan.push(`NIP berisi ${nip.length} karakter, seharusnya 18 digit angka.`);
  }

  return {
    akhirEfektif: X === null ? null : dariSeri(X),
    sisaHari: Y,
    tahap: Z,
    skTerbit: AA,
    hariKuliahTanpaSk: AB,
    hariTertahan: AC,
    pihakPenahan: AD,
    kode,
    hambatan: sedang ? (aturan?.nama ?? null) : null,
    saran: sedang ? (aturan?.saran ?? null) : null,
    skor,
    level,
    cekData,
    peringatan,
  };
}

/**
 * Menghitung semua kolom hasil untuk seluruh baris.
 * Hasil dikembalikan dalam urutan yang sama dengan masukan.
 *
 * @param tanggalAcuan "yyyy-mm-dd"
 */
export function hitungSemua(
  data: readonly InputPegawai[],
  pengaturan: PengaturanAturan,
  tanggalAcuan: string,
): HasilPegawai[] {
  const jumlahNip = new Map<string, number>();
  for (const r of data) {
    const nip = (r.nip ?? "").trim();
    if (nip) jumlahNip.set(nip, (jumlahNip.get(nip) ?? 0) + 1);
  }
  const k: Konteks = {
    acuan: keSeri(tanggalAcuan),
    p: pengaturan,
    libur: new Set(pengaturan.hariLibur.map(keSeri)),
    statusSk: new Map(pengaturan.statusSk.map((s) => [s.statusSk.toLowerCase(), s])),
    aturan: new Map(pengaturan.aturan.map((a) => [a.kode, a])),
    jumlahNip,
  };

  const hasil: HasilPegawai[] = data.map((r) => ({ ...hitungBaris(r, k), peringkat: null }));

  // AI =IF(N(AH)>0, RANK(AH, semua AH) + COUNTIF(AH baris sebelumnya s.d. baris ini, AH) - 1, "")
  // Sama dengan: urutkan skor menurun; skor sama diurutkan menurut urutan baris.
  const berskor = hasil
    .map((h, i) => ({ i, skor: h.skor, urutan: data[i].urutan }))
    .filter((x) => x.skor > 0)
    .sort((a, b) => b.skor - a.skor || a.urutan - b.urutan || a.i - b.i);
  berskor.forEach((x, posisi) => {
    hasil[x.i].peringkat = posisi + 1;
  });

  return hasil;
}

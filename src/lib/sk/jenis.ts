// Daftar jenis SK yang bisa dibuat, beserta isian formulirnya.
// Setiap jenis memakai satu templat Word di src/lib/sk/templat/ yang bertanda {isian}.
// Isian yang sebagian bisa diambil dari Data TB punya `dariPegawai` (diisikan otomatis
// saat pegawai dipilih, tetap bisa diubah).

import type { PegawaiTB } from "@/generated/prisma/client";
import { dariDb, formatTanggal } from "@/lib/tanggal";
import { DAFTAR_FAKULTAS, JENJANG, fakultasLengkap, jenjangDariData } from "./format";

export type TipeIsian = "teks" | "teksPanjang" | "tanggal" | "pilihan";

export type Isian = {
  kunci: string;
  label: string;
  tipe: TipeIsian;
  /** Judul kelompok isian di formulir */
  kelompok: string;
  wajib?: boolean;
  /** Nilai awal */
  bawaan?: string;
  /** Contoh isian (placeholder) */
  contoh?: string;
  pilihan?: readonly string[];
  /** Mengambil nilai awal dari satu orang di Data TB */
  dariPegawai?: (p: PegawaiTB) => string;
};

export type JenisSk = {
  id: string;
  nama: string;
  kelompok: "Tugas Belajar" | "Hukuman Disiplin";
  ringkas: string;
  /** Berkas templat di src/lib/sk/templat/ */
  templat: string;
  isian: Isian[];
};

export const PENANDATANGAN_REKTOR = { nama: "HARIYONO", nip: "196312271988021001" };

const tgl = (d: Date | null | undefined) => formatTanggal(dariDb(d));
const PILIHAN_JENJANG = Object.keys(JENJANG);

// ---------------------------------------------------------------------------
// Kelompok isian yang dipakai bersama
// ---------------------------------------------------------------------------

const pegawaiTb = (statusDosenBawaan: string): Isian[] => [
  { kunci: "nama", label: "Nama lengkap dan gelar", tipe: "teks", kelompok: "Pegawai", wajib: true, dariPegawai: (p) => p.nama },
  { kunci: "nip", label: "NITP / NIP", tipe: "teks", kelompok: "Pegawai", wajib: true, dariPegawai: (p) => p.nip },
  { kunci: "statusDosen", label: "Status", tipe: "pilihan", kelompok: "Pegawai", pilihan: ["Dosen Tetap", "Calon Dosen Tetap"], bawaan: statusDosenBawaan },
  { kunci: "tempatTanggalLahir", label: "Tempat, tanggal lahir", tipe: "teks", kelompok: "Pegawai", contoh: "Malang, 14 Januari 1993" },
  { kunci: "pangkatGolongan", label: "Pangkat, golongan ruang", tipe: "teks", kelompok: "Pegawai", contoh: "Penata, III/c" },
  { kunci: "jabatanAkademik", label: "Jabatan akademik", tipe: "teks", kelompok: "Pegawai", contoh: "Lektor", dariPegawai: (p) => p.jabatan ?? "" },
  { kunci: "fakultas", label: "Unit kerja (fakultas)", tipe: "pilihan", kelompok: "Pegawai", pilihan: DAFTAR_FAKULTAS, dariPegawai: (p) => fakultasLengkap(p.fakultas) },
];

const studi = (opsi: { akhirDari: (p: PegawaiTB) => Date | null; sumberBiaya?: boolean }): Isian[] => [
  { kunci: "jenjang", label: "Jenjang", tipe: "pilihan", kelompok: "Studi", pilihan: PILIHAN_JENJANG, bawaan: "Doktor (S3)", dariPegawai: (p) => jenjangDariData(p.jenjang) },
  { kunci: "programStudi", label: "Program studi", tipe: "teks", kelompok: "Studi", wajib: true, contoh: "Ilmu Akuntansi" },
  { kunci: "tempatStudi", label: "Perguruan tinggi tujuan", tipe: "teks", kelompok: "Studi", wajib: true, contoh: "Universitas Indonesia", dariPegawai: (p) => p.tempatStudi ?? "" },
  { kunci: "tmt", label: "Mulai tanggal", tipe: "tanggal", kelompok: "Studi", wajib: true, dariPegawai: (p) => tgl(p.tmtTb) },
  { kunci: "akhir", label: "Sampai tanggal", tipe: "tanggal", kelompok: "Studi", wajib: true, dariPegawai: (p) => tgl(opsi.akhirDari(p)) },
  ...(opsi.sumberBiaya
    ? [{ kunci: "sumberBiayaUraian", label: "Sumber pembiayaan (tulis lengkap)", tipe: "teks", kelompok: "Studi", wajib: true, contoh: "Beasiswa Program Doktor untuk Dosen Indonesia (BPDDI)", dariPegawai: (p: PegawaiTB) => p.sumberBiaya ?? "" } satisfies Isian]
    : []),
];

const suratUsul = (denganTanggal: boolean): Isian[] => [
  { kunci: "suratUsulNomor", label: "Nomor surat usul Dekan", tipe: "teks", kelompok: "Surat usul", contoh: "1.9.26/UN32.4/KP/2026" },
  ...(denganTanggal ? [{ kunci: "suratUsulTanggal", label: "Tanggal surat usul Dekan", tipe: "tanggal", kelompok: "Surat usul" } satisfies Isian] : []),
];

const penetapan = (penandatangan: { nama: string; nip: string }): Isian[] => [
  { kunci: "nomor", label: "Nomor SK (kosongkan bila belum ada)", tipe: "teks", kelompok: "Penetapan", contoh: "10.9.5/UN32/KP/2026" },
  { kunci: "tanggalPenetapan", label: "Ditetapkan pada tanggal", tipe: "tanggal", kelompok: "Penetapan" },
  { kunci: "namaPenandatangan", label: "Nama penandatangan", tipe: "teks", kelompok: "Penetapan", bawaan: penandatangan.nama },
  { kunci: "nipPenandatangan", label: "NIP penandatangan", tipe: "teks", kelompok: "Penetapan", bawaan: penandatangan.nip },
];

// ---------------------------------------------------------------------------
// Jenis SK
// ---------------------------------------------------------------------------

export const JENIS_SK: JenisSk[] = [
  {
    id: "tb-beasiswa",
    nama: "Pemberian Tugas Belajar (beasiswa)",
    kelompok: "Tugas Belajar",
    ringkas: "Dosen yang diangkat Rektor, Bebas TriDharma, dibiayai beasiswa",
    templat: "tb-beasiswa.docx",
    isian: [
      ...pegawaiTb("Dosen Tetap"),
      ...studi({ akhirDari: (p) => p.masaStudiSd, sumberBiaya: true }),
      ...suratUsul(false),
      ...penetapan(PENANDATANGAN_REKTOR),
    ],
  },
  {
    id: "tb-mandiri",
    nama: "Pemberian Tugas Belajar (biaya mandiri)",
    kelompok: "Tugas Belajar",
    ringkas: "Dosen yang diangkat Rektor, tetap menjalankan tridharma, biaya mandiri",
    templat: "tb-mandiri.docx",
    isian: [
      ...pegawaiTb("Calon Dosen Tetap"),
      ...studi({ akhirDari: (p) => p.masaStudiSd }),
      ...suratUsul(false),
      ...penetapan(PENANDATANGAN_REKTOR),
    ],
  },
  {
    id: "perpanjangan-tb",
    nama: "Perpanjangan Tugas Belajar",
    kelompok: "Tugas Belajar",
    ringkas: "Dosen tetap yang diangkat Rektor, biaya mandiri",
    templat: "perpanjangan-tb.docx",
    isian: [
      { kunci: "nama", label: "Nama lengkap dan gelar", tipe: "teks", kelompok: "Pegawai", wajib: true, dariPegawai: (p) => p.nama },
      { kunci: "nip", label: "NITP / NIP", tipe: "teks", kelompok: "Pegawai", wajib: true, dariPegawai: (p) => p.nip },
      { kunci: "sapaan", label: "Sapaan", tipe: "pilihan", kelompok: "Pegawai", pilihan: ["Saudara", "Saudari"], bawaan: "Saudara" },
      { kunci: "tempatTanggalLahir", label: "Tempat, tanggal lahir", tipe: "teks", kelompok: "Pegawai", contoh: "Palembang, 8 Maret 1990" },
      { kunci: "jabatanAkademik", label: "Jabatan akademik", tipe: "teks", kelompok: "Pegawai", contoh: "Asisten Ahli", dariPegawai: (p) => p.jabatan ?? "" },
      { kunci: "fakultas", label: "Unit kerja (fakultas)", tipe: "pilihan", kelompok: "Pegawai", pilihan: DAFTAR_FAKULTAS, dariPegawai: (p) => fakultasLengkap(p.fakultas) },
      { kunci: "jenjang", label: "Jenjang", tipe: "pilihan", kelompok: "Studi", pilihan: PILIHAN_JENJANG, bawaan: "Doktor (S3)", dariPegawai: (p) => jenjangDariData(p.jenjang) },
      { kunci: "programStudi", label: "Bidang ilmu", tipe: "teks", kelompok: "Studi", wajib: true, contoh: "Sosiologi" },
      { kunci: "tempatStudi", label: "Perguruan tinggi tujuan", tipe: "teks", kelompok: "Studi", wajib: true, dariPegawai: (p) => p.tempatStudi ?? "" },
      { kunci: "skSebelumNomor", label: "Nomor SK Rektor sebelumnya", tipe: "teks", kelompok: "SK sebelumnya", contoh: "30.10.94/UN32/KP/2024" },
      { kunci: "akhirSebelumnya", label: "Masa TB sebelumnya sampai tanggal", tipe: "tanggal", kelompok: "SK sebelumnya", wajib: true, dariPegawai: (p) => tgl(p.masaStudiSd) },
      { kunci: "tmt", label: "Perpanjangan mulai tanggal (kosong = sehari setelah masa sebelumnya)", tipe: "tanggal", kelompok: "Perpanjangan" },
      { kunci: "akhir", label: "Perpanjangan sampai tanggal", tipe: "tanggal", kelompok: "Perpanjangan", wajib: true, dariPegawai: (p) => tgl(p.perpanjanganSd) },
      { kunci: "alasan", label: "Alasan belum selesai", tipe: "teks", kelompok: "Perpanjangan", bawaan: "sedang menyelesaikan disertasi" },
      { kunci: "rekomendasiDari", label: "Surat rekomendasi dari", tipe: "teks", kelompok: "Perpanjangan", contoh: "Koordinator Prodi S1 Pendidikan IPS Universitas Negeri Malang" },
      { kunci: "rekomendasiNomor", label: "Nomor surat rekomendasi", tipe: "teks", kelompok: "Perpanjangan" },
      { kunci: "rekomendasiTanggal", label: "Tanggal surat rekomendasi", tipe: "tanggal", kelompok: "Perpanjangan" },
      ...suratUsul(true),
      ...penetapan(PENANDATANGAN_REKTOR),
    ],
  },
  {
    id: "hukdis-ringan",
    nama: "Hukuman disiplin ringan",
    kelompok: "Hukuman Disiplin",
    ringkas: "Teguran tertulis atau pernyataan tidak puas secara tertulis, ditandatangani Dekan",
    templat: "hukdis-ringan.docx",
    isian: [
      { kunci: "nama", label: "Nama lengkap dan gelar", tipe: "teks", kelompok: "Pegawai", wajib: true, dariPegawai: (p) => p.nama },
      { kunci: "nip", label: "NIP", tipe: "teks", kelompok: "Pegawai", wajib: true, dariPegawai: (p) => p.nip },
      { kunci: "pangkatGolongan", label: "Pangkat, golongan", tipe: "teks", kelompok: "Pegawai", contoh: "Penata, III/c" },
      { kunci: "jabatan", label: "Jabatan", tipe: "teks", kelompok: "Pegawai", dariPegawai: (p) => p.jabatan ?? "" },
      { kunci: "unitKerja", label: "Unit kerja", tipe: "teks", kelompok: "Pegawai", dariPegawai: (p) => (p.fakultas ? `${fakultasLengkap(p.fakultas)}, Universitas Negeri Malang` : "") },
      { kunci: "hukuman", label: "Hukuman disiplin", tipe: "pilihan", kelompok: "Hukuman", wajib: true, pilihan: ["Teguran Tertulis", "Pernyataan Tidak Puas Secara Tertulis"] },
      { kunci: "timPemeriksa", label: "Pemeriksa", tipe: "teks", kelompok: "Pemeriksaan", bawaan: "Tim Pemeriksa" },
      { kunci: "uraianPelanggaran", label: "Hasil pemeriksaan (kalimat setelah \"didapati bahwa\")", tipe: "teksPanjang", kelompok: "Pemeriksaan", contoh: "yang bersangkutan telah … (uraikan perbuatan sesuai hasil pemeriksaan)" },
      { kunci: "pasal", label: "Pasal yang dilanggar", tipe: "teks", kelompok: "Pemeriksaan", contoh: "Pasal 3 huruf e dan Pasal 10 ayat (1) huruf d" },
      { kunci: "fakultas", label: "Fakultas pejabat penjatuh hukuman", tipe: "pilihan", kelompok: "Penetapan", pilihan: DAFTAR_FAKULTAS, dariPegawai: (p) => fakultasLengkap(p.fakultas) },
      { kunci: "nomor", label: "Nomor SK (kosongkan bila belum ada)", tipe: "teks", kelompok: "Penetapan" },
      { kunci: "tanggalPenetapan", label: "Ditetapkan pada tanggal", tipe: "tanggal", kelompok: "Penetapan" },
      { kunci: "namaPenandatangan", label: "Nama Dekan penandatangan", tipe: "teks", kelompok: "Penetapan" },
      { kunci: "nipPenandatangan", label: "NIP Dekan", tipe: "teks", kelompok: "Penetapan" },
    ],
  },
  {
    id: "hukdis-sedang",
    nama: "Hukuman disiplin sedang",
    kelompok: "Hukuman Disiplin",
    ringkas: "Ditandatangani Rektor",
    templat: "hukdis-sedang.docx",
    isian: [
      { kunci: "nama", label: "Nama lengkap dan gelar", tipe: "teks", kelompok: "Pegawai", wajib: true, dariPegawai: (p) => p.nama },
      { kunci: "nip", label: "NIP", tipe: "teks", kelompok: "Pegawai", wajib: true, dariPegawai: (p) => p.nip },
      { kunci: "timPemeriksa", label: "Pemeriksa", tipe: "teks", kelompok: "Pemeriksaan", bawaan: "Tim Pembinaan Aparatur Universitas Negeri Malang" },
      { kunci: "tanggalBap", label: "Tanggal berita acara pemeriksaan", tipe: "tanggal", kelompok: "Pemeriksaan" },
      { kunci: "uraianPelanggaran", label: "Hasil pemeriksaan (kalimat setelah \"didapati bahwa\")", tipe: "teksPanjang", kelompok: "Pemeriksaan", contoh: "yang bersangkutan telah … (uraikan perbuatan sesuai hasil pemeriksaan)" },
      { kunci: "pasal", label: "Pasal yang dilanggar", tipe: "teks", kelompok: "Pemeriksaan", contoh: "Pasal 3 huruf e dan Pasal 10 ayat (1) huruf d" },
      { kunci: "rincianHukuman", label: "Bentuk dan lama hukuman", tipe: "teksPanjang", kelompok: "Hukuman", wajib: true, contoh: "(tulis jenis dan lama hukuman sesuai ketentuan)" },
      ...penetapan(PENANDATANGAN_REKTOR),
    ],
  },
];

export const cariJenisSk = (id: string) => JENIS_SK.find((j) => j.id === id);

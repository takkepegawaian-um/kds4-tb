// Nilai bawaan Pengaturan, disalin dari sheet "Pengaturan" di DATA_TB.xlsx.
// Dipakai untuk mengisi database pertama kali (prisma/seed.ts).
// Setelah itu admin mengubahnya lewat layar Pengaturan, bukan di file ini.
// Tes tests/pengaturan-bawaan.test.ts memastikan isi file ini sama dengan Excel.

export type ParameterBawaan = {
  kunci: string;
  nilai: string;
  tipe: "angka" | "tanggal" | "teks";
  label: string;
  keterangan?: string;
};

export const PARAMETER_BAWAAN: ParameterBawaan[] = [
  {
    kunci: "tanggalAcuan",
    nilai: "",
    tipe: "tanggal",
    label: "Tanggal acuan (kosongkan untuk memakai hari ini)",
    keterangan: "Isi tanggal untuk simulasi, misalnya tanggal rapat.",
  },
  {
    kunci: "toleransiUsulBulan",
    nilai: "6",
    tipe: "angka",
    label: "Toleransi kelengkapan usul setelah kuliah mulai (bulan)",
    keterangan: "Permen 4/2026 Pasal 10(3): maksimal 1 semester.",
  },
  {
    kunci: "tenggatPerpanjanganBulan",
    nilai: "3",
    tipe: "angka",
    label: "Tenggat usul perpanjangan sebelum masa studi berakhir (bulan)",
    keterangan: "Permen 4/2026 Pasal 16(1): paling lambat 3 bulan.",
  },
  {
    kunci: "ambangMasaTbHari",
    nilai: "90",
    tipe: "angka",
    label: "Ambang peringatan masa TB hampir berakhir (hari)",
    keterangan: "Pilihan unit, bukan dari peraturan.",
  },
  {
    kunci: "ambangPresensiHari",
    nilai: "90",
    tipe: "angka",
    label: "Ambang peringatan presensi ditandai TB hampir habis (hari)",
    keterangan: 'Pilihan unit. Dipakai untuk catatan "Presensi ditandai TB s.d.".',
  },
  {
    kunci: "batasTertahanHari",
    nilai: "30",
    tipe: "angka",
    label: "Batas lama tertahan di satu tahap (hari)",
    keterangan: "Pilihan unit. Dokumen tidak mengatur lama proses di Kementerian.",
  },
  {
    kunci: "pengurangSkorTetap",
    nilai: "40",
    tipe: "angka",
    label: "Pengurang skor untuk Tetap TriDharma",
    keterangan:
      "Supaya Tetap TriDharma tidak menutupi Bebas TriDharma di daftar prioritas. Isi 0 untuk menyamakan.",
  },
  {
    kunci: "batasUsulHariKerja",
    nilai: "14",
    tipe: "angka",
    label: "Batas usul sebelum kuliah mulai (hari kerja)",
    keterangan: "Permen 4/2026 Pasal 10(1).",
  },
  {
    kunci: "batasLaporHariKerja",
    nilai: "15",
    tipe: "angka",
    label: "Batas lapor setelah selesai (hari kerja)",
    keterangan: "Permen 4/2026 Pasal 24(1). Dipakai pada saran tindakan.",
  },
  {
    kunci: "batasKritis",
    nilai: "80",
    tipe: "angka",
    label: "Skor minimal level Kritis",
    keterangan: "Excel: 80 ke atas Kritis.",
  },
  {
    kunci: "batasWaspada",
    nilai: "55",
    tipe: "angka",
    label: "Skor minimal level Waspada",
    keterangan: "Excel: 55 sampai 79 Waspada, di bawahnya Perhatian, 0 Aman.",
  },
  {
    kunci: "tahapStatusKosong",
    nilai: "Belum dicatat",
    tipe: "teks",
    label: 'Tahap bila "Status SK" kosong atau tidak dikenal',
  },
  {
    kunci: "pihakStatusKosong",
    nilai: "Unit UM",
    tipe: "teks",
    label: 'Pihak penahan bila "Status SK" kosong atau tidak dikenal',
  },
  {
    kunci: "tanggalRekapResmi",
    nilai: "2026-10-01",
    tipe: "tanggal",
    label: "Tanggal rekap resmi TB dan TB Biaya Mandiri per fakultas",
  },
];

export const STATUS_SK_BAWAAN = [
  { statusSk: "Usul TB", tahap: "Usul diajukan, menunggu SK", pihakPenahan: "Biro SDM / Kementerian", skTerbit: "Belum" },
  { statusSk: "Usul TBBM", tahap: "Usul diajukan, menunggu SK", pihakPenahan: "Biro SDM / Kementerian", skTerbit: "Belum" },
  { statusSk: "Usul Pengaktifan", tahap: "Usul pengaktifan kembali", pihakPenahan: "Biro SDM / Kementerian", skTerbit: "Ya" },
  { statusSk: "TB Aktif", tahap: "TB berjalan", pihakPenahan: "Pegawai", skTerbit: "Ya" },
  { statusSk: "IB Aktif", tahap: "TB berjalan", pihakPenahan: "Pegawai", skTerbit: "Ya" },
  { statusSk: "TBBM Aktif", tahap: "TB berjalan", pihakPenahan: "Pegawai", skTerbit: "Ya" },
  { statusSk: "TB Expired", tahap: "Masa TB berakhir", pihakPenahan: "Unit UM", skTerbit: "Ya" },
];

export const ATURAN_HAMBATAN_BAWAAN = [
  { kode: 0, nama: "Tidak ada hambatan terdeteksi", skorDasar: 0, saran: "-" },
  {
    kode: 1,
    nama: "Presensi masih bebas padahal masa TB sudah berakhir",
    skorDasar: 90,
    saran: "Cek dasar SK. Bila tidak ada SK yang berlaku, koreksi penandaan presensi dan proses pengaktifan kembali.",
  },
  {
    kode: 2,
    nama: "Presensi NON AKTIF padahal SK TB masih berlaku",
    skorDasar: 85,
    saran: "Tandai ulang presensi sebagai TB supaya tunjangan dan kinerja tidak terpotong.",
  },
  {
    kode: 3,
    nama: "Kuliah berjalan lebih dari 1 semester tanpa SK",
    skorDasar: 80,
    saran: "Minta persetujuan PPK atas keterlambatan (Format G.12) dan percepat usul.",
  },
  {
    kode: 4,
    nama: "Masa TB berakhir, belum ada perpanjangan atau pengaktifan",
    skorDasar: 75,
    saran:
      "Usulkan perpanjangan bila memenuhi syarat, atau proses laporan dan pengaktifan kembali (lapor maksimal 15 hari kerja).",
  },
  {
    kode: 5,
    nama: "Presensi ditandai TB lebih pendek dari masa TB",
    skorDasar: 70,
    saran: "Tandai presensi periode berikutnya sebelum penandaan habis.",
  },
  {
    kode: 6,
    nama: "Usul melewati batas 14 hari kerja sebelum kuliah",
    skorDasar: 65,
    saran: "Kirim usul segera. Dokumen masih boleh menyusul maksimal 1 semester.",
  },
  {
    kode: 7,
    nama: "Kuliah berjalan, SK belum terbit (dalam toleransi 1 semester)",
    skorDasar: 60,
    saran: "Kejar penerbitan SK dan lengkapi dokumen sebelum toleransi 1 semester habis.",
  },
  {
    kode: 8,
    nama: "Tenggat usul perpanjangan (3 bulan sebelum berakhir) sudah lewat",
    skorDasar: 55,
    saran: "Usul perpanjangan hanya bisa dengan persetujuan PPK (Format G.12).",
  },
  {
    kode: 9,
    nama: "Tertahan di tahap yang sama melebihi batas hari",
    skorDasar: 50,
    saran: "Tanyakan status ke pihak penahan dan catat kendalanya.",
  },
  {
    kode: 10,
    nama: "Masa TB segera berakhir atau menunggu pengaktifan",
    skorDasar: 45,
    saran:
      "Siapkan perpanjangan atau pengaktifan kembali. Ingatkan pegawai melapor maksimal 15 hari kerja setelah selesai.",
  },
  {
    kode: 11,
    nama: "Status SK belum dicatat",
    skorDasar: 35,
    saran: 'Lengkapi kolom "Status SK" di Data TB.',
  },
  {
    kode: 12,
    nama: "Tanggal TMT atau masa studi kosong atau tidak terbaca",
    skorDasar: 30,
    saran: "Lengkapi tanggal. Lihat kolom Cek data dan Catatan lain.",
  },
];

// Kategori daftar pilihan. Nilai "sistem" dipakai langsung oleh aturan hambatan.
export const KATEGORI_PILIHAN = {
  FAKULTAS: "Fakultas",
  STATUS_AKHIR: "Status akhir",
  JENIS_PELAKSANAAN: "Jenis pelaksanaan",
  LOKASI: "Lokasi",
  KONDISI_KULIAH: "Kondisi kuliah",
  PRESENSI: "Presensi di sistem",
  JENJANG: "Jenjang",
} as const;

export type KategoriPilihan = keyof typeof KATEGORI_PILIHAN;

export const PILIHAN_BAWAAN: { kategori: KategoriPilihan; nilai: string[]; sistem?: string[] }[] = [
  {
    kategori: "FAKULTAS",
    nilai: ["FIP", "FS", "FMIPA", "FEB", "FT", "FIK", "FIS", "FPsi", "FV", "FK"],
  },
  {
    kategori: "STATUS_AKHIR",
    nilai: ["Sedang TB", "Sudah PK", "Expired", "Lulus", "Rencana studi"],
    sistem: ["Sedang TB"],
  },
  { kategori: "JENIS_PELAKSANAAN", nilai: ["Bebas", "Tetap"], sistem: ["Bebas", "Tetap"] },
  { kategori: "LOKASI", nilai: ["DN", "LN"] },
  { kategori: "KONDISI_KULIAH", nilai: ["Belum kuliah", "Sedang kuliah", "Sudah kuliah"] },
  {
    kategori: "PRESENSI",
    nilai: ["AKTIF", "NON AKTIF", "MISTERY??"],
    sistem: ["AKTIF", "NON AKTIF", "MISTERY??"],
  },
  // Jenjang tidak punya validasi di Excel; daftar ini diambil dari isi data.
  {
    kategori: "JENJANG",
    nilai: ["S2", "S3", "Profesi", "Spesialis", "Subspesialis", "PPDS", "PPDS SP-1"],
  },
];

// Rekap manual dari sheet Dashboard (bukan data pribadi).
export const REKAP_RESMI_FAKULTAS_BAWAAN = [
  { fakultas: "FIP", tugasBelajar: 10, biayaMandiri: 35 },
  { fakultas: "FS", tugasBelajar: 28, biayaMandiri: 9 },
  { fakultas: "FMIPA", tugasBelajar: 40, biayaMandiri: 8 },
  { fakultas: "FEB", tugasBelajar: 21, biayaMandiri: 23 },
  { fakultas: "FT", tugasBelajar: 27, biayaMandiri: 21 },
  { fakultas: "FIK", tugasBelajar: 13, biayaMandiri: 2 },
  { fakultas: "FIS", tugasBelajar: 23, biayaMandiri: 21 },
  { fakultas: "FPsi", tugasBelajar: 7, biayaMandiri: 9 },
  { fakultas: "FV", tugasBelajar: 10, biayaMandiri: 7 },
  { fakultas: "FK", tugasBelajar: 9, biayaMandiri: 5 },
];

export const REKAP_PENERBITAN_SK_BAWAAN: { uraian: string; jumlah: number; kelompok?: "SUDAH_TERBIT" | "BELUM_TERBIT" }[] = [
  { uraian: "Jumlah berkas yang sudah dikirim", jumlah: 71 },
  { uraian: "Sudah terbit SK saat diundang tgl 12 Oktober 2023", jumlah: 14 },
  { uraian: "Sudah terbit SK setelahnya", jumlah: 14 },
  { uraian: "Konsep SK yang belum terbit", jumlah: 12 },
  { uraian: "Berkas dikembalikan", jumlah: 31 },
  { uraian: "Konsep SK yang sudah terbit saat diundang 26 September 2024", jumlah: 11, kelompok: "SUDAH_TERBIT" },
  { uraian: "Sudah terbit SK dari yang usia melebihi juknis", jumlah: 2, kelompok: "SUDAH_TERBIT" },
  { uraian: "Sudah terbit SK setelahnya 5 Oktober 2024", jumlah: 2, kelompok: "SUDAH_TERBIT" },
  { uraian: "Sudah terbit SK dari sisa Konsep SK tgl 18 Oktober 2024", jumlah: 2, kelompok: "SUDAH_TERBIT" },
  { uraian: "Belum terbit SK karena Setneg < 3 bulan (proses perbaikan Setneg)", jumlah: 2, kelompok: "BELUM_TERBIT" },
  { uraian: "Berkas diusulkan melalui aplikasi, belum ada progress", jumlah: 77, kelompok: "BELUM_TERBIT" },
];

// Daftar tabel yang dicadangkan dan dipulihkan, dalam urutan yang aman untuk dipulihkan.
import { prisma } from "../src/lib/db";

type Model = {
  nama: string;
  /** Kolom bertipe tanggal/waktu (dikembalikan dari teks ke Date saat pemulihan). */
  tanggal: string[];
  /** Tabel Pengaturan: isi bawaan di database tujuan diganti isi cadangan. */
  pengaturan?: boolean;
  /** Tabel dengan nomor urut otomatis (penghitungnya disesuaikan setelah pemulihan). */
  urutOtomatis?: boolean;
  ambil: () => Promise<unknown[]>;
  hapusSemua?: () => Promise<unknown>;
  masukkan: (data: never[]) => Promise<unknown>;
  hitung: () => Promise<number>;
};

export const MODEL_CADANGAN: Model[] = [
  {
    nama: "Pengguna",
    tanggal: ["terkunciSampai", "loginTerakhir", "dibuatPada", "diubahPada"],
    urutOtomatis: true,
    ambil: () => prisma.pengguna.findMany({ orderBy: { id: "asc" } }),
    masukkan: (data) => prisma.pengguna.createMany({ data }),
    hitung: () => prisma.pengguna.count(),
  },
  {
    nama: "Parameter",
    tanggal: [],
    pengaturan: true,
    ambil: () => prisma.parameter.findMany(),
    hapusSemua: () => prisma.parameter.deleteMany(),
    masukkan: (data) => prisma.parameter.createMany({ data }),
    hitung: () => prisma.parameter.count(),
  },
  {
    nama: "HariLibur",
    tanggal: ["tanggal"],
    pengaturan: true,
    ambil: () => prisma.hariLibur.findMany(),
    hapusSemua: () => prisma.hariLibur.deleteMany(),
    masukkan: (data) => prisma.hariLibur.createMany({ data }),
    hitung: () => prisma.hariLibur.count(),
  },
  {
    nama: "PilihanNilai",
    tanggal: [],
    pengaturan: true,
    urutOtomatis: true,
    ambil: () => prisma.pilihanNilai.findMany({ orderBy: { id: "asc" } }),
    hapusSemua: () => prisma.pilihanNilai.deleteMany(),
    masukkan: (data) => prisma.pilihanNilai.createMany({ data }),
    hitung: () => prisma.pilihanNilai.count(),
  },
  {
    nama: "PemetaanStatusSk",
    tanggal: [],
    pengaturan: true,
    ambil: () => prisma.pemetaanStatusSk.findMany(),
    hapusSemua: () => prisma.pemetaanStatusSk.deleteMany(),
    masukkan: (data) => prisma.pemetaanStatusSk.createMany({ data }),
    hitung: () => prisma.pemetaanStatusSk.count(),
  },
  {
    nama: "AturanHambatan",
    tanggal: [],
    pengaturan: true,
    ambil: () => prisma.aturanHambatan.findMany(),
    hapusSemua: () => prisma.aturanHambatan.deleteMany(),
    masukkan: (data) => prisma.aturanHambatan.createMany({ data }),
    hitung: () => prisma.aturanHambatan.count(),
  },
  {
    nama: "RekapResmiFakultas",
    tanggal: [],
    pengaturan: true,
    ambil: () => prisma.rekapResmiFakultas.findMany(),
    hapusSemua: () => prisma.rekapResmiFakultas.deleteMany(),
    masukkan: (data) => prisma.rekapResmiFakultas.createMany({ data }),
    hitung: () => prisma.rekapResmiFakultas.count(),
  },
  {
    nama: "RekapPenerbitanSk",
    tanggal: [],
    pengaturan: true,
    urutOtomatis: true,
    ambil: () => prisma.rekapPenerbitanSk.findMany({ orderBy: { id: "asc" } }),
    hapusSemua: () => prisma.rekapPenerbitanSk.deleteMany(),
    masukkan: (data) => prisma.rekapPenerbitanSk.createMany({ data }),
    hitung: () => prisma.rekapPenerbitanSk.count(),
  },
  {
    nama: "PegawaiTB",
    tanggal: ["tmtTb", "masaStudiSd", "perpanjanganSd", "presensiTbSd", "tanggalMasukTahap", "dibuatPada", "diubahPada", "dihapusPada"],
    urutOtomatis: true,
    ambil: () => prisma.pegawaiTB.findMany({ orderBy: { id: "asc" } }),
    masukkan: (data) => prisma.pegawaiTB.createMany({ data }),
    hitung: () => prisma.pegawaiTB.count(),
  },
  {
    nama: "RiwayatImpor",
    tanggal: ["waktu"],
    urutOtomatis: true,
    ambil: () => prisma.riwayatImpor.findMany({ orderBy: { id: "asc" } }),
    masukkan: (data) => prisma.riwayatImpor.createMany({ data }),
    hitung: () => prisma.riwayatImpor.count(),
  },
  {
    nama: "LogPerubahan",
    tanggal: ["waktu"],
    urutOtomatis: true,
    ambil: () => prisma.logPerubahan.findMany({ orderBy: { id: "asc" } }),
    masukkan: (data) => prisma.logPerubahan.createMany({ data }),
    hitung: () => prisma.logPerubahan.count(),
  },
  {
    nama: "LogAkses",
    tanggal: ["waktu"],
    urutOtomatis: true,
    ambil: () => prisma.logAkses.findMany({ orderBy: { id: "asc" } }),
    masukkan: (data) => prisma.logAkses.createMany({ data }),
    hitung: () => prisma.logAkses.count(),
  },
];

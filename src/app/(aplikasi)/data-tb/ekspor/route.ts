// Unduh Data TB sebagai Excel (kolom input + kolom hasil hitung).
// Mengikuti saringan dan urutan yang sedang dipakai di halaman Data TB.
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { labelAbsensi } from "@/lib/aturan/label-absensi";
import { acuanDariUrl } from "@/lib/data/acuan";
import { pilihBaris, uraikanSaringan } from "@/lib/data/daftar";
import { prisma } from "@/lib/db";
import { dbKeNilai, muatSemuaDihitung } from "@/lib/data/pegawai";
import { KOLOM_INPUT } from "@/lib/excel/data-tb";
import { buatBerkasExcel, responsExcel, type KolomEkspor } from "@/lib/excel/ekspor";
import { emailPengguna } from "@/lib/sesi";
import { formatTanggal, formatWaktu, hariIniJakarta } from "@/lib/tanggal";

// Impor/ekspor ratusan baris bisa memakan beberapa detik di server (batas Vercel).
export const maxDuration = 60;

const LEBAR: Partial<Record<string, number>> = { no: 6, nama: 36, nip: 21, catatan: 40, linkSk: 30, tempatStudi: 28, noSk: 24 };

export async function GET(request: NextRequest) {
  const email = await emailPengguna();
  const param = Object.fromEntries(request.nextUrl.searchParams);
  const { baris: semua, tanggalAcuan, pengaturan } = await muatSemuaDihitung(acuanDariUrl(param));
  const { saringan, hasil: baris } = pilihBaris(semua, param);
  const uraian = uraikanSaringan(saringan, pengaturan);
  type B = (typeof baris)[number] & { nilai: ReturnType<typeof dbKeNilai> };
  const data: B[] = baris.map((b) => ({ ...b, nilai: dbKeNilai(b.pegawai) }));

  const kolom: KolomEkspor<B>[] = [
    ...KOLOM_INPUT.map((k) => ({
      judul: k.judul,
      lebar: LEBAR[k.kolom] ?? (k.tipe === "tanggal" ? 13 : 15),
      tipe: k.tipe,
      ambil: (b: B) => (k.kolom === "presensi" ? labelAbsensi(b.nilai.presensi as string | null) || null : b.nilai[k.kolom]),
    })),
    { judul: "Akhir efektif", lebar: 13, tipe: "tanggal", hitungan: true, ambil: (b) => b.hasil.akhirEfektif },
    { judul: "Sisa hari", lebar: 9, hitungan: true, ambil: (b) => b.hasil.sisaHari },
    { judul: "Tahap", lebar: 26, hitungan: true, ambil: (b) => b.hasil.tahap },
    { judul: "SK terbit?", lebar: 9, hitungan: true, ambil: (b) => b.hasil.skTerbit },
    { judul: "Hari kuliah tanpa SK", lebar: 11, hitungan: true, ambil: (b) => b.hasil.hariKuliahTanpaSk },
    { judul: "Hari tertahan", lebar: 10, hitungan: true, ambil: (b) => b.hasil.hariTertahan },
    { judul: "Pihak penahan", lebar: 22, hitungan: true, ambil: (b) => b.hasil.pihakPenahan },
    { judul: "Kode", lebar: 7, hitungan: true, ambil: (b) => b.hasil.kode },
    { judul: "Hambatan utama", lebar: 46, hitungan: true, ambil: (b) => b.hasil.hambatan },
    { judul: "Level", lebar: 11, hitungan: true, level: true, ambil: (b) => b.hasil.level },
    { judul: "Skor", lebar: 7, hitungan: true, ambil: (b) => b.hasil.skor },
    { judul: "Peringkat", lebar: 9, hitungan: true, ambil: (b) => b.hasil.peringkat },
    { judul: "Cek data", lebar: 28, hitungan: true, ambil: (b) => b.hasil.cekData },
    { judul: "Saran tindakan", lebar: 50, hitungan: true, ambil: (b) => b.hasil.saran },
  ];

  const isi = await buatBerkasExcel({
    namaSheet: "Data TB",
    judul: "Data Tugas Belajar — KDS4",
    keterangan: `Diekspor ${formatWaktu(new Date())} oleh ${email}. Tanggal acuan ${formatTanggal(tanggalAcuan)}. ${uraian.length ? `Saringan: ${uraian.join("; ")}. ` : ""}Kolom berjudul emas adalah hasil hitung aplikasi.`,
    kolom,
    baris: data,
    bekukanKolom: 2,
  });

  const h = await headers();
  await prisma.logAkses.create({
    data: {
      email,
      peristiwa: "EKSPOR",
      keterangan: `Data TB (${data.length} baris)${uraian.length ? `; ${uraian.join("; ")}` : ""}`,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    },
  });

  return responsExcel(isi, `KDS4_Data_TB_${hariIniJakarta()}.xlsx`);
}

// Unduh Daftar Perhatian sebagai Excel (?format=xlsx) atau PDF (?format=pdf).
// Mengikuti saringan, urutan, dan tanggal acuan yang sedang dipakai di halaman.
import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { LEVEL, type Level } from "@/lib/aturan/pengaturan";
import { prisma } from "@/lib/db";
import { acuanDariUrl } from "@/lib/data/acuan";
import { uraikanSaringan } from "@/lib/data/daftar";
import { muatSemuaDihitung } from "@/lib/data/pegawai";
import { KOLOM_PERHATIAN, pilihPerhatian, teksKolom } from "@/lib/data/perhatian";
import { buatBerkasExcel, responsExcel } from "@/lib/excel/ekspor";
import { buatPdfTabel, responsPdf } from "@/lib/pdf/tabel-pdf";
import { emailPengguna } from "@/lib/sesi";
import { formatTanggal, formatWaktu, hariIniJakarta } from "@/lib/tanggal";

// Impor/ekspor ratusan baris bisa memakan beberapa detik di server (batas Vercel).
export const maxDuration = 60;

const LEBAR_EXCEL: Record<string, number> = {
  Peringkat: 9, Nama: 34, NIP: 21, Fakultas: 9, Jenis: 8, Level: 11, "Hambatan utama": 44, "Pihak penahan": 22,
  "Akhir efektif": 13, "Sisa hari": 9, "Hari tertahan": 9, Catatan: 40, "Saran tindakan": 55,
};
// Lebar kolom PDF (poin). A4 mendatar menyisakan ±794 poin; sisa ruang untuk Saran tindakan.
const LEBAR_PDF: Record<string, number | "*"> = {
  Peringkat: 18, Nama: 92, NIP: 84, Fakultas: 30, Jenis: 26, Level: 36, "Hambatan utama": 100, "Pihak penahan": 56,
  "Akhir efektif": 42, "Sisa hari": 28, "Hari tertahan": 30, Catatan: 86, "Saran tindakan": "*",
};
const JUDUL_PDF: Record<string, string> = { Peringkat: "#", Fakultas: "Fak.", "Hari tertahan": "Ter-\ntahan", "Sisa hari": "Sisa\nhari" };
const WARNA: Record<Level, { latar: string; huruf: string }> = {
  Kritis: { latar: "#ffc7ce", huruf: "#9c0006" },
  Waspada: { latar: "#ffeb9c", huruf: "#7f5a00" },
  Perhatian: { latar: "#ddebf7", huruf: "#1f4e79" },
  Aman: { latar: "#c6efce", huruf: "#006100" },
};

export async function GET(request: NextRequest) {
  const email = await emailPengguna();
  const param = Object.fromEntries(request.nextUrl.searchParams);
  const pdf = param.format === "pdf";
  const { baris: semua, tanggalAcuan, pengaturan } = await muatSemuaDihitung(acuanDariUrl(param));
  const { saringan, hasil } = pilihPerhatian(semua, param);
  const uraian = uraikanSaringan({ ...saringan, berhambatan: undefined }, pengaturan);
  const perLevel = LEVEL.filter((l) => l !== "Aman")
    .map((l) => `${l} ${hasil.filter((b) => b.hasil.level === l).length}`)
    .join(" · ");
  const keterangan = [
    `Per tanggal acuan ${formatTanggal(tanggalAcuan)}. ${hasil.length} orang berhambatan (${perLevel}).`,
    ...(uraian.length ? [`Saringan: ${uraian.join("; ")}.`] : []),
    `Dicetak ${formatWaktu(new Date())} oleh ${email}.`,
  ];

  let respons: Response;
  if (pdf) {
    const isi = await buatPdfTabel({
      judul: "Daftar Perhatian — Tugas Belajar",
      subjudul: keterangan,
      kolom: KOLOM_PERHATIAN.map((k) => ({
        judul: JUDUL_PDF[k.judul] ?? k.judul,
        lebar: LEBAR_PDF[k.judul] ?? "auto",
        rata: k.angka ? ("right" as const) : undefined,
        ambil: (b: (typeof hasil)[number]) => teksKolom(k, b),
        warna: k.judul === "Level" ? (v: string) => WARNA[v as Level] : undefined,
      })),
      baris: hasil,
    });
    respons = responsPdf(isi, `KDS4_Daftar_Perhatian_${tanggalAcuan}.pdf`);
  } else {
    const isi = await buatBerkasExcel({
      namaSheet: "Daftar Perhatian",
      judul: "Daftar Perhatian — Tugas Belajar",
      keterangan: keterangan.join(" "),
      kolom: KOLOM_PERHATIAN.map((k) => ({
        judul: k.judul,
        lebar: LEBAR_EXCEL[k.judul] ?? 14,
        tipe: k.tanggal ? ("tanggal" as const) : k.angka ? ("angka" as const) : ("teks" as const),
        level: k.judul === "Level",
        ambil: (b: (typeof hasil)[number]) => k.ambil(b),
      })),
      baris: hasil,
      bekukanKolom: 2,
    });
    respons = responsExcel(isi, `KDS4_Daftar_Perhatian_${hariIniJakarta()}.xlsx`);
  }

  const h = await headers();
  await prisma.logAkses.create({
    data: {
      email,
      peristiwa: "EKSPOR",
      keterangan: `Daftar Perhatian ${pdf ? "PDF" : "Excel"} (${hasil.length} baris)${uraian.length ? `; ${uraian.join("; ")}` : ""}`,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    },
  });
  return respons;
}

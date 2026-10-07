// Unduh Log Aktivitas sebagai Excel (mengikuti tab dan saringan yang sedang dipakai).
import type { NextRequest } from "next/server";
import { catatAkses } from "@/lib/auth/sesi";
import { bacaFilterLog, muatLogAkses, muatLogPerubahan } from "@/lib/data/log";
import { LABEL_AKSI_PERUBAHAN, LABEL_ENTITAS, LABEL_PERISTIWA, labelKolom, ringkasPerangkat } from "@/lib/data/log-label";
import { buatBerkasExcel, responsExcel } from "@/lib/excel/ekspor";
import { emailPengguna } from "@/lib/sesi";
import { formatWaktu, hariIniJakarta } from "@/lib/tanggal";

// Impor/ekspor ratusan baris bisa memakan beberapa detik di server (batas Vercel).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const email = await emailPengguna();
  const f = bacaFilterLog(Object.fromEntries(request.nextUrl.searchParams));
  const saringan = [f.q && `cari "${f.q}"`, f.aksi && `tindakan ${f.aksi}`, f.email && `pengguna ${f.email}`, f.dari && `dari ${f.dari}`, f.sampai && `sampai ${f.sampai}`]
    .filter(Boolean)
    .join("; ");
  const keterangan = `Diekspor ${formatWaktu(new Date())} oleh ${email}.${saringan ? ` Saringan: ${saringan}.` : ""} Waktu dalam WIB.`;

  let isi: Buffer;
  let jumlah: number;
  if (f.tab === "akses") {
    const { baris } = await muatLogAkses(f, true);
    jumlah = baris.length;
    isi = await buatBerkasExcel({
      namaSheet: "Log akses",
      judul: "Log akses — KDS4",
      keterangan,
      baris,
      kolom: [
        { judul: "Waktu (WIB)", lebar: 20, ambil: (b) => formatWaktu(b.waktu) },
        { judul: "Email", lebar: 26, ambil: (b) => b.email },
        { judul: "Peristiwa", lebar: 26, ambil: (b) => LABEL_PERISTIWA[b.peristiwa] ?? b.peristiwa },
        { judul: "Keterangan", lebar: 50, ambil: (b) => b.keterangan },
        { judul: "IP", lebar: 16, ambil: (b) => b.ip },
        { judul: "Perangkat", lebar: 20, ambil: (b) => ringkasPerangkat(b.userAgent) },
      ],
    });
  } else {
    const { baris } = await muatLogPerubahan(f, true);
    jumlah = baris.length;
    isi = await buatBerkasExcel({
      namaSheet: "Riwayat perubahan",
      judul: "Riwayat perubahan data — KDS4",
      keterangan,
      baris,
      kolom: [
        { judul: "Waktu (WIB)", lebar: 20, ambil: (b) => formatWaktu(b.waktu) },
        { judul: "Oleh", lebar: 24, ambil: (b) => b.email },
        { judul: "Tindakan", lebar: 14, ambil: (b) => LABEL_AKSI_PERUBAHAN[b.aksi] ?? b.aksi },
        { judul: "Data", lebar: 22, ambil: (b) => LABEL_ENTITAS[b.entitas] ?? b.entitas },
        { judul: "Nama", lebar: 34, ambil: (b) => b.pegawai?.nama ?? null },
        { judul: "NIP", lebar: 21, ambil: (b) => b.pegawai?.nip ?? null },
        { judul: "Kolom", lebar: 24, ambil: (b) => labelKolom(b.kolom) || null },
        { judul: "Nilai lama", lebar: 30, ambil: (b) => b.nilaiLama },
        { judul: "Nilai baru", lebar: 30, ambil: (b) => b.nilaiBaru },
      ],
    });
  }

  await catatAkses(email, "EKSPOR", `Log ${f.tab === "akses" ? "akses" : "perubahan"} (${jumlah} baris)${saringan ? `; ${saringan}` : ""}`);
  return responsExcel(isi, `KDS4_Log_${f.tab === "akses" ? "Akses" : "Perubahan"}_${hariIniJakarta()}.xlsx`);
}

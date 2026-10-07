// PROSES IMPOR: membaca berkas Excel dan menyimpan rencana impor ke database.
// Dipakai oleh halaman Impor (aksi server) dan perintah terminal (scripts/impor.ts),
// sehingga keduanya selalu berperilaku sama.

import ExcelJS from "exceljs";
import { prisma } from "@/lib/db";
import { dbKeNilai, nilaiKeDb } from "@/lib/data/peta";
import { bacaSheetDataTb, cariBarisJudul, type NamaKolomInput } from "@/lib/excel/data-tb";
import { susunRencana, type DaftarPilihanImpor, type PegawaiTersimpan, type RencanaImpor } from "./rencana";

export const BATAS_UKURAN = 4 * 1024 * 1024;

export type BacaanBerkas = {
  namaBerkas: string;
  namaSheet: string;
  sheet: ReturnType<typeof bacaSheetDataTb>;
  rencana: RencanaImpor;
};

export type HasilSimpan = { ditambah: number; diubah: number; dilewati: number; gagal: number; imporId: number };

/** Membaca isi berkas .xlsx dan menyusun rencana impor terhadap data di database. */
export async function bacaBerkasImpor(isi: ArrayBuffer, namaBerkas: string): Promise<BacaanBerkas> {
  if (!/\.xlsx$/i.test(namaBerkas)) throw new Error("Berkas harus berformat .xlsx (Excel).");
  if (isi.byteLength > BATAS_UKURAN) throw new Error("Berkas lebih dari 4 MB. Hapus sheet yang tidak perlu lalu coba lagi.");

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(isi);
  } catch {
    throw new Error("Berkas tidak bisa dibuka. Pastikan berkas Excel tidak rusak dan tidak dilindungi kata sandi.");
  }

  // Pakai sheet "Data TB" bila ada; bila tidak, sheet pertama yang punya kolom Nama dan NIP.
  const ws =
    wb.worksheets.find((w) => w.name.trim().toLowerCase() === "data tb") ??
    wb.worksheets.find((w) => cariBarisJudul(w) !== null);
  if (!ws) throw new Error('Tidak ada sheet berisi kolom "Nama" dan "NIP". Pastikan berkas adalah DATA_TB.xlsx.');

  const sheet = bacaSheetDataTb(ws);
  const wajibHilang = sheet.kolomHilang.filter((k) => k === "Nama" || k === "NIP" || k === "Status akhir");
  if (wajibHilang.length) throw new Error(`Kolom wajib tidak ditemukan: ${wajibHilang.join(", ")}.`);

  const [tersimpan, daftar] = await Promise.all([muatTersimpan(), daftarPilihan()]);
  return { namaBerkas, namaSheet: ws.name, sheet, rencana: susunRencana(sheet.data, tersimpan, daftar) };
}

async function muatTersimpan(): Promise<PegawaiTersimpan[]> {
  const semua = await prisma.pegawaiTB.findMany({ where: { dihapusPada: null }, orderBy: { urutan: "asc" } });
  return semua.map((p) => ({ id: p.id, urutan: p.urutan, nilai: dbKeNilai(p) }));
}

async function daftarPilihan(): Promise<DaftarPilihanImpor> {
  const [pilihan, statusSk] = await Promise.all([
    prisma.pilihanNilai.findMany({ where: { aktif: true }, orderBy: { urutan: "asc" } }),
    prisma.pemetaanStatusSk.findMany(),
  ]);
  const ambil = (k: string) => pilihan.filter((p) => p.kategori === k).map((p) => p.nilai);
  return {
    statusAkhir: ambil("STATUS_AKHIR"),
    fakultas: ambil("FAKULTAS"),
    jenisPelaksanaan: ambil("JENIS_PELAKSANAAN"),
    lokasi: ambil("LOKASI"),
    kondisiKuliah: ambil("KONDISI_KULIAH"),
    presensi: ambil("PRESENSI"),
    jenjang: ambil("JENJANG"),
    statusSk: statusSk.map((s) => s.statusSk),
  };
}

const teks = (v: unknown) => (v === null || v === undefined ? null : String(v));

/**
 * Menyimpan baris yang dipilih (nomor baris Excel) ke database dalam satu transaksi,
 * lengkap dengan log perubahan dan riwayat impor.
 */
export async function simpanRencanaImpor(
  bacaan: BacaanBerkas,
  dipilih: ReadonlySet<number> | "semua",
  email: string,
): Promise<HasilSimpan> {
  const { namaBerkas, sheet, rencana } = bacaan;
  const pilih = (baris: number) => dipilih === "semua" || dipilih.has(baris);
  const baru = rencana.baru.filter((b) => pilih(b.baris));
  const ubah = rencana.ubah.filter((u) => pilih(u.baris));
  const dilewati = rencana.baru.length + rencana.ubah.length - baru.length - ubah.length;

  return prisma.$transaction(
    async (tx) => {
      const riwayat = await tx.riwayatImpor.create({
        data: {
          email,
          namaBerkas,
          jumlahBaris: sheet.data.length,
          ditambah: baru.length,
          diubah: ubah.length,
          dilewati,
          gagal: rencana.gagal.length,
          laporan: {
            gagal: rencana.gagal.map(({ baris, nama, nip, alasan }) => ({ baris, nama, nip, alasan })),
            peringatan: [...rencana.baru, ...rencana.ubah, ...rencana.sama]
              .filter((b) => b.peringatan.length)
              .map(({ baris, nama, nip, peringatan }) => ({ baris, nama, nip, peringatan })),
          },
        },
      });

      // Baris baru: urutan melanjutkan data yang ada, mengikuti urutan baris di berkas.
      // Pada impor pertama (database kosong) urutan = nomor baris Excel, sehingga
      // peringkat untuk skor yang sama dipecah persis seperti di Excel.
      const { _max } = await tx.pegawaiTB.aggregate({ _max: { urutan: true } });
      const dasar = _max.urutan ?? 0;
      const dibuat = baru.length
        ? await tx.pegawaiTB.createManyAndReturn({
            data: baru.map((b) => ({
              ...nilaiKeDb(b.nilai),
              nama: b.nilai.nama as string,
              nip: b.nilai.nip as string,
              statusAkhir: b.nilai.statusAkhir as string,
              urutan: dasar + b.baris,
              dibuatOleh: email,
              diubahOleh: email,
            })),
            select: { id: true, urutan: true },
          })
        : [];
      const idPerUrutan = new Map(dibuat.map((d) => [d.urutan, d.id]));

      type Log = { email: string; entitas: string; entitasId: string; aksi: string; kolom: string | null; nilaiLama: string | null; nilaiBaru: string | null; imporId: number };
      const log: Log[] = baru.map((b) => ({
        email,
        entitas: "PegawaiTB",
        entitasId: String(idPerUrutan.get(dasar + b.baris)),
        aksi: "IMPOR",
        kolom: null,
        nilaiLama: null,
        nilaiBaru: `Ditambahkan dari ${namaBerkas}, baris ${b.baris}`,
        imporId: riwayat.id,
      }));

      for (const u of ubah) {
        const semua = nilaiKeDb(u.nilai) as Record<string, unknown>;
        const data = Object.fromEntries(u.perubahan.map((p) => [p.kolom, semua[p.kolom]]));
        await tx.pegawaiTB.update({ where: { id: u.id }, data: { ...data, diubahOleh: email } });
        for (const p of u.perubahan) {
          log.push({
            email,
            entitas: "PegawaiTB",
            entitasId: String(u.id),
            aksi: "IMPOR",
            kolom: p.kolom satisfies NamaKolomInput,
            nilaiLama: teks(p.lama),
            nilaiBaru: teks(p.baru),
            imporId: riwayat.id,
          });
        }
      }
      if (log.length) await tx.logPerubahan.createMany({ data: log });

      return { ditambah: baru.length, diubah: ubah.length, dilewati, gagal: rencana.gagal.length, imporId: riwayat.id };
    },
    { timeout: 60_000 },
  );
}

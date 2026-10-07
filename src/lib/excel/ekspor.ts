// Membuat berkas Excel yang rapi dari tabel data.
// Judul kolom input sama dengan DATA_TB.xlsx sehingga hasil ekspor bisa diimpor kembali.

import ExcelJS from "exceljs";
import type { Level } from "@/lib/aturan/pengaturan";
import { keDb } from "@/lib/tanggal";

export type KolomEkspor<T> = {
  judul: string;
  lebar: number;
  ambil: (baris: T) => string | number | null;
  tipe?: "teks" | "tanggal" | "angka";
  /** Kolom hasil hitung diberi warna judul berbeda. */
  hitungan?: boolean;
  /** Kolom berisi Level diberi warna sesuai level. */
  level?: boolean;
};

const WARNA_LEVEL: Record<Level, { latar: string; huruf: string }> = {
  Kritis: { latar: "FFFFC7CE", huruf: "FF9C0006" },
  Waspada: { latar: "FFFFEB9C", huruf: "FF7F5A00" },
  Perhatian: { latar: "FFDDEBF7", huruf: "FF1F4E79" },
  Aman: { latar: "FFC6EFCE", huruf: "FF006100" },
};

export async function buatBerkasExcel<T>(opsi: {
  namaSheet: string;
  judul: string;
  keterangan: string;
  kolom: KolomEkspor<T>[];
  baris: T[];
  /** Jumlah kolom kiri yang dibekukan (mis. No dan Nama). */
  bekukanKolom?: number;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KDS4 — Monitor TB";
  wb.created = new Date();
  const ws = wb.addWorksheet(opsi.namaSheet, {
    views: [{ state: "frozen", xSplit: opsi.bekukanKolom ?? 0, ySplit: 3 }],
  });

  ws.getCell("A1").value = opsi.judul;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: "FF183630" } };
  ws.getCell("A2").value = opsi.keterangan;
  ws.getCell("A2").font = { italic: true, color: { argb: "FF666666" } };

  const barisJudul = ws.getRow(3);
  opsi.kolom.forEach((k, i) => {
    const c = barisJudul.getCell(i + 1);
    c.value = k.judul;
    c.font = { bold: true, color: { argb: k.hitungan ? "FF183630" : "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: k.hitungan ? "FFE5C690" : "FF183630" } };
    c.alignment = { vertical: "middle", wrapText: true };
    ws.getColumn(i + 1).width = k.lebar;
  });
  barisJudul.height = 32;

  opsi.baris.forEach((b, r) => {
    const row = ws.getRow(4 + r);
    opsi.kolom.forEach((k, i) => {
      const v = k.ambil(b);
      const c = row.getCell(i + 1);
      if (v === null || v === "") return;
      if (k.tipe === "tanggal") {
        c.value = keDb(String(v));
        c.numFmt = "dd/mm/yyyy";
      } else {
        c.value = v;
      }
      if (k.level && v in WARNA_LEVEL) {
        const w = WARNA_LEVEL[v as Level];
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: w.latar } };
        c.font = { color: { argb: w.huruf }, bold: true };
      }
    });
  });

  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3 + opsi.baris.length, column: opsi.kolom.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

/** Respons unduhan untuk berkas Excel. */
export function responsExcel(isi: Buffer, namaBerkas: string): Response {
  return new Response(new Uint8Array(isi), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Cache-Control": "no-store",
    },
  });
}

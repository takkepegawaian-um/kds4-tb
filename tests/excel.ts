// Pembantu tes: membaca DATA_TB.xlsx (HANYA BACA, file tidak pernah diubah).
// File ini berisi data pribadi sehingga tidak ikut diunggah ke GitHub;
// tes yang membutuhkannya otomatis dilewati bila file tidak ada.
import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { nilaiSel as bacaNilaiSel } from "@/lib/excel/data-tb";

export const LOKASI_EXCEL = process.env.KDS4_EXCEL ?? path.resolve(__dirname, "..", "DATA_TB.xlsx");
export const adaExcel = fs.existsSync(LOKASI_EXCEL);

let cache: Promise<ExcelJS.Workbook> | undefined;
export function bacaExcel() {
  cache ??= (async () => {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(LOKASI_EXCEL);
    return wb;
  })();
  return cache;
}

/** Nilai sel; untuk sel rumus dikembalikan hasil hitung yang tersimpan di Excel. */
export function nilaiSel(ws: ExcelJS.Worksheet, alamat: string): unknown {
  return bacaNilaiSel(ws.getCell(alamat));
}

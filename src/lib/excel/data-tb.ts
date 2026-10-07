// Membaca sheet "Data TB" dari berkas Excel.
// Kolom dikenali dari JUDUL kolom (baris judul), bukan dari huruf kolom,
// sehingga tetap jalan bila urutan kolom berubah.
// Dipakai oleh fitur Impor dan oleh tes pencocokan dengan Excel.

import type ExcelJS from "exceljs";
import { dariSeri } from "@/lib/aturan/hari";

export type TipeKolom = "teks" | "tanggal" | "angka";

/** Kolom input sheet Data TB: judul di Excel -> nama kolom di database. */
export const KOLOM_INPUT = [
  { judul: "No", kolom: "no", tipe: "angka" },
  { judul: "Nama", kolom: "nama", tipe: "teks" },
  { judul: "NIP", kolom: "nip", tipe: "teks" },
  { judul: "Status akhir", kolom: "statusAkhir", tipe: "teks" },
  { judul: "Fakultas", kolom: "fakultas", tipe: "teks" },
  { judul: "Departemen", kolom: "departemen", tipe: "teks" },
  { judul: "Jabatan", kolom: "jabatan", tipe: "teks" },
  { judul: "Jenjang", kolom: "jenjang", tipe: "teks" },
  { judul: "Jenis pelaksanaan", kolom: "jenisPelaksanaan", tipe: "teks" },
  { judul: "Lokasi", kolom: "lokasi", tipe: "teks" },
  { judul: "Sumber biaya", kolom: "sumberBiaya", tipe: "teks" },
  { judul: "Tempat studi", kolom: "tempatStudi", tipe: "teks" },
  { judul: "TMT TB", kolom: "tmtTb", tipe: "tanggal" },
  { judul: "Masa studi s.d.", kolom: "masaStudiSd", tipe: "tanggal" },
  { judul: "Perpanjangan s.d.", kolom: "perpanjanganSd", tipe: "tanggal" },
  { judul: "Status SK", kolom: "statusSk", tipe: "teks" },
  { judul: "Kondisi kuliah", kolom: "kondisiKuliah", tipe: "teks" },
  { judul: "No SK / No usul", kolom: "noSk", tipe: "teks" },
  { judul: "Link SK", kolom: "linkSk", tipe: "teks" },
  { judul: "Presensi di sistem", kolom: "presensi", tipe: "teks" },
  { judul: "Presensi ditandai TB s.d.", kolom: "presensiTbSd", tipe: "tanggal" },
  { judul: "Catatan (presensi & lainnya)", kolom: "catatan", tipe: "teks" },
  { judul: "Tanggal masuk tahap", kolom: "tanggalMasukTahap", tipe: "tanggal" },
] as const satisfies readonly { judul: string; kolom: string; tipe: TipeKolom }[];

export type NamaKolomInput = (typeof KOLOM_INPUT)[number]["kolom"];

/** Kolom hasil hitung di Excel (hanya untuk tes pencocokan). */
export const KOLOM_HASIL = [
  "Akhir efektif",
  "Sisa hari",
  "Tahap",
  "SK terbit?",
  "Hari kuliah tanpa SK",
  "Hari tertahan",
  "Pihak penahan",
  "Kode",
  "Hambatan utama",
  "Level",
  "Skor",
  "Peringkat",
  "Cek data",
] as const;

export type BarisExcel = {
  /** Nomor baris di Excel */
  baris: number;
  /** Nilai input yang sudah dirapikan. Tanggal "yyyy-mm-dd". */
  nilai: Record<NamaKolomInput, string | number | null>;
  /** Masalah yang membuat baris tidak bisa disimpan, mis. tanggal tidak terbaca. */
  galat: string[];
  /** Masalah yang tidak menghalangi penyimpanan. */
  peringatan: string[];
  /** Nilai hasil hitung yang tersimpan di Excel (bila ada). */
  hasilExcel: Record<(typeof KOLOM_HASIL)[number], unknown>;
};

const rapikanJudul = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Nilai sel. Untuk sel rumus dikembalikan hasil hitung yang tersimpan di Excel.
 *
 * Catatan: ExcelJS (4.4) membuang hasil rumus yang bernilai 0 atau teks kosong
 * bila dibaca lewat `cell.value` (lihat _copyModel di exceljs/lib/doc/cell.js).
 * Karena itu hasil rumus dibaca dari `cell.result`, yang masih utuh.
 */
export function nilaiSel(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v && typeof v === "object" && ("formula" in v || "sharedFormula" in v)) {
    return nilaiMentah((cell.result ?? null) as ExcelJS.CellValue);
  }
  return nilaiMentah(v);
}

/** Nilai mentah: teks dari rich text / hyperlink, atau nilai biasa. */
export function nilaiMentah(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return nilaiMentah(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return nilaiMentah(v.text as ExcelJS.CellValue);
    if ("error" in v) return null;
    if ("formula" in v || "sharedFormula" in v) return null;
  }
  return v;
}

const POLA_DMY = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
const POLA_ISO = /^(\d{4})-(\d{2})-(\d{2})/;

function tanggalSah(y: number, m: number, d: number): string | null {
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return t.toISOString().slice(0, 10);
}

/** Mengubah isi sel menjadi tanggal "yyyy-mm-dd". Mengembalikan undefined bila tidak terbaca. */
export function bacaTanggal(v: unknown): string | null | undefined {
  if (v === null || v === "") return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // Sel berisi nomor seri Excel tanpa format tanggal (terjadi mulai sekitar baris 302).
    return v > 0 && Number.isInteger(v) ? dariSeri(v) : undefined;
  }
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return null;
    let m = POLA_DMY.exec(t);
    if (m) return tanggalSah(+m[3], +m[2], +m[1]) ?? undefined;
    m = POLA_ISO.exec(t);
    if (m) return tanggalSah(+m[1], +m[2], +m[3]) ?? undefined;
  }
  return undefined;
}

function bacaTeks(v: unknown): string | null {
  if (v === null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const t = String(v).trim();
  return t === "" ? null : t;
}

/** Mencari baris judul (berisi "Nama" dan "NIP") di 20 baris pertama. */
export function cariBarisJudul(ws: ExcelJS.Worksheet): number | null {
  for (let r = 1; r <= Math.min(20, ws.rowCount); r++) {
    const isi = new Set<string>();
    ws.getRow(r).eachCell((c) => isi.add(rapikanJudul(String(nilaiSel(c) ?? ""))));
    if (isi.has("nama") && isi.has("nip")) return r;
  }
  return null;
}

export type HasilBacaSheet = {
  barisJudul: number;
  /** Judul kolom input yang tidak ditemukan di berkas */
  kolomHilang: string[];
  /** Judul kolom di berkas yang tidak dikenali (diabaikan) */
  kolomTidakDikenal: string[];
  data: BarisExcel[];
};

export function bacaSheetDataTb(ws: ExcelJS.Worksheet): HasilBacaSheet {
  const barisJudul = cariBarisJudul(ws);
  if (barisJudul === null) {
    throw new Error('Baris judul tidak ditemukan. Pastikan ada kolom berjudul "Nama" dan "NIP".');
  }

  const posisi = new Map<string, number>();
  ws.getRow(barisJudul).eachCell((c, kol) => {
    const j = rapikanJudul(String(nilaiSel(c) ?? ""));
    if (j && !posisi.has(j)) posisi.set(j, kol);
  });

  const dikenal = new Set([...KOLOM_INPUT.map((k) => rapikanJudul(k.judul)), ...KOLOM_HASIL.map(rapikanJudul)]);
  const kolomHilang = KOLOM_INPUT.filter((k) => !posisi.has(rapikanJudul(k.judul))).map((k) => k.judul);
  const kolomTidakDikenal = [...posisi.keys()].filter((j) => !dikenal.has(j));

  const data: BarisExcel[] = [];
  for (let r = barisJudul + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const ambil = (judul: string) => {
      const kol = posisi.get(rapikanJudul(judul));
      return kol ? nilaiSel(row.getCell(kol)) : null;
    };

    const nilai = {} as BarisExcel["nilai"];
    const galat: string[] = [];
    const peringatan: string[] = [];
    for (const k of KOLOM_INPUT) {
      const mentah = ambil(k.judul);
      if (k.tipe === "tanggal") {
        const t = bacaTanggal(mentah);
        if (t === undefined) {
          galat.push(`${k.judul}: "${String(mentah)}" bukan tanggal yang terbaca (pakai format dd/mm/yyyy)`);
          nilai[k.kolom] = null;
        } else nilai[k.kolom] = t;
      } else if (k.tipe === "angka") {
        nilai[k.kolom] = typeof mentah === "number" ? mentah : mentah == null || mentah === "" ? null : Number(mentah) || null;
      } else {
        if (k.kolom === "nip" && typeof mentah === "number") {
          peringatan.push("NIP tersimpan sebagai angka di Excel; digit belakangnya bisa sudah berubah. Periksa NIP ini.");
        }
        nilai[k.kolom] = bacaTeks(mentah);
      }
    }

    // Baris tanpa isian sama sekali dilewati (Excel menyiapkan baris rumus kosong s.d. 800).
    const adaIsi = KOLOM_INPUT.some((k) => k.kolom !== "no" && nilai[k.kolom] !== null);
    if (!adaIsi) continue;

    const hasilExcel = {} as BarisExcel["hasilExcel"];
    for (const j of KOLOM_HASIL) hasilExcel[j] = ambil(j);

    data.push({ baris: r, nilai, galat, peringatan, hasilExcel });
  }

  return { barisJudul, kolomHilang, kolomTidakDikenal, data };
}

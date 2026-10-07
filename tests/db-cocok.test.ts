// TES UJUNG-KE-UJUNG: Excel -> impor -> database -> mesin aturan.
//
// Membaca data yang SUDAH diimpor ke database (hanya baca), menghitungnya,
// lalu membandingkan setiap baris dengan nilai di DATA_TB.xlsx. Membuktikan
// bahwa impor tidak mengubah data sedikit pun.
//
// Hanya berjalan bila diminta:  npm run uji:db
// (butuh database berjalan dan berisi hasil impor DATA_TB.xlsx).

import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hitungSemua } from "@/lib/aturan/mesin";
import { susunPengaturan } from "@/lib/aturan/pengaturan";
import { prisma } from "@/lib/db";
import { dbKeNilai, keInputAturan } from "@/lib/data/peta";
import { bacaSheetDataTb, KOLOM_INPUT, type BarisExcel } from "@/lib/excel/data-tb";
import { dariDb } from "@/lib/tanggal";
import { adaExcel, bacaExcel, nilaiSel } from "./excel";

const diminta = process.env.KDS4_UJI_DB === "1";

describe.skipIf(!diminta || !adaExcel)("Data di database sama dengan DATA_TB.xlsx", () => {
  let excel: BarisExcel[];
  let tanggalAcuan: string;

  beforeAll(async () => {
    const wb = await bacaExcel();
    excel = bacaSheetDataTb(wb.getWorksheet("Data TB")!).data;
    tanggalAcuan = (nilaiSel(wb.getWorksheet("Pengaturan")!, "C5") as Date).toISOString().slice(0, 10);
  });
  afterAll(() => prisma.$disconnect());

  it("setiap kolom input tersimpan persis, dan hasil hitung dari database sama dengan Excel", async () => {
    const pegawai = await prisma.pegawaiTB.findMany({ where: { dihapusPada: null }, orderBy: { urutan: "asc" } });
    expect(pegawai.length).toBe(excel.length);

    // Impor pertama memakai urutan = nomor baris Excel.
    const perUrutan = new Map(pegawai.map((p) => [p.urutan, p]));
    const beda: string[] = [];
    for (const b of excel) {
      const p = perUrutan.get(b.baris);
      if (!p) {
        beda.push(`baris ${b.baris}: tidak ada di database`);
        continue;
      }
      const tersimpan = dbKeNilai(p);
      for (const { kolom, judul } of KOLOM_INPUT) {
        // Nilai dropdown boleh dirapikan penulisannya saat impor; bandingkan tanpa huruf besar/kecil.
        const a = b.nilai[kolom];
        const c = tersimpan[kolom];
        const sama = typeof a === "string" && typeof c === "string" ? a.toLowerCase() === c.toLowerCase() : a === c;
        if (!sama) beda.push(`baris ${b.baris} ${judul}: Excel ${JSON.stringify(a)}, database ${JSON.stringify(c)}`);
      }
    }
    expect(beda).toEqual([]);

    const [parameter, statusSk, aturan, libur] = await Promise.all([
      prisma.parameter.findMany(),
      prisma.pemetaanStatusSk.findMany({ orderBy: { urutan: "asc" } }),
      prisma.aturanHambatan.findMany(),
      prisma.hariLibur.findMany(),
    ]);
    const pengaturan = susunPengaturan({ parameter, statusSk, aturan, hariLibur: libur.map((h) => dariDb(h.tanggal)!) });
    const hasil = hitungSemua(pegawai.map(keInputAturan), pengaturan, tanggalAcuan);

    const bedaHasil: string[] = [];
    pegawai.forEach((p, i) => {
      const x = excel.find((b) => b.baris === p.urutan)!.hasilExcel;
      const h = hasil[i];
      const cek = (judul: string, excelV: unknown, app: unknown) => {
        if ((excelV === "" ? null : excelV ?? null) !== app) bedaHasil.push(`baris ${p.urutan} ${judul}: Excel ${JSON.stringify(excelV)}, aplikasi ${JSON.stringify(app)}`);
      };
      cek("Kode", x["Kode"], h.kode);
      cek("Skor", x["Skor"], h.skor);
      cek("Level", x["Level"], h.level);
      cek("Peringkat", x["Peringkat"], h.peringkat);
      cek("Hambatan utama", x["Hambatan utama"], h.hambatan);
      cek("Sisa hari", x["Sisa hari"], h.sisaHari);
    });
    console.log(`\nDATABASE vs EXCEL: ${pegawai.length} orang, ${KOLOM_INPUT.length} kolom input + 6 kolom hasil per orang, ${beda.length + bedaHasil.length} selisih.`);
    expect(bedaHasil).toEqual([]);
  });
});

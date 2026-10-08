// Memastikan nilai bawaan Pengaturan (src/lib/pengaturan/bawaan.ts) sama persis
// dengan sheet "Pengaturan" di DATA_TB.xlsx.
import { describe, expect, it } from "vitest";
import {
  ATURAN_HAMBATAN_BAWAAN,
  PARAMETER_BAWAAN,
  PILIHAN_BAWAAN,
  STATUS_SK_BAWAAN,
} from "@/lib/pengaturan/bawaan";
import { adaExcel, bacaExcel, nilaiSel } from "./excel";

const param = (k: string) => Number(PARAMETER_BAWAAN.find((p) => p.kunci === k)!.nilai);

describe.skipIf(!adaExcel)("Pengaturan bawaan = sheet Pengaturan di Excel", () => {
  it("parameter angka (C6:C13)", async () => {
    const ws = (await bacaExcel()).getWorksheet("Pengaturan")!;
    expect({
      toleransiUsulBulan: param("toleransiUsulBulan"),
      tenggatPerpanjanganBulan: param("tenggatPerpanjanganBulan"),
      ambangMasaTbHari: param("ambangMasaTbHari"),
      ambangPresensiHari: param("ambangPresensiHari"),
      batasTertahanHari: param("batasTertahanHari"),
      pengurangSkorTetap: param("pengurangSkorTetap"),
      batasUsulHariKerja: param("batasUsulHariKerja"),
      batasLaporHariKerja: param("batasLaporHariKerja"),
    }).toEqual({
      toleransiUsulBulan: nilaiSel(ws, "C6"),
      tenggatPerpanjanganBulan: nilaiSel(ws, "C7"),
      ambangMasaTbHari: nilaiSel(ws, "C8"),
      ambangPresensiHari: nilaiSel(ws, "C9"),
      batasTertahanHari: nilaiSel(ws, "C10"),
      pengurangSkorTetap: nilaiSel(ws, "C11"),
      batasUsulHariKerja: nilaiSel(ws, "C12"),
      batasLaporHariKerja: nilaiSel(ws, "C13"),
    });
  });

  it("daftar fakultas (J6:J15)", async () => {
    const ws = (await bacaExcel()).getWorksheet("Pengaturan")!;
    const excel = Array.from({ length: 10 }, (_, i) => nilaiSel(ws, `J${6 + i}`));
    expect(PILIHAN_BAWAAN.find((k) => k.kategori === "FAKULTAS")!.nilai).toEqual(excel);
  });

  it("pemetaan Status SK (B17:E23)", async () => {
    const ws = (await bacaExcel()).getWorksheet("Pengaturan")!;
    const excel = Array.from({ length: 7 }, (_, i) => ({
      statusSk: nilaiSel(ws, `B${17 + i}`),
      tahap: nilaiSel(ws, `C${17 + i}`),
      pihakPenahan: nilaiSel(ws, `D${17 + i}`),
      skTerbit: nilaiSel(ws, `E${17 + i}`),
    }));
    expect(STATUS_SK_BAWAAN).toEqual(excel);
  });

  it("tabel aturan hambatan (B27:E39)", async () => {
    const ws = (await bacaExcel()).getWorksheet("Pengaturan")!;
    const excel = Array.from({ length: 13 }, (_, i) => ({
      kode: nilaiSel(ws, `B${27 + i}`),
      nama: nilaiSel(ws, `C${27 + i}`),
      skorDasar: nilaiSel(ws, `D${27 + i}`),
      saran: nilaiSel(ws, `E${27 + i}`),
    }));
    // Kode, skor dasar, dan nama/saran semua kode SAMA dengan Excel, kecuali nama dan saran
    // kode 1, 2, dan 5 yang istilahnya sengaja diganti (permintaan pengguna 08/10/2026;
    // lihat test berikutnya).
    const KODE_ISTILAH_BARU = [1, 2, 5];
    expect(ATURAN_HAMBATAN_BAWAAN.map((a) => [a.kode, a.skorDasar])).toEqual(excel.map((a) => [a.kode, a.skorDasar]));
    expect(ATURAN_HAMBATAN_BAWAAN.filter((a) => !KODE_ISTILAH_BARU.includes(a.kode))).toEqual(
      excel.filter((a) => !KODE_ISTILAH_BARU.includes(a.kode as number)),
    );
  });

  it("istilah absensi diganti pada kode 1, 2, dan 5 (selisih yang disengaja terhadap Excel)", () => {
    const per = Object.fromEntries(ATURAN_HAMBATAN_BAWAAN.map((a) => [a.kode, a]));
    expect(per[1].nama).toBe("Masa TB berakhir, tetapi absensi masih ditandai TB");
    expect(per[2].nama).toBe("SK TB berlaku, tetapi absensi tidak ditandai TB");
    expect(per[5].nama).toBe("Penandaan TB di absensi lebih pendek dari masa TB");
    for (const k of [1, 2, 5]) expect(per[k].nama + per[k].saran).not.toMatch(/presensi|NON AKTIF|MISTERY/i);
  });

  it("hari libur di Excel masih kosong (G6:G40)", async () => {
    const ws = (await bacaExcel()).getWorksheet("Pengaturan")!;
    const terisi = Array.from({ length: 35 }, (_, i) => nilaiSel(ws, `G${6 + i}`)).filter((v) => v != null);
    expect(terisi).toEqual([]);
  });

  it("daftar pilihan sama dengan validasi data di sheet Data TB", () => {
    const ambil = (k: string) => PILIHAN_BAWAAN.find((p) => p.kategori === k)!.nilai;
    expect(ambil("JENIS_PELAKSANAAN")).toEqual(["Bebas", "Tetap"]);
    expect(ambil("KONDISI_KULIAH")).toEqual(["Belum kuliah", "Sedang kuliah", "Sudah kuliah"]);
    // Excel memuat "MISTERY??" sebagai pilihan ketiga; sengaja dihapus (permintaan pengguna 08/10/2026).
    expect(ambil("PRESENSI")).toEqual(["AKTIF", "NON AKTIF"]);
    expect(ambil("LOKASI")).toEqual(["DN", "LN"]);
    expect(ambil("STATUS_AKHIR")).toEqual(["Sedang TB", "Sudah PK", "Expired", "Lulus", "Rencana studi"]);
  });
});

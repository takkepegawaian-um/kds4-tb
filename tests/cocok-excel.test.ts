// TES PENCOCOKAN DENGAN EXCEL
//
// Menghitung ulang SEMUA baris DATA_TB.xlsx dengan mesin aturan, lalu
// membandingkan setiap kolom hasil (Akhir efektif s.d. Cek data) dan semua
// angka Dashboard dengan nilai yang tersimpan di Excel.
//
// Tanggal acuan diambil dari Pengaturan!C5 di Excel (nilai yang dipakai saat
// berkas terakhir dihitung), supaya perbandingannya adil.
//
// Selisih yang DISENGAJA (disetujui pengguna) didaftar di SELISIH_DISENGAJA.
// Selisih lain apa pun membuat tes gagal dan dicetak lengkap per baris.

import type ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";
import { dariSeri } from "@/lib/aturan/hari";
import { hitungSemua, type HasilPegawai, type InputPegawai } from "@/lib/aturan/mesin";
import { pengaturanBawaan } from "@/lib/aturan/pengaturan";
import { hitungRekapResmi, hitungRingkasan, type Ringkasan } from "@/lib/aturan/ringkasan";
import { saring, type Angka, type BarisDihitung } from "@/lib/aturan/saringan";
import { saringanDariUrl, saringanKeUrl } from "@/lib/aturan/saringan-url";
import { bacaSheetDataTb, KOLOM_HASIL, nilaiSel, type BarisExcel } from "@/lib/excel/data-tb";
import { PILIHAN_BAWAAN, REKAP_RESMI_FAKULTAS_BAWAAN } from "@/lib/pengaturan/bawaan";
import { KOLOM_PERHATIAN, pilihPerhatian, type BarisPerhatian } from "@/lib/data/perhatian";
import type { PegawaiTB } from "@/generated/prisma/client";
import { adaExcel, bacaExcel } from "./excel";

/**
 * Kolom "Cek data": Excel memakai COUNTIF yang hanya membandingkan 15 digit pertama NIP,
 * sehingga 3 orang ini keliru ditandai "NIP kembar." (NIP mereka hanya mirip dengan
 * NIP orang lain di 15 digit pertama). Aplikasi membandingkan NIP utuh 18 digit.
 */
const SELISIH_DISENGAJA: { baris: number; kolom: string; excel: unknown; aplikasi: unknown }[] = [
  { baris: 36, kolom: "Cek data", excel: "NIP kembar.", aplikasi: null },
  { baris: 37, kolom: "Cek data", excel: "NIP kembar.", aplikasi: null },
  { baris: 48, kolom: "Cek data", excel: "NIP kembar.", aplikasi: null },
  // Isian "MISTERY??" dihapus dari daftar pilihan (permintaan pengguna 08/10/2026), jadi catatan ini
  // tidak lagi dibuat. Hanya baris 50 yang berisi MISTERY??.
  { baris: 50, kolom: "Cek data", excel: "Status presensi tidak jelas.", aplikasi: null },
];

type Selisih = { baris: number; nip: string; kolom: string; excel: unknown; aplikasi: unknown };

let wb: ExcelJS.Workbook;
let barisExcel: BarisExcel[];
let tanggalAcuan: string;
let hasil: HasilPegawai[];
let dihitung: BarisDihitung[];
let ringkasan: Ringkasan;

/** Menyamakan bentuk nilai Excel: "" -> null, Date/nomor seri -> "yyyy-mm-dd". */
function rapikan(kolom: string, v: unknown): unknown {
  if (v === "" || v === undefined) return null;
  if (kolom === "Akhir efektif") {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    if (typeof v === "number") return dariSeri(v);
  }
  return v;
}

function nilaiAplikasi(h: HasilPegawai, kolom: (typeof KOLOM_HASIL)[number]): unknown {
  switch (kolom) {
    case "Akhir efektif": return h.akhirEfektif;
    case "Sisa hari": return h.sisaHari;
    case "Tahap": return h.tahap;
    case "SK terbit?": return h.skTerbit;
    case "Hari kuliah tanpa SK": return h.hariKuliahTanpaSk;
    case "Hari tertahan": return h.hariTertahan;
    case "Pihak penahan": return h.pihakPenahan;
    case "Kode": return h.kode;
    case "Hambatan utama": return h.hambatan;
    case "Level": return h.level;
    case "Skor": return h.skor;
    case "Peringkat": return h.peringkat;
    case "Cek data": return h.cekData;
  }
}

function keInput(b: BarisExcel): InputPegawai {
  const t = (k: keyof BarisExcel["nilai"]) => b.nilai[k] as string | null;
  return {
    urutan: b.baris,
    nama: t("nama"),
    nip: t("nip"),
    statusAkhir: t("statusAkhir"),
    fakultas: t("fakultas"),
    jenisPelaksanaan: t("jenisPelaksanaan"),
    statusSk: t("statusSk"),
    presensi: t("presensi"),
    tmtTb: t("tmtTb"),
    masaStudiSd: t("masaStudiSd"),
    perpanjanganSd: t("perpanjanganSd"),
    presensiTbSd: t("presensiTbSd"),
    tanggalMasukTahap: t("tanggalMasukTahap"),
  };
}

describe.skipIf(!adaExcel)("Pencocokan dengan DATA_TB.xlsx", () => {
  beforeAll(async () => {
    wb = await bacaExcel();
    const sheet = bacaSheetDataTb(wb.getWorksheet("Data TB")!);
    expect(sheet.kolomHilang).toEqual([]);
    barisExcel = sheet.data;

    const c5 = nilaiSel(wb.getWorksheet("Pengaturan")!.getCell("C5"));
    tanggalAcuan = (c5 as Date).toISOString().slice(0, 10);

    // Logika diuji dengan KATA-KATA ASLI Excel (nama hambatan dan saran dari sheet Pengaturan),
    // supaya perbedaan istilah yang disengaja (lihat tests/pengaturan-bawaan.test.ts) tidak
    // tampil sebagai selisih hitungan.
    const pengaturan = pengaturanBawaan();
    const wsPeng = wb.getWorksheet("Pengaturan")!;
    pengaturan.aturan = pengaturan.aturan.map((a) => ({
      ...a,
      nama: nilaiSel(wsPeng.getCell(`C${27 + a.kode}`)) as string,
      saran: nilaiSel(wsPeng.getCell(`E${27 + a.kode}`)) as string,
    }));
    const input = barisExcel.map(keInput);
    hasil = hitungSemua(input, pengaturan, tanggalAcuan);
    dihitung = input.map((i, k) => ({ input: i, hasil: hasil[k] }));
    ringkasan = hitungRingkasan(dihitung, pengaturan, {
      statusAkhir: PILIHAN_BAWAAN.find((p) => p.kategori === "STATUS_AKHIR")!.nilai,
      fakultas: PILIHAN_BAWAAN.find((p) => p.kategori === "FAKULTAS")!.nilai,
    });
  });

  it("semua baris terbaca tanpa masalah", () => {
    expect(barisExcel.length).toBe(491);
    const bermasalah = barisExcel
      .filter((b) => b.galat.length || b.peringatan.length)
      .map((b) => `baris ${b.baris}: ${[...b.galat, ...b.peringatan].join("; ")}`);
    expect(bermasalah).toEqual([]);
  });

  it("setiap kolom hasil di setiap baris sama dengan Excel (kecuali selisih yang disengaja)", () => {
    const selisih: Selisih[] = [];
    barisExcel.forEach((b, i) => {
      for (const kolom of KOLOM_HASIL) {
        const excel = rapikan(kolom, b.hasilExcel[kolom]);
        const aplikasi = nilaiAplikasi(hasil[i], kolom);
        if (excel !== aplikasi) selisih.push({ baris: b.baris, nip: String(b.nilai.nip), kolom, excel, aplikasi });
      }
    });

    const disengaja = (s: Selisih) =>
      SELISIH_DISENGAJA.some((d) => d.baris === s.baris && d.kolom === s.kolom && d.excel === s.excel && d.aplikasi === s.aplikasi);
    const takTerduga = selisih.filter((s) => !disengaja(s));

    console.log(
      `\nLAPORAN PENCOCOKAN (tanggal acuan ${tanggalAcuan.split("-").reverse().join("/")})\n` +
        `  Baris dibandingkan : ${barisExcel.length}\n` +
        `  Kolom per baris    : ${KOLOM_HASIL.length} (${KOLOM_HASIL.join(", ")})\n` +
        `  Total sel dicek    : ${barisExcel.length * KOLOM_HASIL.length}\n` +
        `  Selisih disengaja  : ${selisih.length - takTerduga.length}\n` +
        selisih
          .filter(disengaja)
          .map((s) => `    - baris ${s.baris} (NIP ${s.nip}) ${s.kolom}: Excel ${JSON.stringify(s.excel)}, aplikasi ${JSON.stringify(s.aplikasi)}`)
          .join("\n") +
        `\n  Selisih TAK TERDUGA: ${takTerduga.length}\n` +
        takTerduga
          .slice(0, 50)
          .map((s) => `    - baris ${s.baris} (NIP ${s.nip}) ${s.kolom}: Excel ${JSON.stringify(s.excel)}, aplikasi ${JSON.stringify(s.aplikasi)}`)
          .join("\n"),
    );

    expect(takTerduga).toEqual([]);
    // Semua selisih yang disengaja memang muncul (bila tidak, daftar di atas perlu diperbarui).
    expect(selisih.length - takTerduga.length).toBe(SELISIH_DISENGAJA.length);
  });

  describe("kriteria penerimaan (tanggal acuan 07/10/2026)", () => {
    beforeAll(() => {
      if (tanggalAcuan !== "2026-10-07") {
        throw new Error(`Excel terakhir dihitung pada ${tanggalAcuan}, bukan 2026-10-07. Buka Excel, isi Pengaturan!C4 = 07/10/2026, simpan.`);
      }
    });

    const jumlahStatus = (s: string) => ringkasan.statusAkhir.baris.find((x) => x.status === s)!.jumlah.jumlah;
    const level = (l: string) => ringkasan.ringkasan.level.find((x) => x.level === l)!;

    it("total orang dan per status akhir", () => {
      expect(dihitung.length).toBe(491);
      expect(jumlahStatus("Sedang TB")).toBe(297);
      expect(ringkasan.ringkasan.jumlahTb.bebas.jumlah).toBe(160);
      expect(ringkasan.ringkasan.jumlahTb.tetap.jumlah).toBe(137);
      expect(jumlahStatus("Sudah PK")).toBe(145);
      expect(jumlahStatus("Lulus")).toBe(27);
      expect(jumlahStatus("Rencana studi")).toBe(22);
      expect(jumlahStatus("Expired")).toBe(0);
    });

    it("level (hanya Sedang TB)", () => {
      const ringkas = (l: string) => [level(l).total, level(l).bebas.jumlah, level(l).tetap.jumlah];
      expect(ringkas("Kritis")).toEqual([39, 39, 0]);
      expect(ringkas("Waspada")).toEqual([91, 91, 0]);
      expect(ringkas("Perhatian")).toEqual([144, 22, 122]);
      expect(ringkas("Aman")).toEqual([23, 8, 15]);
    });

    it("jumlah per kode hambatan (Bebas + Tetap)", () => {
      const perKode = Object.fromEntries(ringkasan.hambatan.map((h) => [h.kode, h.total]));
      expect(perKode).toEqual({ 0: 23, 1: 9, 2: 0, 3: 116, 4: 28, 5: 79, 6: 0, 7: 18, 8: 0, 9: 0, 10: 2, 11: 21, 12: 1 });
    });

    it("per fakultas: kolom Arsip total 194", () => {
      expect(ringkasan.fakultas.jumlah.arsip).toBe(194);
    });
  });

  it("setiap angka di sheet Dashboard sama dengan hitungan aplikasi", () => {
    const ws = wb.getWorksheet("Dashboard")!;
    const sel = (a: string) => nilaiSel(ws.getCell(a));
    const banding: [string, unknown, unknown][] = [];
    const cek = (alamat: string, aplikasi: unknown) => banding.push([alamat, sel(alamat), aplikasi]);

    // Ringkasan C8:E12
    cek("C8", ringkasan.ringkasan.jumlahTb.bebas.jumlah);
    cek("D8", ringkasan.ringkasan.jumlahTb.tetap.jumlah);
    cek("E8", ringkasan.ringkasan.jumlahTb.total);
    ringkasan.ringkasan.level.forEach((l, i) => {
      cek(`C${9 + i}`, l.bebas.jumlah);
      cek(`D${9 + i}`, l.tetap.jumlah);
      cek(`E${9 + i}`, l.total);
    });

    // Status akhir B16:D21
    for (let r = 16; r <= 20; r++) {
      const x = ringkasan.statusAkhir.baris.find((s) => s.status === sel(`B${r}`))!;
      cek(`C${r}`, x.jumlah.jumlah);
      cek(`D${r}`, x.persen);
    }
    cek("C21", ringkasan.statusAkhir.total);
    cek("E21", ringkasan.statusAkhir.cocok ? "Cocok dengan Data TB" : "Cek: ada status kosong");

    // Hambatan B26:E38
    for (let r = 26; r <= 38; r++) {
      const h = ringkasan.hambatan.find((x) => x.nama === sel(`B${r}`))!;
      expect(h, `baris Dashboard ${r}`).toBeDefined();
      cek(`C${r}`, h.bebas.jumlah);
      cek(`D${r}`, h.tetap.jumlah);
      cek(`E${r}`, h.total);
    }

    // Tahap B43:F47
    for (let r = 43; r <= 47; r++) {
      const t = ringkasan.tahap.find((x) => x.tahap === sel(`B${r}`))!;
      expect(t, `tahap ${sel(`B${r}`)}`).toBeDefined();
      cek(`C${r}`, t.jumlah.jumlah);
      cek(`D${r}`, t.rataRataTertahan ?? "belum ada data");
      cek(`E${r}`, t.terlama ?? "-");
      cek(`F${r}`, t.kritisWaspada.jumlah);
    }

    // Penahan B53:E56
    for (let r = 53; r <= 56; r++) {
      const nama = r === 56 ? "Lainnya" : sel(`B${r}`);
      const p = ringkasan.penahan.find((x) => x.pihak === nama)!;
      cek(`C${r}`, p.bebas.jumlah);
      cek(`D${r}`, p.tetap.jumlah);
      cek(`E${r}`, p.total);
    }

    // Per fakultas B61:H72
    const kolomFak = ["total", "bebas", "kritis", "waspada", "perhatian", "arsip"] as const;
    ringkasan.fakultas.baris.forEach((f, i) => {
      const r = 61 + i;
      if (i < 10) expect(f.fakultas).toBe(sel(`B${r}`));
      kolomFak.forEach((k, j) => cek(`${"CDEFGH"[j]}${r}`, f[k].jumlah));
    });
    kolomFak.forEach((k, j) => cek(`${"CDEFGH"[j]}72`, ringkasan.fakultas.jumlah[k]));

    // Masa TB B76:E80
    ringkasan.masaTb.forEach((m, i) => {
      cek(`C${76 + i}`, m.bebas.jumlah);
      cek(`D${76 + i}`, m.tetap.jumlah);
      cek(`E${76 + i}`, m.total);
    });

    // Absensi C86:C92. C88 ("Presensi tidak jelas (MISTERY??)", Excel = 1) sengaja tidak ada lagi.
    const pr = ringkasan.presensi;
    [
      ["C86", pr.aktif],
      ["C87", pr.nonAktif],
      ["C89", pr.ditandaiTerisi],
      ["C90", pr.kode5],
      ["C91", pr.kode1],
      ["C92", pr.kode2],
    ].forEach(([alamat, a]) => cek(alamat as string, (a as typeof pr.aktif).jumlah));
    expect(sel("C88")).toBe(1); // yang dihapus memang ada satu orang di Excel (baris 50)

    // Rekap resmi B97:G107
    const rekap = hitungRekapResmi(dihitung, REKAP_RESMI_FAKULTAS_BAWAAN);
    rekap.baris.forEach((x, i) => {
      const r = 97 + i;
      cek(`C${r}`, x.tugasBelajar);
      cek(`D${r}`, x.biayaMandiri);
      cek(`E${r}`, x.jumlahRekap);
      cek(`F${r}`, x.sedangTb.jumlah);
      cek(`G${r}`, x.selisih);
    });
    cek("C107", rekap.jumlah.tugasBelajar);
    cek("D107", rekap.jumlah.biayaMandiri);
    cek("E107", rekap.jumlah.jumlahRekap);
    cek("F107", rekap.jumlah.sedangTb);
    cek("G107", rekap.jumlah.selisih);

    const beda = banding
      .filter(([, excel, app]) => (typeof excel === "number" && typeof app === "number" ? Math.abs(excel - app) > 1e-9 : excel !== app))
      .map(([a, excel, app]) => `${a}: Excel ${JSON.stringify(excel)}, aplikasi ${JSON.stringify(app)}`);
    console.log(`\nDASHBOARD: ${banding.length} sel dibandingkan, ${beda.length} berbeda.`);
    expect(beda).toEqual([]);
  });

  it("Daftar Perhatian sama dengan sheet \"Daftar Perhatian\" di Excel (urutan dan isi setiap kolom)", () => {
    const ws = wb.getWorksheet("Daftar Perhatian")!;
    const barisPerhatian: BarisPerhatian[] = dihitung.map((d, i) => ({
      ...d,
      pegawai: {
        nama: barisExcel[i].nilai.nama,
        nip: barisExcel[i].nilai.nip,
        fakultas: barisExcel[i].nilai.fakultas,
        jenisPelaksanaan: barisExcel[i].nilai.jenisPelaksanaan,
        catatan: barisExcel[i].nilai.catatan,
      } as PegawaiTB,
    }));
    const { hasil: daftar } = pilihPerhatian(barisPerhatian, {});

    // Baris Excel yang terisi (kolom Peringkat di A6:A330 selalu berisi angka; Nama kosong = tidak ada orang).
    const isiExcel: unknown[][] = [];
    for (let r = 6; r <= 330; r++) {
      const nama = nilaiSel(ws.getCell(`B${r}`));
      if (nama === null || nama === "") continue;
      isiExcel.push(Array.from({ length: 13 }, (_, c) => nilaiSel(ws.getRow(r).getCell(c + 1))));
    }
    expect(daftar.length).toBe(isiExcel.length);
    expect(daftar.length).toBe(274);

    // Selisih disengaja: di Excel, INDEX() ke sel KOSONG menghasilkan 0, sehingga Catatan/Fakultas
    // yang kosong tampil "0" di sheet Daftar Perhatian. Aplikasi menampilkannya kosong.
    const beda: string[] = [];
    const disengaja: string[] = [];
    daftar.forEach((b, i) => {
      KOLOM_PERHATIAN.forEach((k, c) => {
        let excel = isiExcel[i][c];
        if (excel === "") excel = null;
        if (excel instanceof Date) excel = excel.toISOString().slice(0, 10);
        if (k.judul === "Akhir efektif" && typeof excel === "number") excel = dariSeri(excel);
        const app = k.ambil(b) ?? null;
        if (!k.angka && excel === 0 && app === null) {
          disengaja.push(`baris ${i + 6} ${k.judul}: Excel 0 (sel sumber kosong), aplikasi kosong`);
          return;
        }
        if (excel !== app) beda.push(`baris ${i + 6} ${k.judul}: Excel ${JSON.stringify(excel)}, aplikasi ${JSON.stringify(app)}`);
      });
    });
    console.log(
      `\nDAFTAR PERHATIAN: ${daftar.length} baris × ${KOLOM_PERHATIAN.length} kolom dibandingkan, ${beda.length} berbeda tak terduga.\n` +
        `  Selisih disengaja (${disengaja.length}):\n` +
        disengaja.map((d) => `    - ${d}`).join("\n"),
    );
    expect(beda.slice(0, 20)).toEqual([]);
    expect(disengaja).toHaveLength(5);
  });

  it("setiap angka Dashboard yang diklik membuka daftar dengan jumlah orang yang sama (juga dengan filter global)", () => {
    const cek = (rk: Ringkasan) => {
      const semuaAngka: Angka[] = [];
      const kumpulkan = (x: unknown) => {
        if (x && typeof x === "object") {
          if ("jumlah" in x && "saringan" in x && typeof (x as Angka).jumlah === "number") semuaAngka.push(x as Angka);
          else Object.values(x).forEach(kumpulkan);
        }
      };
      kumpulkan(rk);
      expect(rk.ringkasan.jumlahTb.semua.jumlah).toBe(rk.ringkasan.jumlahTb.total);
      rk.hambatan.forEach((h) => expect(h.semua.jumlah).toBe(h.total));
      for (const a of semuaAngka) {
        const lewatUrl = saringanDariUrl(Object.fromEntries(saringanKeUrl(a.saringan)));
        expect(saring(dihitung, lewatUrl).length, JSON.stringify(a.saringan)).toBe(a.jumlah);
      }
      return semuaAngka.length;
    };
    const daftar = {
      statusAkhir: PILIHAN_BAWAAN.find((p) => p.kategori === "STATUS_AKHIR")!.nilai,
      fakultas: PILIHAN_BAWAAN.find((p) => p.kategori === "FAKULTAS")!.nilai,
    };
    const n1 = cek(ringkasan);
    const n2 = cek(hitungRingkasan(dihitung, pengaturanBawaan(), daftar, { fakultas: "FMIPA", jenis: "Bebas" }));
    console.log(`
TAUTAN DASHBOARD: ${n1 + n2} angka diperiksa (tanpa filter dan dengan filter FMIPA + Bebas), semua cocok.`);
  });
});

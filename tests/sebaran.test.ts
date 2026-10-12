// Tes pembakuan dan hitungan "Sebaran" (sumber biaya, kampus).
// Bagian yang memakai DATA_TB.xlsx dilewati bila berkasnya tidak ada.

import { beforeAll, describe, expect, it } from "vitest";
import { hitungSemua, type InputPegawai } from "@/lib/aturan/mesin";
import { pengaturanBawaan } from "@/lib/aturan/pengaturan";
import { hitungRingkasan } from "@/lib/aturan/ringkasan";
import { KOSONG, saring, type BarisDihitung } from "@/lib/aturan/saringan";
import { saringanDariUrl, saringanKeUrl } from "@/lib/aturan/saringan-url";
import { BIAYA, hitungSebaran, kelompokkan, kunciTeks, susunPembakuan, type BarisPembakuan } from "@/lib/aturan/sebaran";
import { bacaSheetDataTb, type BarisExcel } from "@/lib/excel/data-tb";
import { PEMBAKUAN_BAWAAN } from "@/lib/pengaturan/bawaan-pembakuan";
import { adaExcel, bacaExcel } from "./excel";

const tabel: BarisPembakuan[] = [
  { jenis: "BIAYA", asli: "Mandiri", baku: "Mandiri", negara: null },
  { jenis: "BIAYA", asli: "Sendiri", baku: "Mandiri", negara: null },
  { jenis: "BIAYA", asli: "LPDP", baku: "Beasiswa", negara: null },
  { jenis: "BIAYA", asli: "UM/mandiri", baku: "Belum jelas", negara: null },
  { jenis: "KAMPUS", asli: "UGM", baku: "Universitas Gadjah Mada", negara: "Indonesia" },
  { jenis: "KAMPUS", asli: "Universitas Gadjah Mada Yogyakarta", baku: "Universitas Gadjah Mada", negara: "Indonesia" },
  { jenis: "KAMPUS", asli: "Osaka University, Japan", baku: "Osaka University", negara: "Jepang" },
];
const pb = susunPembakuan(tabel);

describe("kelompokkan", () => {
  it("menerjemahkan sumber biaya tanpa membedakan huruf besar/kecil dan spasi berlebih", () => {
    expect(kelompokkan("  mandiri ", null, pb).biaya).toBe("Mandiri");
    expect(kelompokkan("SENDIRI", null, pb).biaya).toBe("Mandiri");
    expect(kelompokkan("lpdp", null, pb).biaya).toBe("Beasiswa");
    expect(kelompokkan("UM/mandiri", null, pb).biaya).toBe("Belum jelas");
  });

  it("sumber biaya kosong = Belum jelas; tulisan yang belum terdaftar = Belum dikelompokkan", () => {
    expect(kelompokkan(null, null, pb).biaya).toBe(BIAYA.BELUM_JELAS);
    expect(kelompokkan("   ", null, pb).biaya).toBe(BIAYA.BELUM_JELAS);
    expect(kelompokkan("Beasiswa Baru XYZ", null, pb).biaya).toBe(BIAYA.BELUM_DIKELOMPOKKAN);
  });

  it("kelompok biaya di luar tiga pilihan dianggap belum dikelompokkan", () => {
    const aneh = susunPembakuan([{ jenis: "BIAYA", asli: "X", baku: "Lainnya", negara: null }]);
    expect(kelompokkan("X", null, aneh).biaya).toBe(BIAYA.BELUM_DIKELOMPOKKAN);
  });

  it("kampus: variasi tulisan menjadi satu nama baku beserta negaranya", () => {
    expect(kelompokkan(null, "UGM", pb)).toMatchObject({ kampus: "Universitas Gadjah Mada", negara: "Indonesia" });
    expect(kelompokkan(null, "universitas  gadjah mada yogyakarta", pb).kampus).toBe("Universitas Gadjah Mada");
    expect(kelompokkan(null, "Osaka University, Japan", pb)).toMatchObject({ kampus: "Osaka University", negara: "Jepang" });
  });

  it("kampus yang belum terdaftar tampil apa adanya (spasi dirapikan), negara tidak diketahui", () => {
    expect(kelompokkan(null, "  Kampus   Baru ", pb)).toEqual({ biaya: BIAYA.BELUM_JELAS, kampus: "Kampus Baru", negara: null });
  });

  it("tempat studi kosong = KOSONG", () => {
    expect(kelompokkan(null, "", pb).kampus).toBe(KOSONG);
    expect(kelompokkan(null, null, pb).negara).toBeNull();
  });

  it("baris pembakuan dengan baku kosong diabaikan", () => {
    const p = susunPembakuan([{ jenis: "BIAYA", asli: "A", baku: "  ", negara: null }]);
    expect(p.biaya.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------

/** Baris uji sederhana: hanya kolom yang dipakai saringan. */
function baris(i: number, o: { jenis: string; status?: string; biaya: string | null; kampus: string | null; fakultas?: string }): BarisDihitung {
  return {
    input: { urutan: i, statusAkhir: o.status ?? "Sedang TB", jenisPelaksanaan: o.jenis, fakultas: o.fakultas ?? "FIP" } as InputPegawai,
    hasil: {} as never,
    kelompok: kelompokkan(o.biaya, o.kampus, pb),
  };
}

const contoh: BarisDihitung[] = [
  baris(1, { jenis: "Bebas", biaya: "LPDP", kampus: "UGM" }),
  baris(2, { jenis: "Bebas", biaya: "LPDP", kampus: "Universitas Gadjah Mada Yogyakarta" }),
  baris(3, { jenis: "Bebas", biaya: "Mandiri", kampus: "Osaka University, Japan" }),
  baris(4, { jenis: "Tetap", biaya: "Sendiri", kampus: "Kampus Baru" }),
  baris(5, { jenis: "Tetap", biaya: "Mandiri", kampus: null }),
  baris(6, { jenis: "Tetap", biaya: null, kampus: "Kampus baru" }),
  baris(7, { jenis: "Bebas", biaya: "Beasiswa Baru", kampus: "UGM", fakultas: "FT" }),
  baris(8, { jenis: "Bebas", status: "Lulus", biaya: "LPDP", kampus: "UGM" }), // bukan Sedang TB: tidak dihitung
];

describe("hitungSebaran", () => {
  const s = hitungSebaran(contoh, (t) => t);
  const jml = (xs: { nama: string; angka: { jumlah: number } }[], nama: string) => xs.find((x) => x.nama === nama)?.angka.jumlah;

  it("hanya menghitung orang Sedang TB", () => {
    expect(s.totalTb).toBe(7);
    expect(jml(s.jenis, "Bebas")).toBe(4);
    expect(jml(s.jenis, "Tetap")).toBe(3);
  });

  it("sumber biaya dipisah menurut jenis, jumlah irisan = jumlah jenis", () => {
    expect(jml(s.biayaBebas, "Beasiswa")).toBe(2);
    expect(jml(s.biayaBebas, "Mandiri")).toBe(1);
    expect(jml(s.biayaBebas, "Belum dikelompokkan")).toBe(1);
    expect(jml(s.biayaTetap, "Mandiri")).toBe(2);
    expect(jml(s.biayaTetap, "Belum jelas")).toBe(1);
    for (const [irisan, jenis] of [[s.biayaBebas, "Bebas"], [s.biayaTetap, "Tetap"]] as const) {
      expect(irisan.reduce((t, x) => t + x.angka.jumlah, 0)).toBe(jml(s.jenis, jenis));
    }
  });

  it("kampus digabung menurut nama baku (huruf besar/kecil tidak berpengaruh), urut jumlah terbanyak", () => {
    expect(s.kampus.map((k) => [k.nama, k.angka.jumlah])).toEqual([
      ["Universitas Gadjah Mada", 3],
      ["Kampus Baru", 2],
      ["Osaka University", 1],
      [KOSONG, 1],
    ]);
    expect(s.kampus.reduce((t, k) => t + k.angka.jumlah, 0)).toBe(s.totalTb);
  });

  it("negara: Indonesia di atas, belum diketahui di bawah", () => {
    expect(s.negara.map((n) => [n.nama, n.angka.jumlah])).toEqual([
      ["Indonesia", 3],
      ["Jepang", 1],
      [KOSONG, 3],
    ]);
  });

  it("setiap angka cocok dengan daftar di balik tautannya, juga setelah lewat alamat URL", () => {
    const semua = [...s.jenis, ...s.biayaBebas, ...s.biayaTetap, ...s.kampus, ...s.negara];
    expect(semua.length).toBeGreaterThan(10);
    for (const x of semua) {
      const lewatUrl = saringanDariUrl(Object.fromEntries(saringanKeUrl(x.angka.saringan)));
      expect(saring(contoh, lewatUrl).length, JSON.stringify(x.angka.saringan)).toBe(x.angka.jumlah);
    }
  });

  it("filter global ikut terbawa; jenis yang bertentangan menghasilkan 0", () => {
    const ringkasan = hitungRingkasan(contoh, pengaturanBawaan(), { statusAkhir: [], fakultas: ["FIP", "FT"] }, { jenis: "Bebas" });
    const sb = ringkasan.sebaran;
    expect(jml(sb.jenis, "Bebas")).toBe(4);
    expect(jml(sb.jenis, "Tetap")).toBe(0);
    expect(sb.biayaTetap.every((x) => x.angka.jumlah === 0)).toBe(true);
    expect(sb.biayaBebas[0].angka.saringan).toMatchObject({ jenis: "Bebas", biaya: "Beasiswa", sedangTb: true });
  });

  it("tanpa pengelompokan (baris tanpa kelompok) tidak membuat error", () => {
    const polos = contoh.map((b) => ({ input: b.input, hasil: b.hasil }));
    const hasil = hitungSebaran(polos, (t) => t);
    expect(hasil.kampus).toEqual([]);
    expect(hasil.totalTb).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// Dengan data asli (DATA_TB.xlsx)
// ---------------------------------------------------------------------------

describe.skipIf(!adaExcel)("Sebaran dari DATA_TB.xlsx dengan pembakuan bawaan", () => {
  let data: BarisExcel[];
  let hasil: ReturnType<typeof hitungSebaran>;

  beforeAll(async () => {
    const wb = await bacaExcel();
    data = bacaSheetDataTb(wb.getWorksheet("Data TB")!).data;
    const bawaan = susunPembakuan(PEMBAKUAN_BAWAAN);
    const input: InputPegawai[] = data.map((b, i) => ({
      urutan: i + 1,
      nama: b.nilai.nama as string,
      nip: b.nilai.nip as string,
      statusAkhir: b.nilai.statusAkhir as string,
      fakultas: b.nilai.fakultas as string,
      jenisPelaksanaan: b.nilai.jenisPelaksanaan as string,
      statusSk: b.nilai.statusSk as string,
      presensi: b.nilai.presensi as string,
      tmtTb: b.nilai.tmtTb as string,
      masaStudiSd: b.nilai.masaStudiSd as string,
      perpanjanganSd: b.nilai.perpanjanganSd as string,
      presensiTbSd: b.nilai.presensiTbSd as string,
      tanggalMasukTahap: b.nilai.tanggalMasukTahap as string,
    }));
    const h = hitungSemua(input, pengaturanBawaan(), "2026-10-07");
    const rows: BarisDihitung[] = input.map((x, i) => ({
      input: x,
      hasil: h[i],
      kelompok: kelompokkan(data[i].nilai.sumberBiaya as string, data[i].nilai.tempatStudi as string, bawaan),
    }));
    hasil = hitungSebaran(rows, (t) => t);
  });

  // Hanya orang Sedang TB yang masuk diagram; isian pegawai arsip (Sudah PK, Lulus, Rencana studi)
  // lebih berantakan dan tidak perlu dibakukan.
  const sedangTb = () => data.filter((b) => String(b.nilai.statusAkhir).toLowerCase() === "sedang tb");

  it("setiap tulisan Sumber biaya dan Tempat studi orang Sedang TB sudah punya padanan", () => {
    const biaya = new Set(PEMBAKUAN_BAWAAN.filter((p) => p.jenis === "BIAYA").map((p) => kunciTeks(p.asli)));
    const kampus = new Set(PEMBAKUAN_BAWAAN.filter((p) => p.jenis === "KAMPUS").map((p) => kunciTeks(p.asli)));
    const tanpa = (kolom: "sumberBiaya" | "tempatStudi", ada: Set<string>) =>
      [...new Set(sedangTb().map((b) => String(b.nilai[kolom] ?? "").trim()).filter((t) => t && !ada.has(kunciTeks(t))))];
    expect(tanpa("sumberBiaya", biaya)).toEqual([]);
    expect(tanpa("tempatStudi", kampus)).toEqual([]);
  });

  it("tidak ada isi bawaan yang menunjuk tulisan yang tidak dipakai orang Sedang TB", () => {
    const biayaDi = new Set(sedangTb().map((b) => kunciTeks(String(b.nilai.sumberBiaya ?? ""))));
    const kampusDi = new Set(sedangTb().map((b) => kunciTeks(String(b.nilai.tempatStudi ?? ""))));
    const yatim = PEMBAKUAN_BAWAAN.filter((p) => !(p.jenis === "BIAYA" ? biayaDi : kampusDi).has(kunciTeks(p.asli))).map((p) => p.asli);
    expect(yatim).toEqual([]);
  });

  it("Bebas vs Tetap: 160 dan 137 dari 297 orang Sedang TB", () => {
    expect(hasil.totalTb).toBe(297);
    expect(hasil.jenis.map((x) => x.angka.jumlah)).toEqual([160, 137]);
  });

  it("sumber biaya Bebas dan Tetap", () => {
    const per = (xs: typeof hasil.biayaBebas) => Object.fromEntries(xs.map((x) => [x.nama, x.angka.jumlah]));
    expect(per(hasil.biayaBebas)).toEqual({ Beasiswa: 148, Mandiri: 4, "Belum jelas": 8, "Belum dikelompokkan": 0 });
    expect(per(hasil.biayaTetap)).toEqual({ Beasiswa: 0, Mandiri: 131, "Belum jelas": 6, "Belum dikelompokkan": 0 });
  });

  it("kampus: jumlah semua kampus = 297, UM dan Brawijaya paling banyak", () => {
    expect(hasil.kampus.reduce((t, k) => t + k.angka.jumlah, 0)).toBe(297);
    expect(hasil.kampus.slice(0, 2).map((k) => [k.nama, k.angka.jumlah])).toEqual([
      ["Universitas Negeri Malang", 108],
      ["Universitas Brawijaya", 30],
    ]);
  });

  it("negara: setiap kampus luar negeri punya negara kecuali satu yang belum diketahui", () => {
    const tanpaNegara = hasil.kampus.filter((k) => !k.negara && k.nama !== KOSONG).map((k) => k.nama);
    expect(tanpaNegara).toEqual(["University of Science and Technology (UST)"]);
    expect(hasil.negara.reduce((t, n) => t + n.angka.jumlah, 0)).toBe(297);
  });
});

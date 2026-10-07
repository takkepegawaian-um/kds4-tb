// Tes rencana impor (tanpa database).
import { beforeAll, describe, expect, it } from "vitest";
import { bacaSheetDataTb, type BarisExcel } from "@/lib/excel/data-tb";
import { susunRencana, type DaftarPilihanImpor, type PegawaiTersimpan } from "@/lib/impor/rencana";
import { PILIHAN_BAWAAN, STATUS_SK_BAWAAN } from "@/lib/pengaturan/bawaan";
import { adaExcel, bacaExcel } from "./excel";

const pilihan = (k: string) => PILIHAN_BAWAAN.find((p) => p.kategori === k)!.nilai;
const DAFTAR: DaftarPilihanImpor = {
  statusAkhir: pilihan("STATUS_AKHIR"),
  fakultas: pilihan("FAKULTAS"),
  jenisPelaksanaan: pilihan("JENIS_PELAKSANAAN"),
  lokasi: pilihan("LOKASI"),
  kondisiKuliah: pilihan("KONDISI_KULIAH"),
  presensi: pilihan("PRESENSI"),
  jenjang: pilihan("JENJANG"),
  statusSk: STATUS_SK_BAWAAN.map((s) => s.statusSk),
};

/** Baris berkas buatan. */
function baris(no: number, ubah: Partial<BarisExcel["nilai"]> = {}, galat: string[] = []): BarisExcel {
  return {
    baris: no,
    galat,
    peringatan: [],
    hasilExcel: {} as BarisExcel["hasilExcel"],
    nilai: {
      no, nama: `Orang ${no}`, nip: `19900101202012${String(1000 + no)}`, statusAkhir: "Sedang TB", fakultas: "FT",
      departemen: null, jabatan: null, jenjang: "S3", jenisPelaksanaan: "Bebas", lokasi: "DN", sumberBiaya: null,
      tempatStudi: null, tmtTb: "2024-09-01", masaStudiSd: "2028-08-31", perpanjanganSd: null, statusSk: "TB Aktif",
      kondisiKuliah: null, noSk: null, linkSk: null, presensi: null, presensiTbSd: null, catatan: null, tanggalMasukTahap: null,
      ...ubah,
    },
  };
}

/** Simulasikan hasil impor: baris berkas -> data tersimpan. */
const simpan = (bs: BarisExcel[]): PegawaiTersimpan[] => bs.map((b, i) => ({ id: i + 1, urutan: b.baris, nilai: { ...b.nilai } }));

describe("rencana impor (data buatan)", () => {
  it("impor pertama: semua baris baru", () => {
    const r = susunRencana([baris(6), baris(7)], [], DAFTAR);
    expect(r.baru.map((b) => b.baris)).toEqual([6, 7]);
    expect([r.ubah.length, r.sama.length, r.gagal.length]).toEqual([0, 0, 0]);
  });

  it("impor ulang: perubahan per kolom terdeteksi, baris lain tetap", () => {
    const awal = [baris(6), baris(7), baris(8)];
    const r = susunRencana(
      [baris(6), baris(7, { statusSk: "TB Expired", nama: "Orang 7, M.Pd." }), baris(8, { no: 99 })],
      simpan(awal),
      DAFTAR,
    );
    expect(r.baru).toEqual([]);
    expect(r.sama.map((b) => b.baris)).toEqual([6, 8]); // kolom "No" diabaikan
    expect(r.ubah).toHaveLength(1);
    expect(r.ubah[0].perubahan).toEqual([
      { kolom: "nama", judul: "Nama", lama: "Orang 7", baru: "Orang 7, M.Pd." },
      { kolom: "statusSk", judul: "Status SK", lama: "TB Aktif", baru: "TB Expired" },
    ]);
  });

  it("orang di aplikasi yang tidak ada di berkas tidak diubah, hanya dihitung", () => {
    const r = susunRencana([baris(6)], simpan([baris(6), baris(7)]), DAFTAR);
    expect(r.tidakAdaDiBerkas).toBe(1);
  });

  it("baris gagal: nama/NIP/status kosong atau tanggal tidak terbaca", () => {
    const r = susunRencana(
      [baris(6, { nama: null }), baris(7, { nip: null, statusAkhir: null }), baris(8, {}, ["TMT TB: \"31-31-2024\" bukan tanggal"]), baris(9)],
      [],
      DAFTAR,
    );
    expect(r.gagal.map((g) => [g.baris, g.alasan])).toEqual([
      [6, ["Nama kosong"]],
      [7, ["NIP kosong", "Status akhir kosong"]],
      [8, ['TMT TB: "31-31-2024" bukan tanggal']],
    ]);
    expect(r.baru.map((b) => b.baris)).toEqual([9]);
  });

  it("nilai dropdown disamakan penulisannya; nilai asing diberi peringatan", () => {
    const r = susunRencana([baris(6, { presensi: "aktif", fakultas: "Pascasarjana" })], [], DAFTAR);
    expect(r.baru[0].nilai.presensi).toBe("AKTIF");
    expect(r.baru[0].peringatan).toEqual(['Fakultas "Pascasarjana" tidak ada di daftar pilihan']);
  });

  it("NIP kembar: diberi peringatan, tetap disimpan, dan dicocokkan lewat NIP + nama", () => {
    const nip = "199305052021011777";
    const awal = [baris(6, { nip, nama: "Andi Pratama" }), baris(7, { nip, nama: "Budi Santoso" })];
    const pertama = susunRencana(awal, [], DAFTAR);
    expect(pertama.baru).toHaveLength(2);
    expect(pertama.baru[0].peringatan).toContain("NIP kembar dengan baris 7 (Budi Santoso)");

    // impor ulang dengan urutan dibalik dan satu nama berubah tanda bacanya
    const ulang = susunRencana(
      [baris(10, { nip, nama: "Budi Santoso" }), baris(11, { nip, nama: "ANDI PRATAMA" })],
      simpan(awal),
      DAFTAR,
    );
    expect(ulang.baru).toEqual([]);
    expect(ulang.ubah.map((u) => [u.id, u.perubahan.map((p) => p.kolom)])).toEqual([[1, ["nama"]]]);
    expect(ulang.sama.map((s) => s.nama)).toEqual(["Budi Santoso"]);
  });

  it("NIP sama dengan orang lain di aplikasi tapi nama berbeda: jadi baris baru dengan peringatan", () => {
    const nip = "199001012020121001";
    const r = susunRencana(
      [baris(6, { nip, nama: "Ani" }), baris(7, { nip, nama: "Budi" })],
      simpan([baris(6, { nip, nama: "Ani" })]),
      DAFTAR,
    );
    expect(r.sama.map((s) => s.nama)).toEqual(["Ani"]);
    expect(r.baru.map((b) => b.nama)).toEqual(["Budi"]);
    expect(r.baru[0].peringatan).toContain("NIP sudah dipakai Ani di aplikasi");
  });

  it("NIP bukan 18 digit diberi peringatan", () => {
    const r = susunRencana([baris(6, { nip: "1234567890123" })], [], DAFTAR);
    expect(r.baru[0].peringatan).toContain("NIP berisi 13 karakter, seharusnya 18 digit angka");
  });
});

describe.skipIf(!adaExcel)("rencana impor DATA_TB.xlsx", () => {
  let data: BarisExcel[];
  beforeAll(async () => {
    data = bacaSheetDataTb((await bacaExcel()).getWorksheet("Data TB")!).data;
  });

  it("impor pertama: 491 baris baru, tidak ada yang gagal", () => {
    const r = susunRencana(data, [], DAFTAR);
    expect([r.baru.length, r.ubah.length, r.sama.length, r.gagal.length]).toEqual([491, 0, 0, 0]);
  });

  it("melaporkan 4 pasang NIP kembar dan 6 NIP yang bukan 18 digit", () => {
    const r = susunRencana(data, [], DAFTAR);
    const kembar = r.baru.filter((b) => b.peringatan.some((p) => p.startsWith("NIP kembar"))).map((b) => b.baris);
    expect(kembar).toEqual([183, 184, 257, 258, 262, 276, 295, 296]);
    const panjang = r.baru.filter((b) => b.peringatan.some((p) => p.startsWith("NIP berisi")));
    expect(panjang).toHaveLength(6);
  });

  it("impor ulang berkas yang sama: tidak ada yang berubah", () => {
    const pertama = susunRencana(data, [], DAFTAR);
    const tersimpan = pertama.baru.map((b, i) => ({ id: i + 1, urutan: b.baris, nilai: b.nilai }));
    const ulang = susunRencana(data, tersimpan, DAFTAR);
    expect([ulang.baru.length, ulang.ubah.length, ulang.sama.length, ulang.gagal.length, ulang.tidakAdaDiBerkas]).toEqual([0, 0, 491, 0, 0]);
  });
});

// Unit test mesin aturan hambatan dengan data buatan.
// Tidak membutuhkan DATA_TB.xlsx. Tanggal acuan semua tes: 07/10/2026 (Rabu).

import { describe, expect, it } from "vitest";
import { dariSeri, edate, keSeri, workday } from "@/lib/aturan/hari";
import { hitungSemua, type InputPegawai } from "@/lib/aturan/mesin";
import { pengaturanBawaan, type PengaturanAturan } from "@/lib/aturan/pengaturan";

const ACUAN = "2026-10-07";

/** Orang Sedang TB, Bebas, SK aktif, masa studi masih lama: tidak ada hambatan. */
function orang(ubah: Partial<InputPegawai> = {}): InputPegawai {
  return {
    urutan: 1,
    nama: "Contoh Pegawai",
    nip: "199001012020121001",
    statusAkhir: "Sedang TB",
    fakultas: "FT",
    jenisPelaksanaan: "Bebas",
    statusSk: "TB Aktif",
    presensi: null,
    tmtTb: "2024-09-01",
    masaStudiSd: "2028-08-31",
    perpanjanganSd: null,
    presensiTbSd: null,
    tanggalMasukTahap: null,
    ...ubah,
  };
}

function hitung(ubah: Partial<InputPegawai> = {}, p: PengaturanAturan = pengaturanBawaan(), acuan = ACUAN) {
  return hitungSemua([orang(ubah)], p, acuan)[0];
}

describe("hitungan tanggal ala Excel", () => {
  it("nomor seri sama dengan Excel", () => {
    expect(keSeri("1900-03-01")).toBe(61);
    expect(keSeri("2024-01-01")).toBe(45292);
    expect(dariSeri(45537)).toBe("2024-09-02"); // TMT TB baris 302 di Excel (tersimpan sebagai angka)
    expect(keSeri("2021-08-31") - keSeri("2026-10-07")).toBe(-1863); // Sisa hari baris 6 di Excel
  });

  it("EDATE memakai hari terakhir bulan bila tanggal tidak ada", () => {
    expect(dariSeri(edate(keSeri("2024-01-31"), 1))).toBe("2024-02-29");
    expect(dariSeri(edate(keSeri("2023-01-31"), 1))).toBe("2023-02-28");
    expect(dariSeri(edate(keSeri("2024-08-31"), -3))).toBe("2024-05-31");
    expect(dariSeri(edate(keSeri("2024-03-31"), -6))).toBe("2023-09-30");
    expect(dariSeri(edate(keSeri("2026-04-07"), 6))).toBe("2026-10-07");
  });

  it("WORKDAY melewati Sabtu, Minggu, dan hari libur", () => {
    expect(dariSeri(workday(keSeri("2026-10-12"), -1))).toBe("2026-10-09"); // Senin -> Jumat
    expect(dariSeri(workday(keSeri("2026-10-26"), -14))).toBe("2026-10-06");
    const libur = new Set([keSeri("2026-10-09")]);
    expect(dariSeri(workday(keSeri("2026-10-12"), -1, libur))).toBe("2026-10-08");
    expect(dariSeri(workday(keSeri("2026-10-09"), 1))).toBe("2026-10-12"); // Jumat -> Senin
  });
});

describe("kolom dasar", () => {
  it("orang tanpa hambatan: kode 0, Aman, tanpa peringkat", () => {
    const h = hitung();
    expect(h).toMatchObject({ kode: 0, skor: 0, level: "Aman", peringkat: null, tahap: "TB berjalan", skTerbit: "Ya", pihakPenahan: "Pegawai" });
    expect(h.hambatan).toBe("Tidak ada hambatan terdeteksi");
  });

  it("Akhir efektif = yang paling akhir dari Masa studi dan Perpanjangan", () => {
    expect(hitung({ perpanjanganSd: "2029-02-28" }).akhirEfektif).toBe("2029-02-28");
    expect(hitung({ perpanjanganSd: "2027-01-01" }).akhirEfektif).toBe("2028-08-31"); // MAX, bukan selalu perpanjangan
    expect(hitung({ masaStudiSd: null, perpanjanganSd: "2029-02-28" }).akhirEfektif).toBeNull(); // sama dengan Excel
  });

  it("Sisa hari = Akhir efektif - tanggal acuan", () => {
    expect(hitung({ masaStudiSd: "2026-10-17" }).sisaHari).toBe(10);
    expect(hitung({ masaStudiSd: "2026-10-01" }).sisaHari).toBe(-6);
  });

  it("orang selain Sedang TB selalu kode 0 tanpa level", () => {
    const h = hitung({ statusAkhir: "Lulus", masaStudiSd: "2020-01-01", presensi: "AKTIF" });
    expect(h).toMatchObject({ kode: 0, skor: 0, level: null, tahap: null, hambatan: null, peringkat: null, cekData: null });
    expect(h.sisaHari).toBeLessThan(0); // sisa hari tetap dihitung, seperti Excel
  });

  it("perbandingan teks tidak membedakan huruf besar/kecil (seperti Excel)", () => {
    expect(hitung({ statusAkhir: "sedang tb", presensi: "aktif", masaStudiSd: "2026-10-01" }).kode).toBe(1);
    expect(hitung({ statusSk: "tb aktif" }).tahap).toBe("TB berjalan");
  });
});

describe("kode hambatan", () => {
  it("1: presensi masih bebas padahal masa TB sudah berakhir", () => {
    const h = hitung({ presensi: "AKTIF", masaStudiSd: "2026-10-06" });
    expect(h).toMatchObject({ kode: 1, skor: 90, level: "Kritis" });
    // tepat di tanggal acuan belum dianggap berakhir
    expect(hitung({ presensi: "AKTIF", masaStudiSd: "2026-10-07" }).kode).not.toBe(1);
    // hanya untuk Bebas TriDharma: Tetap jatuh ke kode 4
    expect(hitung({ presensi: "AKTIF", masaStudiSd: "2026-10-06", jenisPelaksanaan: "Tetap" }).kode).toBe(4);
  });

  it("2: presensi NON AKTIF padahal SK TB masih berlaku", () => {
    expect(hitung({ presensi: "NON AKTIF" })).toMatchObject({ kode: 2, skor: 85, level: "Kritis" });
    expect(hitung({ presensi: "NON AKTIF", masaStudiSd: "2026-10-07" }).kode).toBe(2); // >= acuan
    expect(hitung({ presensi: "NON AKTIF", statusSk: "Usul TB" }).kode).not.toBe(2); // SK belum terbit
  });

  it("3: kuliah berjalan lebih dari 1 semester tanpa SK", () => {
    expect(hitung({ statusSk: "Usul TB", tmtTb: "2026-04-06" })).toMatchObject({ kode: 3, skor: 80, level: "Kritis" });
    // EDATE(TMT, 6) tepat = acuan: belum lewat, jadi kode 7
    expect(hitung({ statusSk: "Usul TB", tmtTb: "2026-04-07" }).kode).toBe(7);
    // Tetap: 80 - 40 = 40 -> Perhatian
    expect(hitung({ statusSk: "Usul TBBM", tmtTb: "2025-01-01", jenisPelaksanaan: "Tetap" })).toMatchObject({ kode: 3, skor: 40, level: "Perhatian" });
  });

  it("4: masa TB berakhir, belum ada perpanjangan atau pengaktifan", () => {
    expect(hitung({ masaStudiSd: "2026-10-06" })).toMatchObject({ kode: 4, skor: 75, level: "Waspada" });
    // sedang diusulkan pengaktifan -> kode 10, bukan 4
    expect(hitung({ masaStudiSd: "2026-10-06", statusSk: "Usul Pengaktifan" }).kode).toBe(10);
  });

  it("5: presensi ditandai TB lebih pendek dari masa TB", () => {
    expect(hitung({ presensiTbSd: "2026-12-31" })).toMatchObject({ kode: 5, skor: 70, level: "Waspada" }); // 85 hari lagi
    expect(hitung({ presensiTbSd: "2027-01-05" }).kode).toBe(5); // tepat 90 hari
    expect(hitung({ presensiTbSd: "2027-01-06" }).kode).toBe(0); // 91 hari
    // penandaan yang sudah lewat juga terhitung (sesuai rumus Excel)
    expect(hitung({ presensiTbSd: "2026-09-01" }).kode).toBe(5);
    // tidak berlaku bila penandaan sudah sampai akhir masa TB
    expect(hitung({ presensiTbSd: "2028-08-31", masaStudiSd: "2028-08-31" }).kode).toBe(0);
    expect(hitung({ presensiTbSd: "2026-12-31", jenisPelaksanaan: "Tetap" }).kode).toBe(0);
  });

  it("6: usul melewati batas 14 hari kerja sebelum kuliah", () => {
    expect(hitung({ statusSk: "Usul TB", tmtTb: "2026-10-26" })).toMatchObject({ kode: 6, skor: 65, level: "Waspada" });
    // WORKDAY(27/10/2026, -14) = 07/10/2026 = acuan: belum lewat
    expect(hitung({ statusSk: "Usul TB", tmtTb: "2026-10-27" }).kode).toBe(0);
    // dengan hari libur 20/10/2026, batasnya mundur sehari sehingga sudah lewat
    const p = { ...pengaturanBawaan(), hariLibur: ["2026-10-20"] };
    expect(hitung({ statusSk: "Usul TB", tmtTb: "2026-10-27" }, p).kode).toBe(6);
  });

  it("7: kuliah berjalan, SK belum terbit (dalam toleransi)", () => {
    const h = hitung({ statusSk: "Usul TBBM", tmtTb: "2026-09-01" });
    expect(h).toMatchObject({ kode: 7, skor: 60, level: "Waspada", hariKuliahTanpaSk: 36, skTerbit: "Belum", pihakPenahan: "Biro SDM / Kementerian" });
    expect(hitung({ statusSk: "Usul TBBM", tmtTb: "2026-10-07" }).kode).toBe(7); // mulai hari ini
  });

  it("8: tenggat usul perpanjangan (3 bulan sebelum berakhir) sudah lewat", () => {
    expect(hitung({ masaStudiSd: "2026-12-31" })).toMatchObject({ kode: 8, skor: 55, level: "Waspada" });
    // EDATE(07/01/2027, -3) = 07/10/2026 = acuan: belum lewat. Sisa 92 hari (> 90) -> tanpa hambatan
    expect(hitung({ masaStudiSd: "2027-01-07" }).kode).toBe(0);
    // EDATE(06/01/2027, -3) = 06/10/2026 < acuan: sudah lewat
    expect(hitung({ masaStudiSd: "2027-01-06" }).kode).toBe(8);
    // sudah ada perpanjangan -> bukan kode 8
    expect(hitung({ masaStudiSd: "2026-12-31", perpanjanganSd: "2027-12-31" }).kode).toBe(0);
  });

  it("9: tertahan di tahap yang sama melebihi batas hari", () => {
    const usul = { statusSk: "Usul TB", tmtTb: "2027-03-01" };
    expect(hitung({ ...usul, tanggalMasukTahap: "2026-09-01" })).toMatchObject({ kode: 9, skor: 50, level: "Perhatian", hariTertahan: 36 });
    expect(hitung({ ...usul, tanggalMasukTahap: "2026-09-07" }).kode).toBe(0); // tepat 30 hari
    // tahap "TB berjalan" tidak dihitung tertahan
    expect(hitung({ tanggalMasukTahap: "2026-01-01" }).kode).toBe(0);
  });

  it("10: masa TB segera berakhir atau menunggu pengaktifan", () => {
    expect(hitung({ masaStudiSd: "2026-06-30", perpanjanganSd: "2026-12-31" })).toMatchObject({ kode: 10, skor: 45, level: "Perhatian" });
    expect(hitung({ statusSk: "Usul Pengaktifan" })).toMatchObject({ kode: 10, tahap: "Usul pengaktifan kembali" });
  });

  it("11: status SK belum dicatat", () => {
    const h = hitung({ statusSk: null });
    expect(h).toMatchObject({ kode: 11, skor: 35, level: "Perhatian", tahap: "Belum dicatat", pihakPenahan: "Unit UM", skTerbit: "?" });
    expect(hitung({ statusSk: "Status asing" }).kode).toBe(11); // tidak dikenal = belum dicatat
  });

  it("12: tanggal TMT atau masa studi kosong", () => {
    const h = hitung({ masaStudiSd: null });
    expect(h).toMatchObject({ kode: 12, skor: 30, level: "Perhatian", akhirEfektif: null, sisaHari: null });
    expect(h.cekData).toBe("TMT atau masa studi kosong.");
  });

  it("kode dengan nomor lebih kecil menang bila beberapa syarat terpenuhi", () => {
    // memenuhi kode 1 dan 4 sekaligus
    expect(hitung({ presensi: "AKTIF", masaStudiSd: "2026-10-01" }).kode).toBe(1);
    // memenuhi kode 8 dan 10 sekaligus
    expect(hitung({ masaStudiSd: "2026-11-30" }).kode).toBe(8);
  });
});

describe("skor, level, dan pengaturan", () => {
  it("pengurang Tetap TriDharma tidak membuat skor di bawah 1", () => {
    const p = { ...pengaturanBawaan(), pengurangSkorTetap: 100 };
    expect(hitung({ statusSk: null, jenisPelaksanaan: "Tetap" }, p)).toMatchObject({ kode: 11, skor: 1, level: "Perhatian" });
  });

  it("skor dasar, batas level, dan ambang hari diambil dari Pengaturan", () => {
    const p = pengaturanBawaan();
    p.aturan = p.aturan.map((a) => (a.kode === 11 ? { ...a, skorDasar: 60 } : a));
    expect(hitung({ statusSk: null }, p)).toMatchObject({ skor: 60, level: "Waspada" });
    expect(hitung({ statusSk: null }, { ...pengaturanBawaan(), batasWaspada: 30 }).level).toBe("Waspada");
    expect(hitung({ presensiTbSd: "2027-01-06" }, { ...pengaturanBawaan(), ambangPresensiHari: 91 }).kode).toBe(5);
  });

  it("kode yang dinonaktifkan dilewati", () => {
    const p = pengaturanBawaan();
    p.aturan = p.aturan.map((a) => (a.kode === 1 ? { ...a, aktif: false } : a));
    expect(hitung({ presensi: "AKTIF", masaStudiSd: "2026-10-06" }, p).kode).toBe(4);
  });

  it("saran tindakan ikut dari tabel aturan", () => {
    expect(hitung({ statusSk: null }).saran).toBe('Lengkapi kolom "Status SK" di Data TB.');
  });
});

describe("peringkat", () => {
  it("urut skor menurun; skor sama dipecah menurut urutan baris; tanpa hambatan tidak berperingkat", () => {
    const data = [
      orang({ urutan: 1, statusSk: null }), // 35
      orang({ urutan: 2, presensi: "AKTIF", masaStudiSd: "2026-10-01" }), // 90
      orang({ urutan: 3 }), // 0
      orang({ urutan: 4, statusSk: null }), // 35
      orang({ urutan: 5, statusAkhir: "Lulus" }), // bukan Sedang TB
      orang({ urutan: 6, masaStudiSd: "2026-10-01" }), // 75
    ];
    expect(hitungSemua(data, pengaturanBawaan(), ACUAN).map((h) => h.peringkat)).toEqual([3, 1, null, 4, null, 2]);
  });

  it("urutan baris, bukan urutan di daftar, yang menentukan", () => {
    const data = [orang({ urutan: 9, statusSk: null }), orang({ urutan: 2, statusSk: null })];
    expect(hitungSemua(data, pengaturanBawaan(), ACUAN).map((h) => h.peringkat)).toEqual([2, 1]);
  });
});

describe("cek data", () => {
  it("NIP kembar dibandingkan utuh 18 digit, termasuk dengan orang arsip", () => {
    const data = [
      orang({ urutan: 1, nip: "199202022020122001" }),
      orang({ urutan: 2, nip: "199202022020122002", statusAkhir: "Lulus" }), // 15 digit pertama sama: BUKAN kembar
      orang({ urutan: 3, nip: "199901012020121001" }),
      orang({ urutan: 4, nip: "199901012020121001", statusAkhir: "Sudah PK" }), // kembar persis
    ];
    const h = hitungSemua(data, pengaturanBawaan(), ACUAN);
    expect(h.map((x) => x.cekData)).toEqual([null, null, "NIP kembar.", null]); // arsip tidak diberi Cek data
  });

  it("menggabungkan semua catatan seperti Excel", () => {
    const h = hitung({ masaStudiSd: null, presensi: "MISTERY??", jenisPelaksanaan: null, fakultas: null });
    expect(h.cekData).toBe("TMT atau masa studi kosong. Status presensi tidak jelas. Jenis pelaksanaan kosong. Fakultas kosong.");
  });

  it("NIP yang bukan 18 digit diberi peringatan, tidak ditolak", () => {
    expect(hitung({ nip: "1234567890123" }).peringatan).toEqual(["NIP berisi 13 karakter, seharusnya 18 digit angka."]);
    expect(hitung().peringatan).toEqual([]);
  });
});

// Tes pemeriksaan isian form Data TB.
import { describe, expect, it } from "vitest";
import { periksaIsian, type DaftarPilihanForm } from "@/lib/data/formulir";
import { PILIHAN_BAWAAN, STATUS_SK_BAWAAN } from "@/lib/pengaturan/bawaan";

const DAFTAR = {
  ...Object.fromEntries(PILIHAN_BAWAAN.map((p) => [p.kategori, p.nilai])),
  STATUS_SK: STATUS_SK_BAWAAN.map((s) => s.statusSk),
} as DaftarPilihanForm;

const lengkap = {
  nama: "  Contoh   Pegawai, M.Pd. ",
  nip: "199001012020121001",
  statusAkhir: "Sedang TB",
  fakultas: "FT",
  jenisPelaksanaan: "Bebas",
  tmtTb: "01/09/2024",
  masaStudiSd: "31/08/2028",
  statusSk: "TB Aktif",
  presensi: "aktif",
};

describe("periksa isian form", () => {
  it("isian lengkap: tanpa galat dan tanpa peringatan; teks dan pilihan dirapikan", () => {
    const h = periksaIsian(lengkap, DAFTAR);
    expect(h.galat).toEqual({});
    expect(h.peringatan).toEqual([]);
    expect(h.nilai).toMatchObject({ nama: "Contoh Pegawai, M.Pd.", tmtTb: "2024-09-01", masaStudiSd: "2028-08-31", presensi: "AKTIF", perpanjanganSd: null });
  });

  it("nama, NIP, dan status akhir wajib", () => {
    const h = periksaIsian({}, DAFTAR);
    expect(Object.keys(h.galat).sort()).toEqual(["nama", "nip", "statusAkhir"]);
  });

  it("tanggal harus dd/mm/yyyy dan benar-benar ada", () => {
    expect(periksaIsian({ ...lengkap, tmtTb: "31/02/2025" }, DAFTAR).galat.tmtTb).toMatch(/dd\/mm\/yyyy/);
    expect(periksaIsian({ ...lengkap, tmtTb: "2025-13-01" }, DAFTAR).galat.tmtTb).toBeDefined();
    expect(periksaIsian({ ...lengkap, tmtTb: "1/9/2024" }, DAFTAR).nilai.tmtTb).toBe("2024-09-01");
  });

  it("nilai pilihan harus dari daftar, kecuali nilai lama yang dipertahankan", () => {
    expect(periksaIsian({ ...lengkap, fakultas: "Pascasarjana" }, DAFTAR).galat.fakultas).toBe("Pilih salah satu dari daftar.");
    const lama = periksaIsian({ ...lengkap, jenjang: "III/c" }, DAFTAR, { jenjang: "III/c" });
    expect(lama.galat).toEqual({});
    expect(lama.nilai.jenjang).toBe("III/c");
    expect(lama.peringatan).toContain('Jenjang "III/c" tidak ada di daftar pilihan.');
  });

  it("NIP bukan 18 digit dan NIP kembar hanya peringatan", () => {
    const h = periksaIsian({ ...lengkap, nip: "1234" }, DAFTAR, {}, [{ nama: "Orang Lain", statusAkhir: "Lulus" }]);
    expect(h.galat).toEqual({});
    expect(h.peringatan).toEqual([
      "NIP berisi 4 karakter, seharusnya 18 digit angka.",
      "NIP kembar: sudah dipakai Orang Lain (Lulus).",
    ]);
  });

  it("kelengkapan Sedang TB seperti kolom Cek data", () => {
    const h = periksaIsian({ nama: "A", nip: "199001012020121001", statusAkhir: "Sedang TB", presensi: "MISTERY??" }, DAFTAR);
    expect(h.peringatan).toEqual([
      "Jenis pelaksanaan kosong.",
      "Fakultas kosong.",
      "Masa studi s.d. kosong: hambatan dihitung sebagai kode 12.",
      "TMT TB kosong.",
      "Status SK kosong: hambatan dihitung sebagai kode 11.",
      "Status presensi tidak jelas.",
    ]);
    // orang arsip tidak diperiksa kelengkapannya
    expect(periksaIsian({ nama: "A", nip: "199001012020121001", statusAkhir: "Lulus" }, DAFTAR).peringatan).toEqual([]);
  });

  it("urutan tanggal yang janggal diberi peringatan", () => {
    const h = periksaIsian({ ...lengkap, masaStudiSd: "01/01/2024", perpanjanganSd: "01/01/2023" }, DAFTAR);
    expect(h.peringatan).toEqual([
      "Masa studi s.d. lebih awal dari TMT TB.",
      "Perpanjangan s.d. tidak lebih akhir dari Masa studi s.d.; yang dipakai tetap tanggal paling akhir.",
    ]);
  });
});

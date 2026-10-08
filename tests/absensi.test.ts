import { describe, expect, it } from "vitest";
import { bacaAbsensi, labelAbsensi } from "@/lib/aturan/label-absensi";
import { susunRencana } from "@/lib/impor/rencana";
import type { BarisExcel } from "@/lib/excel/data-tb";

describe("label status absensi", () => {
  it("nilai tersimpan ditampilkan dengan tulisan yang jelas", () => {
    expect(labelAbsensi("AKTIF")).toBe("Ditandai TB");
    expect(labelAbsensi("NON AKTIF")).toBe("Tidak ditandai TB (absen sendiri)");
    expect(labelAbsensi("aktif")).toBe("Ditandai TB");
    expect(labelAbsensi(null)).toBe("");
    expect(labelAbsensi("lain")).toBe("lain"); // nilai tak dikenal tampil apa adanya
  });

  it("nilai asli maupun tulisan di layar dikenali (untuk impor berkas hasil ekspor)", () => {
    expect(bacaAbsensi("AKTIF")).toBe("AKTIF");
    expect(bacaAbsensi("Ditandai TB")).toBe("AKTIF");
    expect(bacaAbsensi("tidak ditandai tb (absen sendiri)")).toBe("NON AKTIF");
    expect(bacaAbsensi("NON AKTIF")).toBe("NON AKTIF");
    expect(bacaAbsensi("MISTERY??")).toBeNull();
    expect(bacaAbsensi("")).toBeNull();
  });

  it("impor: tulisan baru diubah ke nilai tersimpan; MISTERY?? diberi peringatan", () => {
    const baris = (no: number, presensi: string): BarisExcel => ({
      baris: no, galat: [], peringatan: [], hasilExcel: {} as BarisExcel["hasilExcel"],
      nilai: { no, nama: `Orang ${no}`, nip: `19900101202012${1000 + no}`, statusAkhir: "Sedang TB", fakultas: null, departemen: null, jabatan: null, jenjang: null, jenisPelaksanaan: "Bebas", lokasi: null, sumberBiaya: null, tempatStudi: null, tmtTb: null, masaStudiSd: null, perpanjanganSd: null, statusSk: null, kondisiKuliah: null, noSk: null, linkSk: null, presensi, presensiTbSd: null, catatan: null, tanggalMasukTahap: null },
    });
    const r = susunRencana([baris(6, "Ditandai TB"), baris(7, "Tidak ditandai TB (absen sendiri)"), baris(8, "AKTIF"), baris(9, "MISTERY??")], [], { presensi: ["AKTIF", "NON AKTIF"] });
    expect(r.baru.map((b) => b.nilai.presensi)).toEqual(["AKTIF", "NON AKTIF", "AKTIF", "MISTERY??"]);
    expect(r.baru[3].peringatan).toEqual(['Status absensi "MISTERY??" tidak ada di daftar pilihan']);
    expect(r.baru.slice(0, 3).every((b) => b.peringatan.length === 0)).toBe(true);
  });
});

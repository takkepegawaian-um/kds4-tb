import { describe, expect, it } from "vitest";
import { ATURAN_HAMBATAN_BAWAAN, PARAMETER_BAWAAN, STATUS_SK_BAWAAN } from "@/lib/pengaturan/bawaan";
import { periksaAturan, periksaNilaiPilihan, periksaParameter, periksaStatusSk } from "@/lib/pengaturan/validasi";

const DEF = Object.fromEntries(PARAMETER_BAWAAN.map((p) => [p.kunci, p.tipe]));
const ISIAN = Object.fromEntries(PARAMETER_BAWAAN.map((p) => [p.kunci, p.nilai]));

describe("periksa parameter", () => {
  it("nilai bawaan Excel lolos", () => {
    expect(periksaParameter(ISIAN, DEF).galat).toEqual({});
  });
  it("angka harus bulat dan dalam rentang", () => {
    const g = periksaParameter({ ...ISIAN, toleransiUsulBulan: "6,5", ambangMasaTbHari: "-1", pengurangSkorTetap: "200" }, DEF).galat;
    expect(Object.keys(g).sort()).toEqual(["ambangMasaTbHari", "pengurangSkorTetap", "toleransiUsulBulan"]);
  });
  it("batas Waspada harus di bawah batas Kritis", () => {
    expect(periksaParameter({ ...ISIAN, batasWaspada: "80" }, DEF).galat).toEqual({ batasWaspada: "Batas Waspada harus lebih kecil dari batas Kritis." });
  });
  it("tanggal acuan boleh kosong; bila diisi harus dd/mm/yyyy dan disimpan yyyy-mm-dd", () => {
    expect(periksaParameter({ ...ISIAN, tanggalAcuan: "" }, DEF).nilai.tanggalAcuan).toBe("");
    expect(periksaParameter({ ...ISIAN, tanggalAcuan: "15/10/2026" }, DEF).nilai.tanggalAcuan).toBe("2026-10-15");
    expect(periksaParameter({ ...ISIAN, tanggalAcuan: "32/10/2026" }, DEF).galat.tanggalAcuan).toBeDefined();
  });
  it("teks wajib diisi", () => {
    expect(periksaParameter({ ...ISIAN, tahapStatusKosong: " " }, DEF).galat.tahapStatusKosong).toBe("Wajib diisi.");
  });
});

describe("periksa aturan hambatan", () => {
  const bawaan = ATURAN_HAMBATAN_BAWAAN.map((a) => ({ ...a, aktif: true }));
  it("nilai bawaan lolos", () => {
    expect(periksaAturan(bawaan).galat).toEqual({});
  });
  it("skor 1-100, nama dan saran wajib; kode 0 tetap skor 0 dan aktif", () => {
    const ubah = bawaan.map((a) =>
      a.kode === 3 ? { ...a, skorDasar: 120 } : a.kode === 5 ? { ...a, nama: "", saran: "" } : a.kode === 0 ? { ...a, skorDasar: 50, aktif: false } : a,
    );
    const { galat, nilai } = periksaAturan(ubah);
    expect(Object.keys(galat).sort()).toEqual(["3.skorDasar", "5.nama", "5.saran"]);
    expect(nilai[0]).toMatchObject({ kode: 0, skorDasar: 0, aktif: true });
  });
});

describe("periksa pemetaan Status SK", () => {
  it("nilai bawaan lolos", () => {
    expect(periksaStatusSk(STATUS_SK_BAWAAN).galat).toEqual({});
  });
  it("Status SK kembar, Ya/Belum, dan kolom kosong ditolak", () => {
    const g = periksaStatusSk([...STATUS_SK_BAWAAN, { statusSk: "tb aktif", tahap: "", pihakPenahan: "X", skTerbit: "Mungkin" }]).galat;
    expect(g).toMatchObject({ "7.statusSk": "Status SK ini sudah ada.", "7.tahap": "Wajib diisi.", "7.skTerbit": "Pilih Ya atau Belum." });
  });
  it('"Usul Pengaktifan" dan tahap "TB berjalan" wajib ada (dipakai aturan)', () => {
    expect(periksaStatusSk(STATUS_SK_BAWAAN.filter((s) => s.statusSk !== "Usul Pengaktifan")).galat.umum).toMatch(/Usul Pengaktifan/);
    expect(periksaStatusSk(STATUS_SK_BAWAAN.map((s) => ({ ...s, tahap: s.tahap === "TB berjalan" ? "Berjalan" : s.tahap }))).galat.umum).toMatch(/TB berjalan/);
  });
});

describe("periksa nilai daftar pilihan", () => {
  it("wajib, maksimal 100 karakter, tidak kembar", () => {
    expect(periksaNilaiPilihan("", [])).toBe("Nilai wajib diisi.");
    expect(periksaNilaiPilihan("fip", ["FIP"])).toBe("Nilai ini sudah ada di daftar.");
    expect(periksaNilaiPilihan("Pascasarjana", ["FIP"])).toBeNull();
  });
});

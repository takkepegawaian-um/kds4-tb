// Tes pembuat SK: format isian, pemeriksaan formulir, dan templat Word.
// Semua data di sini fiktif.

import PizZip from "pizzip";
import { describe, expect, it } from "vitest";
import { bacaTemplat, isiTemplat, penandaTemplat } from "@/lib/sk/buat";
import { siapkanData } from "@/lib/sk/data";
import {
  angkaTerbilang,
  fakultasLengkap,
  jenjangDariData,
  lamaStudi,
  namaJudul,
  tambahHari,
  tanggalIndonesia,
  terbilang,
} from "@/lib/sk/format";
import { JENIS_SK, cariJenisSk, type JenisSk } from "@/lib/sk/jenis";

describe("format", () => {
  it("tanggal Indonesia", () => {
    expect(tanggalIndonesia("2026-09-10")).toBe("10 September 2026");
    expect(tanggalIndonesia("2027-01-02")).toBe("2 Januari 2027");
    expect(tanggalIndonesia("2026-02-30")).toBe("");
    expect(tanggalIndonesia(null)).toBe("");
  });

  it("tambah hari melewati pergantian bulan dan tahun", () => {
    expect(tambahHari("2026-12-31", 1)).toBe("2027-01-01");
    expect(tambahHari("2028-02-28", 1)).toBe("2028-02-29");
    expect(tambahHari("bukan", 1)).toBe("");
  });

  it("terbilang", () => {
    expect(terbilang(0)).toBe("nol");
    expect(terbilang(7)).toBe("tujuh");
    expect(terbilang(11)).toBe("sebelas");
    expect(terbilang(15)).toBe("lima belas");
    expect(terbilang(16)).toBe("enam belas");
    expect(terbilang(21)).toBe("dua puluh satu");
    expect(terbilang(100)).toBe("seratus");
    expect(terbilang(101)).toBe("seratus satu");
    expect(terbilang(375_000)).toBe("tiga ratus tujuh puluh lima ribu");
    expect(terbilang(1000)).toBe("seribu");
    expect(terbilang(2024)).toBe("dua ribu dua puluh empat");
    expect(terbilang(1_250_000)).toBe("satu juta dua ratus lima puluh ribu");
    expect(terbilang(-1)).toBe("");
    expect(angkaTerbilang(3)).toBe("3 (tiga)");
    expect(angkaTerbilang(15)).toBe("15 (lima belas)");
  });

  it("lama studi ditulis seperti pada SK", () => {
    expect(lamaStudi("2026-08-24", "2029-08-23")).toBe("3 (tiga) tahun");
    expect(lamaStudi("2026-09-01", "2029-08-31")).toBe("3 (tiga) tahun");
    expect(lamaStudi("2027-01-12", "2028-01-12")).toBe("1 (satu) tahun");
    expect(lamaStudi("2026-09-01", "2028-02-29")).toBe("1 (satu) tahun 6 (enam) bulan");
    expect(lamaStudi("2026-09-01", "2027-02-28")).toBe("6 (enam) bulan");
    expect(lamaStudi("2026-09-01", "2026-08-01")).toBe("");
    expect(lamaStudi("", "2026-08-01")).toBe("");
  });

  it("nama pada judul: bagian sebelum koma pertama dikapitalkan, gelar tetap", () => {
    expect(namaJudul("Fulan Contoh, S.E., M.S.A., CSRS")).toBe("FULAN CONTOH, S.E., M.S.A., CSRS");
    expect(namaJudul("Fulan Contoh, S.Pd., M.Pd.")).toBe("FULAN CONTOH, S.Pd., M.Pd.");
    expect(namaJudul("Fulan Contoh")).toBe("FULAN CONTOH");
  });

  it("fakultas dan jenjang dari Data TB", () => {
    expect(fakultasLengkap("FEB")).toBe("Fakultas Ekonomi dan Bisnis");
    expect(fakultasLengkap("fpsi")).toBe("Fakultas Psikologi");
    expect(fakultasLengkap("Fakultas Lain")).toBe("Fakultas Lain");
    expect(fakultasLengkap(null)).toBe("");
    expect(jenjangDariData("S3")).toBe("Doktor (S3)");
    expect(jenjangDariData("PPDS SP-1")).toBe("Spesialis (PPDS SP-1)");
    expect(jenjangDariData("III/c")).toBe("");
  });
});

// ---------------------------------------------------------------------------

/** Isian formulir fiktif yang lengkap untuk sebuah jenis SK. */
function isianLengkap(j: JenisSk): Record<string, string> {
  const hasil: Record<string, string> = {};
  for (const f of j.isian) {
    if (f.tipe === "tanggal") hasil[f.kunci] = "05/03/2027";
    else if (f.tipe === "pilihan") hasil[f.kunci] = f.kunci === "fakultas" ? "Fakultas Teknik" : (f.pilihan?.[0] ?? "");
    else hasil[f.kunci] = `isian-${f.kunci}`;
  }
  hasil.nama = "Fulan Contoh, S.Pd., M.Pd.";
  hasil.nip = "199001012020011001";
  hasil.nomor = "5.3.77/UN32/KP/2027";
  hasil.tanggalPenetapan = "10/03/2027";
  if ("tmt" in hasil) hasil.tmt = "01/09/2026";
  if ("akhir" in hasil) hasil.akhir = "31/08/2029";
  if ("akhirSebelumnya" in hasil) {
    hasil.akhirSebelumnya = "31/08/2026";
    hasil.tmt = "";
    hasil.akhir = "31/08/2027";
  }
  return hasil;
}

const teksDokumen = (docx: Buffer) =>
  new PizZip(docx)
    .file(/^word\/(document|header\d*)\.xml$/)
    .map((f) => f.asText().replace(/<w:tab\/>/g, " ").replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, ""))
    .join("\n")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

describe("siapkanData", () => {
  const rektor = cariJenisSk("tb-beasiswa")!;

  it("menolak isian wajib yang kosong dan tanggal yang salah", () => {
    const h = siapkanData(rektor, { nip: "1", tmt: "31/02/2026" }, "2026-10-12");
    expect(h.ok).toBe(false);
    if (!h.ok) {
      expect(h.galat.nama).toBe("Wajib diisi");
      expect(h.galat.tmt).toContain("dd/mm/yyyy");
      expect(h.galat.programStudi).toBe("Wajib diisi");
    }
  });

  it("menolak pilihan yang tidak dikenal", () => {
    const h = siapkanData(rektor, { ...isianLengkap(rektor), statusDosen: "Bukan" }, "2026-10-12");
    expect(h.ok).toBe(false);
    if (!h.ok) expect(h.galat.statusDosen).toBeDefined();
  });

  it("isian turunan: nama judul, lama studi, tanggal Indonesia, fakultas kapital", () => {
    const h = siapkanData(rektor, isianLengkap(rektor), "2026-10-12");
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.tag.namaJudul).toBe("FULAN CONTOH, S.Pd., M.Pd.");
    expect(h.tag.lamaStudi).toBe("3 (tiga) tahun");
    expect(h.tag.tmt).toBe("1 September 2026");
    expect(h.tag.akhir).toBe("31 Agustus 2029");
    expect(h.tag.tanggalPenetapan).toBe("10 Maret 2027");
    expect(h.tag.FAKULTAS).toBe("FAKULTAS TEKNIK");
    expect(h.tag.STATUS_DOSEN).toBe("DOSEN TETAP");
    expect(h.tag.jenjangNama).toBe("Doktor");
    expect(h.tag.jenjangKode).toBe("S3");
  });

  it("yang tidak diisi ditulis titik-titik", () => {
    const h = siapkanData(rektor, { nama: "A", nip: "1", programStudi: "P", tempatStudi: "T", tmt: "01/09/2026", akhir: "31/08/2029", sumberBiayaUraian: "B" }, "2026-10-12");
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.tag.pangkatGolongan).toBe("……");
    expect(h.tag.suratUsulNomor).toBe("……");
    expect(h.tag.statusDosen).toBe("Dosen Tetap"); // pilihan punya nilai bawaan
  });

  it("nomor SK kosong mengikuti pola contoh dengan nomor urut dikosongkan", () => {
    const sedang = cariJenisSk("hukdis-sedang")!;
    const dasar = { nama: "A", nip: "1", rincianHukuman: "x" };
    const a = siapkanData(sedang, { ...dasar, tanggalPenetapan: "25/05/2026" }, "2026-10-12");
    if (a.ok) expect(a.tag.nomor).toBe("25.5.      /UN32/KP/2026");
    const b = siapkanData(sedang, { ...dasar, nomor: "25.5.232/UN32/KP/2026" }, "2026-10-12");
    if (b.ok) expect(b.tag.nomor).toBe("25.5.232/UN32/KP/2026");
    const c = siapkanData(sedang, dasar, "2026-10-12");
    if (c.ok) expect(c.tag.nomor).toBe("……      /UN32/KP/2026");
    const ringan = siapkanData(cariJenisSk("hukdis-ringan")!, { nama: "A", nip: "1", hukuman: "Teguran Tertulis" }, "2026-10-12");
    if (ringan.ok) expect(ringan.tag.nomor).toBe("……  /UN32…../KP/2026");
  });

  it("perpanjangan: tanggal mulai dihitung sehari setelah masa TB sebelumnya", () => {
    const j = cariJenisSk("perpanjangan-tb")!;
    const h = siapkanData(j, isianLengkap(j), "2026-10-12");
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.tag.tmt).toBe("1 September 2026");
    expect(h.tag.akhir).toBe("31 Agustus 2027");
    expect(h.tag.lamaStudi).toBe("1 (satu) tahun");
  });
});

// ---------------------------------------------------------------------------

describe.each(JENIS_SK.map((j) => [j.id, j] as const))("templat %s", (_id, jenis) => {
  it("semua penanda di templat punya isian", async () => {
    const h = siapkanData(jenis, isianLengkap(jenis), "2026-10-12");
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    const penanda = penandaTemplat(await bacaTemplat(jenis));
    expect(penanda.length).toBeGreaterThan(5);
    const tanpaIsian = penanda.filter((p) => !(p in h.tag));
    expect(tanpaIsian).toEqual([]);
  });

  it("hasil bersih: semua isian terpakai, tidak ada penanda tersisa", async () => {
    const isian = isianLengkap(jenis);
    const h = siapkanData(jenis, isian, "2026-10-12");
    if (!h.ok) throw new Error(JSON.stringify(h.galat));
    const docx = isiTemplat(await bacaTemplat(jenis), h.tag);
    const teks = teksDokumen(docx);
    expect(teks).not.toMatch(/[{}]/);
    expect(teks).not.toContain("undefined");
    expect(teks).not.toContain("…"); // semua terisi, termasuk nomor dan tanggal
    expect(teks).toContain("Fulan Contoh, S.Pd., M.Pd.");
    expect(teks).toContain("FULAN CONTOH, S.Pd., M.Pd.");
    expect(teks).toContain("199001012020011001");
    expect(teks).toContain("5.3.77/UN32/KP/2027");
    expect(teks).toContain("10 Maret 2027");
    // setiap isian teks yang diketik muncul di dokumen (kecuali yang hanya dipakai sebagai bahan hitung)
    const bahan = new Set(["jenjang", "tmt", "akhir", "akhirSebelumnya", "nomor", "tanggalPenetapan", "statusDosen", "hukuman", "fakultas", "sapaan"]);
    for (const f of jenis.isian.filter((x) => (x.tipe === "teks" || x.tipe === "teksPanjang") && !bahan.has(x.kunci))) {
      expect(teks, `isian ${f.kunci}`).toContain(isian[f.kunci]);
    }
  });

  it("isian kosong menjadi titik-titik dan dokumen tetap sah", async () => {
    const wajib = Object.fromEntries(jenis.isian.filter((f) => f.wajib).map((f) => [f.kunci, f.tipe === "tanggal" ? "01/01/2027" : "x"]));
    const pilihanWajib = Object.fromEntries(jenis.isian.filter((f) => f.wajib && f.tipe === "pilihan").map((f) => [f.kunci, f.pilihan![0]]));
    const h = siapkanData(jenis, { ...wajib, ...pilihanWajib }, "2026-10-12");
    if (!h.ok) throw new Error(JSON.stringify(h.galat));
    const docx = isiTemplat(await bacaTemplat(jenis), h.tag);
    expect(teksDokumen(docx)).toContain("……");
    expect(() => new PizZip(docx)).not.toThrow();
  });

  it("metadata dokumen tidak memuat nama atau email pembuat contoh", async () => {
    const zip = new PizZip(await bacaTemplat(jenis));
    const core = zip.file("docProps/core.xml")?.asText() ?? "";
    expect(core).not.toContain("@");
    expect(core).toContain("<dc:creator>KDS4</dc:creator>");
    expect(core).toContain("<cp:lastModifiedBy>KDS4</cp:lastModifiedBy>");
  });

  it("templat tidak memuat sorotan atau huruf merah penanda isian", async () => {
    const xml = new PizZip(await bacaTemplat(jenis)).file("word/document.xml")!.asText();
    expect(xml).not.toContain("<w:highlight");
    expect(xml).not.toMatch(/w:color w:val="(FF0000|EE0000|C00000)"/);
  });

  it("templat tidak memuat data pribadi sisa contoh (NIP 15 digit lebih, tanggal lahir)", async () => {
    const teks = teksDokumen(await bacaTemplat(jenis));
    expect(teks).not.toMatch(/\d{15,}/);
    expect(teks).not.toMatch(/\d{1,2} (Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember) 19\d\d/);
    expect(teks).not.toContain("MERGEFIELD");
  });
});

describe("isi templat aman terhadap karakter khusus", () => {
  it("& < > \" tidak merusak dokumen", async () => {
    const j = cariJenisSk("hukdis-sedang")!;
    const h = siapkanData(j, { nama: "A & B <C>", nip: "1", rincianHukuman: 'potongan "40%" & lain-lain' }, "2026-10-12");
    if (!h.ok) throw new Error(JSON.stringify(h.galat));
    const docx = isiTemplat(await bacaTemplat(j), h.tag);
    expect(teksDokumen(docx)).toContain('potongan "40%" & lain-lain');
    expect(teksDokumen(docx)).toContain("A & B <C>");
  });
});

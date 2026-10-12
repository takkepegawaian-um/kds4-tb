// Memeriksa isian formulir SK dan menyusunnya menjadi isian templat ({nama}, {tmt}, dst.).
// Fungsi murni: tidak membaca database, jadi mudah diuji.

import { bacaTanggal } from "@/lib/excel/data-tb";
import { ISIAN_KOSONG, JENJANG, bagianTanggal, lamaStudi, namaJudul, tambahHari, tanggalIndonesia } from "./format";
import type { JenisSk } from "./jenis";

export type Galat = Record<string, string>;
export type HasilSiapkan = { ok: true; tag: Record<string, string> } | { ok: false; galat: Galat };

const BATAS_PANJANG = 2000;

/** Isian formulir (teks apa adanya) -> pemeriksaan -> isian templat. */
export function siapkanData(jenis: JenisSk, mentah: Record<string, string | undefined>, hariIni: string): HasilSiapkan {
  const galat: Galat = {};
  const nilai: Record<string, string> = {};
  const iso: Record<string, string> = {};

  for (const f of jenis.isian) {
    // Baris baru hanya boleh di isian panjang; di tempat lain dijadikan spasi.
    let v = (mentah[f.kunci] ?? "").toString().slice(0, BATAS_PANJANG);
    v = f.tipe === "teksPanjang" ? v.replace(/\s*\r?\n\s*/g, " ") : v.replace(/[\r\n\t]+/g, " ");
    v = v.replace(/ {2,}/g, " ").trim();
    if (!v && f.bawaan !== undefined && f.tipe === "pilihan") v = f.bawaan;

    if (f.wajib && !v) galat[f.kunci] = "Wajib diisi";
    if (f.tipe === "pilihan" && v && f.pilihan && f.kunci !== "fakultas" && !f.pilihan.includes(v)) galat[f.kunci] = "Pilihan tidak dikenal";
    if (f.tipe === "tanggal" && v) {
      const t = bacaTanggal(v);
      if (!t) galat[f.kunci] = "Tulis tanggal dengan format dd/mm/yyyy";
      else iso[f.kunci] = t;
    }
    nilai[f.kunci] = v;
  }
  if (Object.keys(galat).length) return { ok: false, galat };

  const tag: Record<string, string> = {};
  for (const f of jenis.isian) tag[f.kunci] = f.tipe === "tanggal" ? tanggalIndonesia(iso[f.kunci]) : nilai[f.kunci];

  // Turunan
  tag.namaJudul = namaJudul(nilai.nama ?? "");
  tag.FAKULTAS = (nilai.fakultas ?? "").toUpperCase();
  tag.STATUS_DOSEN = (nilai.statusDosen ?? "").toUpperCase();
  tag.HUKUMAN = (nilai.hukuman ?? "").toUpperCase();

  const j = JENJANG[(nilai.jenjang ?? "") as keyof typeof JENJANG];
  tag.jenjangUraian = nilai.jenjang ?? "";
  tag.jenjangNama = j?.nama ?? "";
  tag.jenjangKode = j?.kode ?? "";

  // Perpanjangan: bila tanggal mulai tidak diisi, dihitung sehari setelah masa TB sebelumnya berakhir.
  if (jenis.id === "perpanjangan-tb" && !iso.tmt && iso.akhirSebelumnya) {
    iso.tmt = tambahHari(iso.akhirSebelumnya, 1);
    tag.tmt = tanggalIndonesia(iso.tmt);
  }
  tag.lamaStudi = iso.tmt && iso.akhir ? lamaStudi(iso.tmt, iso.akhir) : "";

  tag.nomor = nomorSk(jenis, nilai.nomor ?? "", iso.tanggalPenetapan, hariIni);

  // Yang belum diisi ditulis titik-titik seperti pada contoh SK.
  for (const k of Object.keys(tag)) if (!tag[k]) tag[k] = ISIAN_KOSONG;
  return { ok: true, tag };
}

/**
 * Nomor SK. Bila diisi, dipakai apa adanya. Bila kosong, mengikuti pola contoh:
 * SK Rektor "tanggal.bulan.(nomor urut)/UN32/KP/tahun" dengan nomor urut dibiarkan kosong;
 * SK Dekan dibiarkan titik-titik.
 */
export function nomorSk(jenis: JenisSk, diisi: string, tanggalIso: string | undefined, hariIni: string): string {
  if (diisi.trim()) return diisi.trim();
  const p = bagianTanggal(tanggalIso) ?? bagianTanggal(hariIni);
  const tahun = p ? p[0] : new Date().getFullYear();
  if (jenis.id === "hukdis-ringan") return `${ISIAN_KOSONG}  /UN32…../KP/${tahun}`;
  const hm = bagianTanggal(tanggalIso);
  return `${hm ? `${hm[2]}.${hm[1]}.` : ISIAN_KOSONG}      /UN32/KP/${tahun}`;
}

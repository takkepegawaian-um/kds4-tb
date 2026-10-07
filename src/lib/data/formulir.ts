// Definisi form Data TB dan pemeriksaan isiannya (fungsi murni, dipakai server dan tes).

import { NILAI, sama } from "@/lib/aturan/mesin";
import { bacaTanggal, type NamaKolomInput } from "@/lib/excel/data-tb";
import type { NilaiPegawai } from "@/lib/impor/rencana";
import type { KategoriPilihan } from "@/lib/pengaturan/bawaan";

export type KolomForm = Exclude<NamaKolomInput, "no">;

export type JenisIsian =
  | { jenis: "teks" }
  | { jenis: "panjang" }
  | { jenis: "tanggal" }
  | { jenis: "pilihan"; daftar: KategoriPilihan | "STATUS_SK" };

export type DefinisiIsian = { label: string; isian: JenisIsian; bantuan?: string; wajib?: boolean };

export const ISIAN: Record<KolomForm, DefinisiIsian> = {
  nama: { label: "Nama lengkap dengan gelar", isian: { jenis: "teks" }, wajib: true },
  nip: { label: "NIP", isian: { jenis: "teks" }, wajib: true, bantuan: "18 digit angka, tanpa spasi." },
  fakultas: { label: "Fakultas", isian: { jenis: "pilihan", daftar: "FAKULTAS" } },
  departemen: { label: "Departemen", isian: { jenis: "teks" } },
  jabatan: { label: "Jabatan", isian: { jenis: "teks" } },
  statusAkhir: {
    label: "Status akhir",
    isian: { jenis: "pilihan", daftar: "STATUS_AKHIR" },
    wajib: true,
    bantuan: 'Hambatan hanya dihitung untuk "Sedang TB".',
  },
  jenisPelaksanaan: {
    label: "Jenis pelaksanaan (TriDharma)",
    isian: { jenis: "pilihan", daftar: "JENIS_PELAKSANAAN" },
    bantuan: "Bebas = tidak presensi (terkait tunjangan dan kinerja). Tetap = tetap menjalankan TriDharma.",
  },
  jenjang: { label: "Jenjang", isian: { jenis: "pilihan", daftar: "JENJANG" } },
  lokasi: { label: "Lokasi studi", isian: { jenis: "pilihan", daftar: "LOKASI" }, bantuan: "DN = dalam negeri, LN = luar negeri." },
  sumberBiaya: { label: "Sumber biaya", isian: { jenis: "teks" } },
  tempatStudi: { label: "Tempat studi", isian: { jenis: "teks" } },
  kondisiKuliah: { label: "Kondisi kuliah", isian: { jenis: "pilihan", daftar: "KONDISI_KULIAH" } },
  tmtTb: { label: "TMT TB (mulai)", isian: { jenis: "tanggal" } },
  masaStudiSd: { label: "Masa studi s.d.", isian: { jenis: "tanggal" } },
  perpanjanganSd: { label: "Perpanjangan s.d.", isian: { jenis: "tanggal" }, bantuan: "Kosongkan bila belum ada perpanjangan." },
  statusSk: { label: "Status SK", isian: { jenis: "pilihan", daftar: "STATUS_SK" } },
  noSk: { label: "No SK / No usul", isian: { jenis: "teks" } },
  linkSk: { label: "Link SK", isian: { jenis: "teks" }, bantuan: "Tautan berkas SK, mis. Google Drive." },
  tanggalMasukTahap: {
    label: "Tanggal masuk tahap",
    isian: { jenis: "tanggal" },
    bantuan: "Tanggal Status SK terakhir berubah. Dipakai untuk menghitung lama tertahan.",
  },
  presensi: { label: "Presensi di sistem", isian: { jenis: "pilihan", daftar: "PRESENSI" } },
  presensiTbSd: { label: "Presensi ditandai TB s.d.", isian: { jenis: "tanggal" } },
  catatan: { label: "Catatan (presensi & lainnya)", isian: { jenis: "panjang" } },
};

export const KELOMPOK_FORM: { judul: string; kolom: KolomForm[] }[] = [
  { judul: "Identitas", kolom: ["nama", "nip", "fakultas", "departemen", "jabatan"] },
  { judul: "Status", kolom: ["statusAkhir", "jenisPelaksanaan"] },
  {
    judul: "Studi",
    kolom: ["jenjang", "lokasi", "sumberBiaya", "tempatStudi", "kondisiKuliah", "tmtTb", "masaStudiSd", "perpanjanganSd"],
  },
  { judul: "SK", kolom: ["statusSk", "noSk", "linkSk", "tanggalMasukTahap"] },
  { judul: "Presensi dan catatan", kolom: ["presensi", "presensiTbSd", "catatan"] },
];

export const SEMUA_KOLOM_FORM = KELOMPOK_FORM.flatMap((k) => k.kolom);

export type DaftarPilihanForm = Record<KategoriPilihan | "STATUS_SK", string[]>;

export type HasilPeriksa = {
  nilai: Omit<NilaiPegawai, "no">;
  /** Kesalahan per kolom; bila ada, data tidak disimpan. */
  galat: Partial<Record<KolomForm, string>>;
  /** Hal yang perlu diperhatikan, tidak menghalangi penyimpanan. */
  peringatan: string[];
};

/**
 * Memeriksa isian form.
 * @param isian teks mentah dari form (tanggal ditulis dd/mm/yyyy)
 * @param nilaiLama nilai sebelum diubah (nilai lama yang tidak ada di daftar pilihan tetap boleh dipertahankan)
 * @param nipDipakai orang lain yang sudah memakai NIP yang sama
 */
export function periksaIsian(
  isian: Partial<Record<KolomForm, string>>,
  daftar: DaftarPilihanForm,
  nilaiLama: Partial<NilaiPegawai> = {},
  nipDipakai: { nama: string; statusAkhir: string }[] = [],
): HasilPeriksa {
  const nilai = {} as HasilPeriksa["nilai"];
  const galat: HasilPeriksa["galat"] = {};
  const peringatan: string[] = [];

  for (const kolom of SEMUA_KOLOM_FORM) {
    const def = ISIAN[kolom];
    // Spasi berlebih dirapikan, kecuali di Catatan (baris baru dipertahankan).
    const mentah = isian[kolom] ?? "";
    const teks = kolom === "catatan" ? mentah.trim() : mentah.trim().replace(/\s+/g, " ");

    if (teks === "") {
      nilai[kolom] = null;
      if (def.wajib) galat[kolom] = `${def.label} wajib diisi.`;
      continue;
    }

    if (def.isian.jenis === "tanggal") {
      const t = bacaTanggal(teks);
      if (!t) {
        galat[kolom] = "Tulis tanggal dengan format dd/mm/yyyy, misalnya 31/08/2026.";
        nilai[kolom] = null;
      } else nilai[kolom] = t;
      continue;
    }

    if (def.isian.jenis === "pilihan") {
      const pilihan = daftar[def.isian.daftar] ?? [];
      const baku = pilihan.find((p) => p.toLowerCase() === teks.toLowerCase());
      if (baku) nilai[kolom] = baku;
      else if (nilaiLama[kolom] === teks) {
        nilai[kolom] = teks; // nilai lama di luar daftar boleh dipertahankan
        peringatan.push(`${def.label} "${teks}" tidak ada di daftar pilihan.`);
      } else {
        galat[kolom] = "Pilih salah satu dari daftar.";
        nilai[kolom] = null;
      }
      continue;
    }

    nilai[kolom] = teks;
  }

  // NIP
  const nip = nilai.nip as string | null;
  if (nip) {
    if (!/^\d{18}$/.test(nip)) peringatan.push(`NIP berisi ${nip.length} karakter, seharusnya 18 digit angka.`);
    if (nipDipakai.length) {
      peringatan.push(`NIP kembar: sudah dipakai ${nipDipakai.map((o) => `${o.nama} (${o.statusAkhir})`).join(", ")}.`);
    }
  }

  // Kelengkapan untuk orang yang Sedang TB (sama dengan kolom "Cek data" di Excel)
  if (sama(nilai.statusAkhir as string | null, NILAI.SEDANG_TB)) {
    if (!nilai.jenisPelaksanaan) peringatan.push("Jenis pelaksanaan kosong.");
    if (!nilai.fakultas) peringatan.push("Fakultas kosong.");
    if (!nilai.masaStudiSd) peringatan.push("Masa studi s.d. kosong: hambatan dihitung sebagai kode 12.");
    if (!nilai.tmtTb) peringatan.push("TMT TB kosong.");
    if (!nilai.statusSk) peringatan.push("Status SK kosong: hambatan dihitung sebagai kode 11.");
    if (sama(nilai.presensi as string | null, NILAI.PRESENSI_TIDAK_JELAS)) peringatan.push("Status presensi tidak jelas.");
  }

  // Urutan tanggal
  const tmt = nilai.tmtTb as string | null;
  const masa = nilai.masaStudiSd as string | null;
  const perp = nilai.perpanjanganSd as string | null;
  if (tmt && masa && masa < tmt) peringatan.push("Masa studi s.d. lebih awal dari TMT TB.");
  if (masa && perp && perp <= masa) peringatan.push("Perpanjangan s.d. tidak lebih akhir dari Masa studi s.d.; yang dipakai tetap tanggal paling akhir.");

  return { nilai, galat, peringatan };
}

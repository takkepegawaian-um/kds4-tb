// RENCANA IMPOR
//
// Membandingkan baris-baris dari berkas Excel dengan data yang sudah ada di aplikasi,
// lalu menyusun rencana: baris baru, baris yang berubah, baris yang sama, dan baris gagal.
// Tidak menulis apa pun ke database (fungsi murni, mudah diuji).
//
// Cara mencocokkan orang di berkas dengan orang di aplikasi:
// 1. Berdasarkan NIP.
// 2. Bila NIP yang sama dipakai lebih dari satu orang (di berkas atau di aplikasi),
//    dicocokkan berdasarkan NIP + nama (tanpa memperhatikan tanda baca, spasi,
//    dan huruf besar/kecil), berpasangan menurut urutan baris.

import { bacaAbsensi } from "@/lib/aturan/label-absensi";
import { KOLOM_INPUT, type BarisExcel, type NamaKolomInput } from "@/lib/excel/data-tb";

export type NilaiPegawai = BarisExcel["nilai"];

export type PegawaiTersimpan = { id: number; urutan: number; nilai: NilaiPegawai };

/** Daftar nilai yang dikenal untuk kolom ber-dropdown. */
export type DaftarPilihanImpor = Partial<Record<NamaKolomInput, string[]>>;

export type Perubahan = { kolom: NamaKolomInput; judul: string; lama: string | number | null; baru: string | number | null };

type InfoBaris = { baris: number; nama: string | null; nip: string | null; peringatan: string[] };

export type RencanaImpor = {
  baru: (InfoBaris & { nilai: NilaiPegawai })[];
  ubah: (InfoBaris & { id: number; nilai: NilaiPegawai; perubahan: Perubahan[] })[];
  sama: InfoBaris[];
  gagal: (InfoBaris & { alasan: string[] })[];
  /** Jumlah orang di aplikasi yang tidak ada di berkas (tidak diubah, tidak dihapus). */
  tidakAdaDiBerkas: number;
};

/** Kolom yang tidak dibandingkan saat mencari perubahan ("No" hanya nomor tampilan). */
const ABAIKAN_SAAT_BANDING = new Set<NamaKolomInput>(["no"]);

const JUDUL = Object.fromEntries(KOLOM_INPUT.map((k) => [k.kolom, k.judul])) as Record<NamaKolomInput, string>;

export function kunciNama(nama: string | null): string {
  return (nama ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Menyamakan penulisan nilai dropdown dengan daftar pilihan (mis. "aktif" -> "AKTIF")
 * dan mencatat peringatan bila nilai tidak ada di daftar.
 */
function rapikanPilihan(nilai: NilaiPegawai, daftar: DaftarPilihanImpor, peringatan: string[]): NilaiPegawai {
  const hasil = { ...nilai };
  for (const [kolom, pilihan] of Object.entries(daftar) as [NamaKolomInput, string[]][]) {
    let v = hasil[kolom];
    if (typeof v !== "string" || !pilihan) continue;
    // Berkas hasil ekspor memuat tulisan di layar ("Ditandai TB"); ubah ke nilai tersimpan (AKTIF).
    if (kolom === "presensi") v = bacaAbsensi(v) ?? v;
    const baku = pilihan.find((p) => p.toLowerCase() === v.toLowerCase());
    if (baku) hasil[kolom] = baku;
    else peringatan.push(`${JUDUL[kolom]} "${v}" tidak ada di daftar pilihan`);
  }
  return hasil;
}

export function susunRencana(
  berkas: readonly BarisExcel[],
  tersimpan: readonly PegawaiTersimpan[],
  daftar: DaftarPilihanImpor,
): RencanaImpor {
  const rencana: RencanaImpor = { baru: [], ubah: [], sama: [], gagal: [], tidakAdaDiBerkas: 0 };

  // --- 1. Periksa setiap baris berkas
  type BarisSah = InfoBaris & { nilai: NilaiPegawai };
  const sah: BarisSah[] = [];
  for (const b of berkas) {
    const nama = b.nilai.nama as string | null;
    const nip = b.nilai.nip as string | null;
    const alasan = [...b.galat];
    if (!nama) alasan.push("Nama kosong");
    if (!nip) alasan.push("NIP kosong");
    if (!b.nilai.statusAkhir) alasan.push("Status akhir kosong");

    const peringatan = [...b.peringatan];
    if (nip && !/^\d{18}$/.test(nip)) peringatan.push(`NIP berisi ${nip.length} karakter, seharusnya 18 digit angka`);

    if (alasan.length) {
      rencana.gagal.push({ baris: b.baris, nama, nip, peringatan, alasan });
      continue;
    }
    sah.push({ baris: b.baris, nama, nip, peringatan, nilai: rapikanPilihan(b.nilai, daftar, peringatan) });
  }

  // --- 2. Tandai NIP kembar di dalam berkas
  const perNipBerkas = kelompokkan(sah, (b) => b.nip!);
  for (const [, grup] of perNipBerkas) {
    if (grup.length < 2) continue;
    for (const b of grup) {
      const lain = grup.filter((x) => x !== b).map((x) => `baris ${x.baris} (${x.nama})`);
      b.peringatan.push(`NIP kembar dengan ${lain.join(", ")}`);
    }
  }

  // --- 3. Cocokkan dengan data di aplikasi
  const perNipTersimpan = kelompokkan(tersimpan, (p) => String(p.nilai.nip ?? ""));
  const terpakai = new Set<number>();

  for (const [nip, grupBerkas] of perNipBerkas) {
    const grupTersimpan = [...(perNipTersimpan.get(nip) ?? [])].sort((a, b) => a.urutan - b.urutan);
    const pasangan: [BarisSah, PegawaiTersimpan | undefined][] = [];

    if (grupBerkas.length === 1 && grupTersimpan.length === 1) {
      pasangan.push([grupBerkas[0], grupTersimpan[0]]);
    } else {
      // NIP dipakai lebih dari satu orang: cocokkan lewat NIP + nama, berpasangan menurut urutan.
      const sisaTersimpan = kelompokkan(grupTersimpan, (p) => kunciNama(p.nilai.nama as string | null));
      for (const b of grupBerkas) {
        const calon = sisaTersimpan.get(kunciNama(b.nama));
        pasangan.push([b, calon?.shift()]);
      }
      // Beritahu bila NIP ini sudah dipakai orang lain di aplikasi.
      for (const [b, p] of pasangan) {
        if (!p && grupTersimpan.length) {
          b.peringatan.push(`NIP sudah dipakai ${grupTersimpan.map((x) => x.nilai.nama).join(", ")} di aplikasi`);
        }
      }
    }

    for (const [b, p] of pasangan) {
      if (!p) {
        rencana.baru.push(b);
        continue;
      }
      terpakai.add(p.id);
      const perubahan = bandingkan(p.nilai, b.nilai);
      if (perubahan.length) rencana.ubah.push({ ...b, id: p.id, perubahan });
      else rencana.sama.push({ baris: b.baris, nama: b.nama, nip: b.nip, peringatan: b.peringatan });
    }
  }

  rencana.tidakAdaDiBerkas = tersimpan.filter((p) => !terpakai.has(p.id)).length;
  for (const k of ["baru", "ubah", "sama", "gagal"] as const) rencana[k].sort((a, b) => a.baris - b.baris);
  return rencana;
}

function bandingkan(lama: NilaiPegawai, baru: NilaiPegawai): Perubahan[] {
  const hasil: Perubahan[] = [];
  for (const { kolom, judul } of KOLOM_INPUT) {
    if (ABAIKAN_SAAT_BANDING.has(kolom)) continue;
    const a = lama[kolom] ?? null;
    const b = baru[kolom] ?? null;
    if (a !== b) hasil.push({ kolom, judul, lama: a, baru: b });
  }
  return hasil;
}

function kelompokkan<T>(xs: readonly T[], kunci: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = kunci(x);
    m.set(k, [...(m.get(k) ?? []), x]);
  }
  return m;
}

"use server";

// Aksi server untuk Impor dari Excel.
// 1. periksaBerkas: membaca berkas dan menyusun pratinjau. Tidak menulis ke database.
// 2. simpanImpor: membaca ulang berkas yang sama, lalu menyimpan baris yang dipilih.

import { revalidatePath } from "next/cache";
import { bacaBerkasImpor, simpanRencanaImpor, type BacaanBerkas, type HasilSimpan } from "@/lib/impor/proses";
import type { Perubahan } from "@/lib/impor/rencana";
import { emailPengguna } from "@/lib/sesi";

export type PratinjauImpor = {
  namaBerkas: string;
  namaSheet: string;
  barisJudul: number;
  kolomHilang: string[];
  kolomTidakDikenal: string[];
  jumlahBaris: number;
  tidakAdaDiBerkas: number;
  baru: { baris: number; nama: string | null; nip: string | null; statusAkhir: string | null; fakultas: string | null; peringatan: string[] }[];
  ubah: { baris: number; nama: string | null; nip: string | null; peringatan: string[]; perubahan: Perubahan[] }[];
  sama: { baris: number; nama: string | null; nip: string | null; peringatan: string[] }[];
  gagal: { baris: number; nama: string | null; nip: string | null; alasan: string[] }[];
};

export type { HasilSimpan };
export type HasilAksi<T> = { ok: true; data: T } | { ok: false; pesan: string };

const pesanGalat = (e: unknown) => (e instanceof Error ? e.message : "Terjadi kesalahan yang tidak dikenal.");

async function bacaDariForm(formData: FormData): Promise<BacaanBerkas> {
  const berkas = formData.get("berkas");
  if (!(berkas instanceof File) || berkas.size === 0) throw new Error("Pilih berkas Excel terlebih dahulu.");
  return bacaBerkasImpor(await berkas.arrayBuffer(), berkas.name);
}

export async function periksaBerkas(formData: FormData): Promise<HasilAksi<PratinjauImpor>> {
  // Di luar try: bila belum login, redirect ke halaman Masuk tidak boleh tertangkap catch.
  await emailPengguna();
  try {
    const { namaBerkas, namaSheet, sheet, rencana } = await bacaDariForm(formData);
    return {
      ok: true,
      data: {
        namaBerkas,
        namaSheet,
        barisJudul: sheet.barisJudul,
        kolomHilang: sheet.kolomHilang,
        kolomTidakDikenal: sheet.kolomTidakDikenal,
        jumlahBaris: sheet.data.length,
        tidakAdaDiBerkas: rencana.tidakAdaDiBerkas,
        baru: rencana.baru.map((b) => ({
          baris: b.baris,
          nama: b.nama,
          nip: b.nip,
          statusAkhir: b.nilai.statusAkhir as string | null,
          fakultas: b.nilai.fakultas as string | null,
          peringatan: b.peringatan,
        })),
        ubah: rencana.ubah.map(({ baris, nama, nip, peringatan, perubahan }) => ({ baris, nama, nip, peringatan, perubahan })),
        sama: rencana.sama,
        gagal: rencana.gagal.map(({ baris, nama, nip, alasan }) => ({ baris, nama, nip, alasan })),
      },
    };
  } catch (e) {
    return { ok: false, pesan: pesanGalat(e) };
  }
}

export async function simpanImpor(formData: FormData): Promise<HasilAksi<HasilSimpan>> {
  const email = await emailPengguna();
  try {
    const dipilih: unknown = JSON.parse(String(formData.get("dipilih") ?? "[]"));
    if (!Array.isArray(dipilih) || !dipilih.every((n) => Number.isInteger(n))) throw new Error("Pilihan baris tidak valid.");
    const bacaan = await bacaDariForm(formData);
    const hasil = await simpanRencanaImpor(bacaan, new Set(dipilih as number[]), email);
    revalidatePath("/", "layout");
    return { ok: true, data: hasil };
  } catch (e) {
    return { ok: false, pesan: pesanGalat(e) };
  }
}

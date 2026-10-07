// Menyiapkan data untuk form tambah / ubah (dijalankan di server).
import "server-only";
import type { PegawaiTB } from "@/generated/prisma/client";
import { dbKeNilai } from "@/lib/data/peta";
import { SEMUA_KOLOM_FORM, ISIAN, type KolomForm } from "@/lib/data/formulir";
import { daftarPilihanForm, pengaturanAturan } from "@/lib/pengaturan/baca";
import { formatTanggal } from "@/lib/tanggal";

export async function siapkanForm(pegawai: PegawaiTB | null) {
  const [daftar, pengaturan] = await Promise.all([daftarPilihanForm(), pengaturanAturan()]);
  const awal: Partial<Record<KolomForm, string>> = {};
  if (pegawai) {
    const n = dbKeNilai(pegawai);
    for (const k of SEMUA_KOLOM_FORM) {
      const v = n[k];
      awal[k] = v === null ? "" : ISIAN[k].isian.jenis === "tanggal" ? formatTanggal(String(v)) : String(v);
    }
  } else {
    awal.statusAkhir = "Sedang TB";
  }
  return {
    awal,
    daftar,
    petaTahap: Object.fromEntries(pengaturan.statusSk.map((s) => [s.statusSk, s.tahap])),
    tahapKosong: pengaturan.tahapStatusKosong,
  };
}

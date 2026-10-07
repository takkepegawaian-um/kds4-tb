// Pemetaan baris database <-> nilai kolom input <-> masukan mesin aturan.
// Fungsi murni (tanpa akses database), dipakai server dan tes.
import type { PegawaiTB, Prisma } from "@/generated/prisma/client";
import type { InputPegawai } from "@/lib/aturan/mesin";
import { KOLOM_INPUT } from "@/lib/excel/data-tb";
import type { NilaiPegawai } from "@/lib/impor/rencana";
import { dariDb, keDb } from "@/lib/tanggal";

const KOLOM_TANGGAL = new Set<string>(KOLOM_INPUT.filter((k) => k.tipe === "tanggal").map((k) => k.kolom));

/** Baris database -> nilai per kolom input (tanggal "yyyy-mm-dd"). */
export function dbKeNilai(p: PegawaiTB): NilaiPegawai {
  const nilai = {} as NilaiPegawai;
  for (const { kolom } of KOLOM_INPUT) {
    const v = p[kolom];
    nilai[kolom] = v instanceof Date ? dariDb(v) : (v as string | number | null);
  }
  return nilai;
}

/** Nilai per kolom input -> data untuk disimpan ke database. */
export function nilaiKeDb(n: NilaiPegawai) {
  const data: Record<string, unknown> = {};
  for (const { kolom } of KOLOM_INPUT) {
    const v = n[kolom];
    data[kolom] = KOLOM_TANGGAL.has(kolom) ? keDb(v as string | null) : v;
  }
  return data as Omit<Prisma.PegawaiTBUncheckedCreateInput, "urutan">;
}

export function keInputAturan(p: PegawaiTB): InputPegawai {
  return {
    urutan: p.urutan,
    nama: p.nama,
    nip: p.nip,
    statusAkhir: p.statusAkhir,
    fakultas: p.fakultas,
    jenisPelaksanaan: p.jenisPelaksanaan,
    statusSk: p.statusSk,
    presensi: p.presensi,
    tmtTb: dariDb(p.tmtTb),
    masaStudiSd: dariDb(p.masaStudiSd),
    perpanjanganSd: dariDb(p.perpanjanganSd),
    presensiTbSd: dariDb(p.presensiTbSd),
    tanggalMasukTahap: dariDb(p.tanggalMasukTahap),
  };
}

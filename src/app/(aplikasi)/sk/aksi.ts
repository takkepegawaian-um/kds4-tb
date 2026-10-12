"use server";

// Mengisi formulir SK dari data seorang pegawai di Data TB.

import { prisma } from "@/lib/db";
import { emailPengguna } from "@/lib/sesi";
import { cariJenisSk } from "@/lib/sk/jenis";

export async function ambilIsianPegawai(jenisId: string, pegawaiId: number): Promise<Record<string, string>> {
  await emailPengguna();
  const jenis = cariJenisSk(jenisId);
  if (!jenis || !Number.isInteger(pegawaiId)) return {};
  const p = await prisma.pegawaiTB.findFirst({ where: { id: pegawaiId, dihapusPada: null } });
  if (!p) return {};
  const hasil: Record<string, string> = {};
  for (const f of jenis.isian) {
    const v = f.dariPegawai?.(p);
    if (v) hasil[f.kunci] = v;
  }
  return hasil;
}

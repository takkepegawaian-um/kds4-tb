// Akses data pegawai TB di database, dan penghubung ke mesin aturan.
import "server-only";
import { connection } from "next/server";
import type { PegawaiTB } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { hitungSemua } from "@/lib/aturan/mesin";
import type { BarisDihitung } from "@/lib/aturan/saringan";
import { keInputAturan } from "./peta";
export { dbKeNilai, keInputAturan, nilaiKeDb } from "./peta";
import { wajibLogin } from "@/lib/auth/sesi";
import { pengaturanAturan, tanggalAcuanBerlaku } from "@/lib/pengaturan/baca";

/**
 * Semua pegawai beserta hasil hitung mesin aturan.
 * @param tanggalAcuan "yyyy-mm-dd"; bila kosong dipakai tanggal acuan dari Pengaturan / hari ini.
 */
export async function muatSemuaDihitung(tanggalAcuan?: string) {
  await connection();
  await wajibLogin();
  const [pegawai, pengaturan, acuan] = await Promise.all([
    prisma.pegawaiTB.findMany({ where: { dihapusPada: null }, orderBy: { urutan: "asc" } }),
    pengaturanAturan(),
    tanggalAcuan ? Promise.resolve({ tanggal: tanggalAcuan, simulasi: true }) : tanggalAcuanBerlaku(),
  ]);
  const input = pegawai.map(keInputAturan);
  const hasil = hitungSemua(input, pengaturan, acuan.tanggal);
  const baris: (BarisDihitung & { pegawai: PegawaiTB })[] = pegawai.map((p, i) => ({ pegawai: p, input: input[i], hasil: hasil[i] }));
  return { baris, pengaturan, tanggalAcuan: acuan.tanggal };
}

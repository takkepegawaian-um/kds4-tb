"use server";

import { prisma } from "@/lib/db";
import { buatSesi, catatAkses, cocokSandi, hashSandi, PANJANG_SANDI_MIN, wajibLogin } from "@/lib/auth/sesi";

export type HasilGanti = { ok: boolean; pesan: string } | undefined;

export async function gantiSandi(_: HasilGanti, formData: FormData): Promise<HasilGanti> {
  const p = await wajibLogin();
  const lama = String(formData.get("lama") ?? "");
  const baru = String(formData.get("baru") ?? "");
  const ulang = String(formData.get("ulang") ?? "");

  const pengguna = await prisma.pengguna.findUniqueOrThrow({ where: { id: p.id } });
  if (!(await cocokSandi(lama, pengguna.hashSandi))) {
    await catatAkses(p.email, "GANTI_SANDI_GAGAL", "Kata sandi lama salah");
    return { ok: false, pesan: "Kata sandi lama salah." };
  }
  if (baru.length < PANJANG_SANDI_MIN) return { ok: false, pesan: `Kata sandi baru minimal ${PANJANG_SANDI_MIN} karakter.` };
  if (baru !== ulang) return { ok: false, pesan: "Ulangan kata sandi baru tidak sama." };
  if (baru === lama) return { ok: false, pesan: "Kata sandi baru harus berbeda dari yang lama." };

  // Ganti sandi lalu cabut SEMUA sesi (termasuk di perangkat lain), kemudian buat sesi baru di sini.
  await prisma.$transaction([
    prisma.pengguna.update({ where: { id: p.id }, data: { hashSandi: await hashSandi(baru) } }),
    prisma.sesi.deleteMany({ where: { penggunaId: p.id } }),
  ]);
  await buatSesi(p.id);
  await catatAkses(p.email, "GANTI_SANDI");
  return { ok: true, pesan: "Kata sandi berhasil diganti. Sesi di perangkat lain sudah dikeluarkan." };
}

export async function keluarSemuaPerangkat(): Promise<HasilGanti> {
  const p = await wajibLogin();
  await prisma.sesi.deleteMany({ where: { penggunaId: p.id } });
  await buatSesi(p.id);
  await catatAkses(p.email, "KELUAR_SEMUA_PERANGKAT");
  return { ok: true, pesan: "Semua perangkat lain sudah dikeluarkan." };
}

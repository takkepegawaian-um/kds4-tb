// Sesi login (server). Semua halaman, aksi, dan ekspor memanggil wajibLogin().
import "server-only";
import bcrypt from "bcryptjs";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Peran } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { bacaCookie, buatToken, hashToken, LAMA_SESI_MS, NAMA_COOKIE, nilaiCookie, rahasiaSesi } from "./token";

export const BATAS_GAGAL = 5;
export const LAMA_KUNCI_MS = 15 * 60 * 1000;
export const PANJANG_SANDI_MIN = 10;
const BIAYA_BCRYPT = 12;

export type PenggunaAktif = { id: number; email: string; nama: string; peran: Peran };

export async function hashSandi(sandi: string): Promise<string> {
  return bcrypt.hash(sandi, BIAYA_BCRYPT);
}

export async function cocokSandi(sandi: string, hash: string): Promise<boolean> {
  return bcrypt.compare(sandi, hash);
}

/** Hash pengganti saat email tidak dikenal, supaya lama proses login tetap sama. */
let hashPengganti: Promise<string> | undefined;
export async function cocokSandiPengganti(sandi: string) {
  hashPengganti ??= bcrypt.hash("pengganti-tidak-dipakai", BIAYA_BCRYPT);
  await bcrypt.compare(sandi, await hashPengganti);
}

export async function infoPermintaan() {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  };
}

export async function catatAkses(email: string, peristiwa: string, keterangan?: string) {
  const { ip, userAgent } = await infoPermintaan();
  await prisma.logAkses.create({ data: { email, peristiwa, keterangan: keterangan ?? null, ip, userAgent } });
}

/** Membuat sesi baru dan memasang cookie. */
export async function buatSesi(penggunaId: number) {
  const token = buatToken();
  const kedaluwarsa = Date.now() + LAMA_SESI_MS;
  const { ip, userAgent } = await infoPermintaan();
  await prisma.sesi.create({
    data: { id: hashToken(token), penggunaId, kedaluwarsa: new Date(kedaluwarsa), ip, userAgent },
  });
  (await cookies()).set(NAMA_COOKIE, nilaiCookie(token, kedaluwarsa, rahasiaSesi()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(kedaluwarsa),
  });
}

/** Pengguna yang sedang login, atau null. Hasilnya dipakai ulang dalam satu permintaan. */
export const penggunaSaatIni = cache(async (): Promise<PenggunaAktif | null> => {
  // Pemeriksaan masa berlaku memakai jam saat ini, jadi wajib dijalankan saat ada permintaan.
  await connection();
  const isi = bacaCookie((await cookies()).get(NAMA_COOKIE)?.value, rahasiaSesi());
  if (!isi) return null;
  const sesi = await prisma.sesi.findUnique({ where: { id: hashToken(isi.token) }, include: { pengguna: true } });
  if (!sesi || sesi.kedaluwarsa <= new Date() || !sesi.pengguna.aktif) return null;
  const { id, email, nama, peran } = sesi.pengguna;
  return { id, email, nama, peran };
});

/**
 * Wajib login. Bila belum login, diarahkan ke halaman Masuk.
 * @param peran "ADMIN" untuk aksi yang mengubah data.
 */
export async function wajibLogin(peran?: Peran): Promise<PenggunaAktif> {
  const p = await penggunaSaatIni();
  if (!p) redirect("/masuk");
  if (peran === "ADMIN" && p.peran !== "ADMIN") throw new Error("Anda tidak punya hak untuk melakukan ini.");
  return p;
}

/** Menghapus sesi saat ini (logout). */
export async function hapusSesiIni() {
  const toko = await cookies();
  const isi = bacaCookie(toko.get(NAMA_COOKIE)?.value, rahasiaSesi());
  if (isi) await prisma.sesi.deleteMany({ where: { id: hashToken(isi.token) } });
  toko.delete(NAMA_COOKIE);
}

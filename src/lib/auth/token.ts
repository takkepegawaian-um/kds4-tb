// Token sesi dan tanda tangan cookie (tanpa database).
// Dipakai proxy (pemeriksaan cepat di depan) dan server (pemeriksaan lengkap).
//
// Isi cookie: <token>.<kedaluwarsa-ms>.<tanda-tangan>
// - token: 32 byte acak; database hanya menyimpan hash SHA-256-nya.
// - tanda tangan: HMAC-SHA256(token.kedaluwarsa) dengan SESI_RAHASIA, supaya cookie
//   palsu atau yang diubah langsung ditolak tanpa membuka database.

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const NAMA_COOKIE = "kds4_sesi";
/** Lama sesi: 8 jam (satu hari kerja). */
export const LAMA_SESI_MS = 8 * 60 * 60 * 1000;

export function rahasiaSesi(): string {
  const r = process.env.SESI_RAHASIA;
  if (!r || r.length < 32) {
    throw new Error("SESI_RAHASIA belum diisi atau kurang dari 32 karakter. Lihat .env.example.");
  }
  return r;
}

export function buatToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tandaTangan(isi: string, rahasia: string): string {
  return createHmac("sha256", rahasia).update(isi).digest("base64url");
}

export function nilaiCookie(token: string, kedaluwarsa: number, rahasia: string): string {
  const isi = `${token}.${kedaluwarsa}`;
  return `${isi}.${tandaTangan(isi, rahasia)}`;
}

/** Memeriksa tanda tangan dan masa berlaku cookie. Mengembalikan token bila sah. */
export function bacaCookie(nilai: string | undefined, rahasia: string, sekarang = Date.now()): { token: string; kedaluwarsa: number } | null {
  if (!nilai) return null;
  const bagian = nilai.split(".");
  if (bagian.length !== 3) return null;
  const [token, waktu, ttd] = bagian;
  const harapan = Buffer.from(tandaTangan(`${token}.${waktu}`, rahasia));
  const diterima = Buffer.from(ttd);
  if (harapan.length !== diterima.length || !timingSafeEqual(harapan, diterima)) return null;
  const kedaluwarsa = Number(waktu);
  if (!Number.isFinite(kedaluwarsa) || kedaluwarsa <= sekarang) return null;
  return { token, kedaluwarsa };
}

// Satu koneksi database untuk seluruh aplikasi.
import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalUntukPrisma = globalThis as unknown as { prisma?: PrismaClient };

function buatPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL belum diisi. Salin ".env.example" menjadi ".env" lalu isi alamat database.');
  }
  // Koneksi menganggur dibuang cepat: database serverless (Neon) menutup koneksi yang lama diam,
  // dan koneksi mati yang masih disimpan akan membuat permintaan berikutnya gagal.
  const pool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 10_000, connectionTimeoutMillis: 15_000 });
  // Koneksi menganggur yang terputus bukan kesalahan fatal; pool akan membuat koneksi baru.
  pool.on("error", (e) => console.warn("Koneksi database menganggur terputus, akan dibuat ulang:", e.message));
  // Di Vercel: koneksi yang menganggur ditutup rapi sebelum fungsi berhenti (tidak berpengaruh di komputer lokal).
  if (process.env.VERCEL) attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

// Saat pengembangan, Next.js memuat ulang modul berkali-kali; simpan satu instans saja.
export const prisma = globalUntukPrisma.prisma ?? buatPrisma();
if (process.env.NODE_ENV !== "production") globalUntukPrisma.prisma = prisma;

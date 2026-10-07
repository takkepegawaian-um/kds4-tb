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
  const pool = new Pool({ connectionString, max: 5 });
  // Di Vercel: koneksi yang menganggur ditutup rapi sebelum fungsi berhenti (tidak berpengaruh di komputer lokal).
  if (process.env.VERCEL) attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

// Saat pengembangan, Next.js memuat ulang modul berkali-kali; simpan satu instans saja.
export const prisma = globalUntukPrisma.prisma ?? buatPrisma();
if (process.env.NODE_ENV !== "production") globalUntukPrisma.prisma = prisma;

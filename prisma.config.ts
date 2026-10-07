import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Perintah Prisma (migrasi) memakai koneksi langsung bila ada (Neon: alamat tanpa "-pooler").
    // Aplikasi sendiri memakai DATABASE_URL (Neon: alamat "-pooler").
    // (DATABASE_URL_UNPOOLED = nama yang dipakai bila Neon dipasang lewat menu Storage di Vercel.)
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL_UNPOOLED"] ?? process.env["DATABASE_URL"],
  },
});

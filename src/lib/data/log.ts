// Membaca Log perubahan dan Log akses untuk halaman Log Aktivitas (server).
import "server-only";
import { connection } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { rentangWib } from "./log-label";

export type TabLog = "perubahan" | "akses";
export const PER_HALAMAN_LOG = 50;

export type FilterLog = { tab: TabLog; q: string; aksi: string; email: string; dari: string; sampai: string; hal: number };

const satu = (v: string | string[] | undefined) => ((Array.isArray(v) ? v[0] : v) ?? "").trim();

export function bacaFilterLog(p: Record<string, string | string[] | undefined>): FilterLog {
  return {
    tab: satu(p.tab) === "akses" ? "akses" : "perubahan",
    q: satu(p.q).slice(0, 100),
    aksi: satu(p.aksi),
    email: satu(p.email),
    dari: satu(p.dari),
    sampai: satu(p.sampai),
    hal: Math.max(1, Number(satu(p.hal)) || 1),
  };
}

function wherePerubahan(f: FilterLog, idCocok: string[]): Prisma.LogPerubahanWhereInput {
  const waktu = rentangWib(f.dari, f.sampai);
  return {
    ...(Object.keys(waktu).length ? { waktu } : {}),
    ...(f.aksi ? { aksi: f.aksi } : {}),
    ...(f.email ? { email: f.email } : {}),
    ...(f.q
      ? {
          OR: [
            { nilaiLama: { contains: f.q, mode: "insensitive" } },
            { nilaiBaru: { contains: f.q, mode: "insensitive" } },
            { entitas: "PegawaiTB", entitasId: { in: idCocok } },
          ],
        }
      : {}),
  };
}

/** Riwayat perubahan, terbaru dulu. semua=true untuk ekspor (tanpa halaman, maks. 20.000 baris). */
export async function muatLogPerubahan(f: FilterLog, semua = false) {
  await connection();
  await wajibLogin();
  // Pencarian nama/NIP: cari pegawai yang cocok (termasuk yang sudah dihapus).
  const idCocok = f.q
    ? (
        await prisma.pegawaiTB.findMany({
          where: { OR: [{ nama: { contains: f.q, mode: "insensitive" } }, { nip: { contains: f.q.replace(/\s/g, "") } }] },
          select: { id: true },
        })
      ).map((p) => String(p.id))
    : [];
  const where = wherePerubahan(f, idCocok);
  const [total, baris] = await Promise.all([
    prisma.logPerubahan.count({ where }),
    prisma.logPerubahan.findMany({
      where,
      orderBy: [{ waktu: "desc" }, { id: "desc" }],
      skip: semua ? 0 : (f.hal - 1) * PER_HALAMAN_LOG,
      take: semua ? 20_000 : PER_HALAMAN_LOG,
    }),
  ]);
  const idPegawai = [...new Set(baris.filter((b) => b.entitas === "PegawaiTB").map((b) => Number(b.entitasId)))].filter(Number.isInteger);
  const pegawai = await prisma.pegawaiTB.findMany({
    where: { id: { in: idPegawai } },
    select: { id: true, nama: true, nip: true, dihapusPada: true },
  });
  const perId = new Map(pegawai.map((p) => [String(p.id), p]));
  return {
    total,
    baris: baris.map((b) => ({ ...b, pegawai: b.entitas === "PegawaiTB" ? (perId.get(b.entitasId) ?? null) : null })),
  };
}

export async function muatLogAkses(f: FilterLog, semua = false) {
  await connection();
  await wajibLogin();
  const waktu = rentangWib(f.dari, f.sampai);
  const where: Prisma.LogAksesWhereInput = {
    ...(Object.keys(waktu).length ? { waktu } : {}),
    ...(f.aksi ? { peristiwa: f.aksi } : {}),
    ...(f.email ? { email: f.email } : {}),
    ...(f.q
      ? {
          OR: [
            { email: { contains: f.q, mode: "insensitive" } },
            { keterangan: { contains: f.q, mode: "insensitive" } },
            { ip: { contains: f.q } },
          ],
        }
      : {}),
  };
  const [total, baris] = await Promise.all([
    prisma.logAkses.count({ where }),
    prisma.logAkses.findMany({
      where,
      orderBy: [{ waktu: "desc" }, { id: "desc" }],
      skip: semua ? 0 : (f.hal - 1) * PER_HALAMAN_LOG,
      take: semua ? 20_000 : PER_HALAMAN_LOG,
    }),
  ]);
  return { total, baris };
}

/** Pilihan filter: pengguna yang pernah tercatat, dan ringkasan 30 hari terakhir. */
export async function ringkasanLog() {
  await connection();
  await wajibLogin();
  const sejak = new Date(Date.now() - 30 * 86_400_000);
  const [emailPerubahan, emailAkses, perubahan30, gagal30, ekspor30] = await Promise.all([
    prisma.logPerubahan.findMany({ distinct: ["email"], select: { email: true } }),
    prisma.logAkses.findMany({ distinct: ["email"], select: { email: true } }),
    prisma.logPerubahan.count({ where: { waktu: { gte: sejak } } }),
    prisma.logAkses.count({ where: { waktu: { gte: sejak }, peristiwa: { in: ["LOGIN_GAGAL", "LOGIN_DITOLAK", "AKUN_TERKUNCI"] } } }),
    prisma.logAkses.count({ where: { waktu: { gte: sejak }, peristiwa: "EKSPOR" } }),
  ]);
  return {
    emailPerubahan: emailPerubahan.map((e) => e.email).sort(),
    emailAkses: emailAkses.map((e) => e.email).sort(),
    perubahan30,
    gagal30,
    ekspor30,
  };
}

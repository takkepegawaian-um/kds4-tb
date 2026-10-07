"use server";

// Aksi server Data TB: tambah, ubah, hapus (lunak), pulihkan, dan cek NIP kembar.
// Setiap perubahan dicatat di Log perubahan (kolom, nilai lama, nilai baru).

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { dbKeNilai, nilaiKeDb } from "@/lib/data/peta";
import { periksaIsian, SEMUA_KOLOM_FORM, type KolomForm } from "@/lib/data/formulir";
import { daftarPilihanForm } from "@/lib/pengaturan/baca";
import { emailPengguna } from "@/lib/sesi";

export type HasilSimpanPegawai =
  | { ok: true; id: number; peringatan: string[] }
  | { ok: false; pesan: string; galat?: Partial<Record<KolomForm, string>> };

const teks = (v: unknown) => (v === null || v === undefined ? null : String(v));

async function orangDenganNip(nip: string, kecualiId?: number) {
  return prisma.pegawaiTB.findMany({
    where: { nip: nip.trim(), dihapusPada: null, ...(kecualiId ? { id: { not: kecualiId } } : {}) },
    select: { id: true, nama: true, statusAkhir: true },
  });
}

/** Untuk peringatan langsung di form saat NIP diketik. */
export async function cekNip(nip: string, kecualiId?: number) {
  await emailPengguna();
  if (!nip.trim()) return [];
  return orangDenganNip(nip, kecualiId);
}

export async function simpanPegawai(id: number | null, isian: Partial<Record<KolomForm, string>>): Promise<HasilSimpanPegawai> {
  // Di luar try: bila belum login, redirect ke halaman Masuk tidak boleh tertangkap catch.
  const email = await emailPengguna();
  try {
    // Hanya kolom form yang dikenal yang diterima.
    const bersih = Object.fromEntries(SEMUA_KOLOM_FORM.map((k) => [k, typeof isian[k] === "string" ? isian[k] : ""]));

    const lama = id ? await prisma.pegawaiTB.findFirst({ where: { id, dihapusPada: null } }) : null;
    if (id && !lama) return { ok: false, pesan: "Data tidak ditemukan atau sudah dihapus." };
    const nilaiLama = lama ? dbKeNilai(lama) : {};

    const [daftar, kembar] = await Promise.all([
      daftarPilihanForm(),
      bersih.nip ? orangDenganNip(bersih.nip, id ?? undefined) : Promise.resolve([]),
    ]);
    const { nilai, galat, peringatan } = periksaIsian(bersih, daftar, nilaiLama, kembar);
    if (Object.keys(galat).length) return { ok: false, pesan: "Periksa kembali isian yang ditandai merah.", galat };

    const data = nilaiKeDb({ ...nilai, no: null });
    delete (data as Record<string, unknown>).no;

    if (!lama) {
      const { _max } = await prisma.pegawaiTB.aggregate({ _max: { urutan: true, no: true } });
      const baru = await prisma.$transaction(async (tx) => {
        const p = await tx.pegawaiTB.create({
          data: {
            ...data,
            nama: nilai.nama as string,
            nip: nilai.nip as string,
            statusAkhir: nilai.statusAkhir as string,
            no: (_max.no ?? 0) + 1,
            urutan: (_max.urutan ?? 0) + 1,
            dibuatOleh: email,
            diubahOleh: email,
          },
        });
        await tx.logPerubahan.create({
          data: { email, entitas: "PegawaiTB", entitasId: String(p.id), aksi: "TAMBAH", nilaiBaru: `Ditambahkan lewat form: ${p.nama}` },
        });
        return p;
      });
      revalidatePath("/", "layout");
      return { ok: true, id: baru.id, peringatan };
    }

    const berubah = SEMUA_KOLOM_FORM.filter((k) => (nilaiLama as Record<string, unknown>)[k] !== nilai[k]);
    if (berubah.length) {
      await prisma.$transaction([
        prisma.pegawaiTB.update({
          where: { id: lama.id },
          data: { ...Object.fromEntries(berubah.map((k) => [k, (data as Record<string, unknown>)[k]])), diubahOleh: email },
        }),
        prisma.logPerubahan.createMany({
          data: berubah.map((k) => ({
            email,
            entitas: "PegawaiTB",
            entitasId: String(lama.id),
            aksi: "UBAH",
            kolom: k,
            nilaiLama: teks((nilaiLama as Record<string, unknown>)[k]),
            nilaiBaru: teks(nilai[k]),
          })),
        }),
      ]);
      revalidatePath("/", "layout");
    }
    return { ok: true, id: lama.id, peringatan };
  } catch (e) {
    return { ok: false, pesan: e instanceof Error ? e.message : "Terjadi kesalahan yang tidak dikenal." };
  }
}

export async function hapusPegawai(id: number, alasan: string): Promise<{ ok: boolean; pesan?: string }> {
  const email = await emailPengguna();
  const p = await prisma.pegawaiTB.findFirst({ where: { id, dihapusPada: null } });
  if (!p) return { ok: false, pesan: "Data tidak ditemukan atau sudah dihapus." };
  await prisma.$transaction([
    prisma.pegawaiTB.update({ where: { id }, data: { dihapusPada: new Date(), dihapusOleh: email } }),
    prisma.logPerubahan.create({
      data: { email, entitas: "PegawaiTB", entitasId: String(id), aksi: "HAPUS", nilaiBaru: alasan.trim() || null },
    }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function pulihkanPegawai(id: number): Promise<{ ok: boolean; pesan?: string }> {
  const email = await emailPengguna();
  const p = await prisma.pegawaiTB.findFirst({ where: { id, dihapusPada: { not: null } } });
  if (!p) return { ok: false, pesan: "Data tidak ditemukan atau tidak sedang terhapus." };
  await prisma.$transaction([
    prisma.pegawaiTB.update({ where: { id }, data: { dihapusPada: null, dihapusOleh: null, diubahOleh: email } }),
    prisma.logPerubahan.create({ data: { email, entitas: "PegawaiTB", entitasId: String(id), aksi: "PULIHKAN" } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}

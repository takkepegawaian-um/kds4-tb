"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  BATAS_GAGAL,
  buatSesi,
  catatAkses,
  cocokSandi,
  cocokSandiPengganti,
  hapusSesiIni,
  LAMA_KUNCI_MS,
  penggunaSaatIni,
} from "@/lib/auth/sesi";

export type HasilMasuk = { pesan: string } | undefined;

const PESAN_SALAH = "Email atau kata sandi salah.";

/** Hanya alamat di dalam aplikasi ini yang boleh jadi tujuan setelah masuk. */
function tujuanAman(ke: unknown): string {
  const t = typeof ke === "string" ? ke : "";
  return t.startsWith("/") && !t.startsWith("//") && !t.startsWith("/masuk") ? t : "/";
}

export async function masuk(_: HasilMasuk, formData: FormData): Promise<HasilMasuk> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const sandi = String(formData.get("sandi") ?? "").slice(0, 200);
  if (!email || !sandi) return { pesan: "Isi email dan kata sandi." };

  const pengguna = await prisma.pengguna.findUnique({ where: { email } });
  if (!pengguna || !pengguna.aktif) {
    await cocokSandiPengganti(sandi); // supaya lama proses sama dengan email yang terdaftar
    await catatAkses(email, "LOGIN_GAGAL", "Email tidak terdaftar atau nonaktif");
    return { pesan: PESAN_SALAH };
  }

  if (pengguna.terkunciSampai && pengguna.terkunciSampai > new Date()) {
    const menit = Math.ceil((pengguna.terkunciSampai.getTime() - Date.now()) / 60000);
    await catatAkses(email, "LOGIN_DITOLAK", "Akun sedang terkunci");
    return { pesan: `Terlalu banyak percobaan gagal. Coba lagi dalam ${menit} menit.` };
  }

  if (!(await cocokSandi(sandi, pengguna.hashSandi))) {
    const gagal = pengguna.gagalLogin + 1;
    const kunci = gagal >= BATAS_GAGAL;
    await prisma.pengguna.update({
      where: { id: pengguna.id },
      data: { gagalLogin: kunci ? 0 : gagal, terkunciSampai: kunci ? new Date(Date.now() + LAMA_KUNCI_MS) : null },
    });
    await catatAkses(email, kunci ? "AKUN_TERKUNCI" : "LOGIN_GAGAL", `Kata sandi salah (percobaan ${gagal})`);
    return {
      pesan: kunci
        ? `Kata sandi salah ${BATAS_GAGAL} kali. Akun dikunci ${LAMA_KUNCI_MS / 60000} menit.`
        : `${PESAN_SALAH} Sisa percobaan: ${BATAS_GAGAL - gagal}.`,
    };
  }

  await prisma.pengguna.update({
    where: { id: pengguna.id },
    data: { gagalLogin: 0, terkunciSampai: null, loginTerakhir: new Date() },
  });
  await buatSesi(pengguna.id);
  await catatAkses(email, "LOGIN_BERHASIL");
  redirect(tujuanAman(formData.get("ke")));
}

export async function keluar() {
  const p = await penggunaSaatIni();
  await hapusSesiIni();
  if (p) await catatAkses(p.email, "LOGOUT");
  redirect("/masuk?keluar=1");
}

// Pengguna yang sedang memakai aplikasi (dipakai semua aksi yang mengubah data dan ekspor).
// Bila belum login, diarahkan ke halaman Masuk.
import "server-only";
import { wajibLogin } from "@/lib/auth/sesi";

/** Email admin yang sedang login. Hanya admin yang boleh mengubah atau mengekspor data. */
export async function emailPengguna(): Promise<string> {
  return (await wajibLogin("ADMIN")).email;
}

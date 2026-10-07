// Gerbang depan: setiap permintaan tanpa cookie sesi yang sah (tanda tangan benar dan
// belum kedaluwarsa) diarahkan ke halaman Masuk. Pemeriksaan lengkap ke database
// (sesi masih ada, akun aktif) tetap dilakukan di setiap halaman dan aksi.
import { NextResponse, type NextRequest } from "next/server";
import { bacaCookie, NAMA_COOKIE, rahasiaSesi } from "@/lib/auth/token";

export function proxy(request: NextRequest) {
  const sah = bacaCookie(request.cookies.get(NAMA_COOKIE)?.value, rahasiaSesi());
  if (sah) return NextResponse.next();

  const url = request.nextUrl.clone();
  const tujuan = request.nextUrl.pathname + request.nextUrl.search;
  url.pathname = "/masuk";
  url.search = tujuan && tujuan !== "/" ? `?ke=${encodeURIComponent(tujuan)}` : "";
  const res = NextResponse.redirect(url);
  if (request.cookies.has(NAMA_COOKIE)) res.cookies.delete(NAMA_COOKIE);
  return res;
}

export const config = {
  // Semua halaman kecuali halaman Masuk dan berkas statis (gambar, ikon, skrip, gaya).
  matcher: ["/((?!masuk|_next/static|_next/image|icon.png|logo.png|favicon.ico|robots.txt).*)"],
};

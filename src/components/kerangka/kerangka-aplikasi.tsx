"use client";

// Kerangka semua halaman setelah login: sidebar kiri, bilah atas, dan isi.
// Di HP, sidebar disembunyikan dan dibuka lewat tombol menu.

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { Menu, Search, X } from "lucide-react";
import clsx from "clsx";
import { MENU } from "./menu";

export function KerangkaAplikasi({
  children,
  infoTanggal,
  kartuPengguna,
  avatar,
}: {
  children: ReactNode;
  /** Pil "Tanggal acuan" di bilah atas (dirender di server). */
  infoTanggal: ReactNode;
  /** Kartu pengguna di bawah sidebar: nama, email, ganti sandi, keluar (dirender di server). */
  kartuPengguna: ReactNode;
  /** Lingkaran inisial pengguna di bilah atas. */
  avatar: ReactNode;
}) {
  const [menuTerbuka, setMenuTerbuka] = useState(false);
  // Menu HP ditutup setiap kali salah satu menu diklik.
  const tutup = () => setMenuTerbuka(false);

  return (
    <div className="flex min-h-screen">
      {/* Lapisan gelap di HP saat menu terbuka */}
      {menuTerbuka && (
        <button
          aria-label="Tutup menu"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMenuTerbuka(false)}
        />
      )}

      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col bg-hijau-900 text-krem-100 shadow-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:shadow-none",
          menuTerbuka ? "flex" : "hidden",
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <Image src="/logo.png" alt="Logo KDS4" width={36} height={42} priority style={{ width: 36, height: "auto" }} />
          <div className="leading-tight">
            <div className="text-lg font-bold tracking-wide text-white">KDS4</div>
            <div className="text-xs text-krem-200/80">Monitor Tugas Belajar</div>
          </div>
          <button
            className="ml-auto rounded-md p-2 text-krem-200 hover:bg-hijau-800 lg:hidden"
            aria-label="Tutup menu"
            onClick={() => setMenuTerbuka(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          {/* Penanda menu aktif membaca alamat halaman, jadi dibungkus Suspense
              supaya kerangka halaman tetap bisa tampil seketika. */}
          <Suspense fallback={<DaftarMenu aktif={null} onPilih={tutup} />}>
            <DaftarMenuAktif onPilih={tutup} />
          </Suspense>
        </nav>

        <div className="border-t border-hijau-800 px-5 py-4">{kartuPengguna}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-krem-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            className="rounded-md p-2 text-hijau-900 hover:bg-krem-100 lg:hidden"
            aria-label="Buka menu"
            onClick={() => setMenuTerbuka(true)}
          >
            <Menu size={22} />
          </button>

          <form action="/data-tb" className="relative hidden max-w-md flex-1 sm:block" role="search">
            <Search size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
            <input
              name="q"
              type="search"
              placeholder="Cari NIP atau nama pegawai…"
              className="h-10 w-full rounded-lg border border-krem-200 bg-krem-50 pr-3 pl-10 text-sm outline-none placeholder:text-gray-400 focus:border-hijau-700 focus:bg-white"
            />
          </form>

          <div className="ml-auto flex items-center gap-3">
            {infoTanggal}
            {avatar}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function DaftarMenuAktif({ onPilih }: { onPilih: () => void }) {
  return <DaftarMenu aktif={usePathname()} onPilih={onPilih} />;
}

function DaftarMenu({ aktif: pathname, onPilih }: { aktif: string | null; onPilih: () => void }) {
  return MENU.map((kelompok) => (
    <div key={kelompok.judul} className="mt-4 first:mt-1">
      <div className="px-3 pb-2 text-[11px] font-semibold tracking-[0.12em] text-krem-200/60 uppercase">
        {kelompok.judul}
      </div>
      <ul className="space-y-1">
        {kelompok.item.map(({ href, label, ikon: Ikon }) => {
          const aktif = pathname !== null && (href === "/" ? pathname === "/" : pathname.startsWith(href));
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onPilih}
                className={clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors",
                  aktif
                    ? "bg-hijau-800 font-semibold text-white shadow-[inset_3px_0_0_var(--color-emas-400)]"
                    : "text-krem-100/90 hover:bg-hijau-800/60 hover:text-white",
                )}
              >
                <Ikon size={18} className={aktif ? "text-emas-400" : "text-krem-200/70"} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  ));
}

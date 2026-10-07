"use client";

// Di HP panel saringan dilipat supaya daftar orang langsung terlihat.
// Di layar lebar panel selalu tampil.

import { useState, type ReactNode } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";

export function PanelSaring({ children, jumlahAktif }: { children: ReactNode; jumlahAktif: number }) {
  const [terbuka, setTerbuka] = useState(jumlahAktif > 0);
  return (
    <div>
      <button
        type="button"
        onClick={() => setTerbuka((t) => !t)}
        aria-expanded={terbuka}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-krem-300 bg-white px-4 text-[15px] font-semibold text-hijau-900 md:hidden"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={16} /> Saring dan cari
          {jumlahAktif > 0 && <span className="rounded-full bg-emas-400 px-2 text-xs">{jumlahAktif}</span>}
        </span>
        <ChevronDown size={18} className={clsx("transition-transform", terbuka && "rotate-180")} />
      </button>
      <div className={clsx(terbuka ? "mt-3 block" : "hidden", "md:mt-0 md:block")}>{children}</div>
    </div>
  );
}

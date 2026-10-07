// Komponen tampilan dasar yang dipakai di semua halaman.
import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import type { Level } from "@/lib/aturan/pengaturan";

export function JudulHalaman({
  judul,
  keterangan,
  aksi,
}: {
  judul: string;
  keterangan?: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-hijau-900 sm:text-[28px]">{judul}</h1>
      {keterangan && <p className="mt-1 text-[15px] text-gray-600">{keterangan}</p>}
      {aksi && <div className="mt-4 flex flex-wrap gap-3">{aksi}</div>}
    </div>
  );
}

const gayaTombol = {
  utama: "bg-hijau-900 text-white hover:bg-hijau-800 border-hijau-900",
  garis: "bg-white text-hijau-900 border-krem-300 hover:border-hijau-900",
  bahaya: "bg-white text-kritis-fg border-kritis-bg hover:border-kritis-fg",
};

type VarianTombol = keyof typeof gayaTombol;
const kelasTombol = (varian: VarianTombol, className?: string) =>
  clsx(
    "inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-5 text-[13px] font-semibold tracking-[0.08em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    gayaTombol[varian],
    className,
  );

export function Tombol({ varian = "garis", className, ...props }: ComponentProps<"button"> & { varian?: VarianTombol }) {
  return <button className={kelasTombol(varian, className)} {...props} />;
}

export function TombolTautan({
  varian = "garis",
  className,
  ...props
}: ComponentProps<typeof Link> & { varian?: VarianTombol }) {
  return <Link className={kelasTombol(varian, className)} {...props} />;
}

export function Kartu({ className, ...props }: ComponentProps<"section">) {
  // min-w-0: supaya kartu di dalam grid bisa menyusut di HP (tabel lebar digeser di dalam kartu).
  return <section className={clsx("min-w-0 rounded-xl border border-krem-200 bg-white p-5 sm:p-6", className)} {...props} />;
}

export function JudulKartu({ children, keterangan }: { children: ReactNode; keterangan?: ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-hijau-900">{children}</h2>
      {keterangan && <p className="mt-0.5 text-sm text-gray-500">{keterangan}</p>}
    </div>
  );
}

export function KotakInfo({ children, nada = "info" }: { children: ReactNode; nada?: "info" | "peringatan" }) {
  return (
    <div
      className={clsx(
        "rounded-xl border px-4 py-3 text-[15px]",
        nada === "info" ? "border-emas-400/60 bg-emas-300/30 text-hijau-900" : "border-waspada-bg bg-waspada-bg/40 text-waspada-fg",
      )}
    >
      {children}
    </div>
  );
}

/** Tampilan sementara saat data sedang dimuat. */
export function MemuatData({ baris = 4 }: { baris?: number }) {
  return (
    <div className="animate-pulse space-y-3" aria-label="Memuat data">
      {Array.from({ length: baris }, (_, i) => (
        <div key={i} className="h-10 rounded-lg bg-krem-100" />
      ))}
    </div>
  );
}

/** Penanda halaman yang belum dibangun. */
export function SegeraHadir({ tahap, isi }: { tahap: number; isi: ReactNode }) {
  return (
    <Kartu className="border-dashed">
      <div className="text-sm font-semibold tracking-[0.08em] text-emas-600 uppercase">Dibangun di Tahap {tahap}</div>
      <div className="mt-2 text-[15px] text-gray-700">{isi}</div>
    </Kartu>
  );
}

export { LEVEL } from "@/lib/aturan/pengaturan";

const gayaLevel: Record<Level, string> = {
  Kritis: "bg-kritis-bg text-kritis-fg",
  Waspada: "bg-waspada-bg text-waspada-fg",
  Perhatian: "bg-perhatian-bg text-perhatian-fg",
  Aman: "bg-aman-bg text-aman-fg",
};

export function LencanaLevel({ level }: { level: Level }) {
  return (
    <span className={clsx("inline-flex rounded-full px-3 py-1 text-xs font-semibold", gayaLevel[level])}>{level}</span>
  );
}

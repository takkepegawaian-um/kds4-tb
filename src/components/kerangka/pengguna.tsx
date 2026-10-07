// Bagian kerangka yang membaca sesi login (dirender di server, di dalam Suspense).
import Link from "next/link";
import { KeyRound, LogOut } from "lucide-react";
import { keluar } from "@/app/masuk/aksi";
import { wajibLogin } from "@/lib/auth/sesi";

const inisial = (nama: string) => nama.trim().charAt(0).toUpperCase() || "?";

export async function KartuPengguna() {
  const p = await wajibLogin();
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-emas-400 font-bold text-hijau-900">{inisial(p.nama)}</div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-white">{p.nama}</div>
          <div className="truncate text-xs text-krem-200/70">{p.email}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Link href="/akun" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-hijau-700 px-2 py-2 text-xs font-medium text-krem-100 hover:bg-hijau-800">
          <KeyRound size={14} /> Kata sandi
        </Link>
        <form action={keluar} className="flex-1">
          <button className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-hijau-700 px-2 py-2 text-xs font-medium text-krem-100 hover:bg-hijau-800">
            <LogOut size={14} /> Keluar
          </button>
        </form>
      </div>
    </div>
  );
}

export async function AvatarPengguna() {
  const p = await wajibLogin();
  return (
    <Link href="/akun" title={`${p.nama} (${p.email})`} className="grid size-9 place-items-center rounded-full bg-hijau-900 font-semibold text-white">
      {inisial(p.nama)}
    </Link>
  );
}

export function AvatarKosong() {
  return <div className="size-9 rounded-full bg-krem-200" />;
}

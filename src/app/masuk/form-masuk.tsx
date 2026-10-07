"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useState } from "react";
import { CheckCircle2, Eye, EyeOff, XCircle } from "lucide-react";
import { Tombol } from "@/components/ui";
import { masuk } from "./aksi";

export function FormMasuk() {
  const params = useSearchParams();
  const [hasil, aksi, sedangMasuk] = useActionState(masuk, undefined);
  const [lihat, setLihat] = useState(false);
  const kelas = "h-12 w-full rounded-lg border border-krem-300 bg-white px-3 text-base outline-none focus:border-hijau-700 focus:ring-2 focus:ring-hijau-700/15";

  return (
    <form action={aksi} className="grid gap-4">
      <input type="hidden" name="ke" value={params.get("ke") ?? "/"} />
      {params.get("keluar") === "1" && !hasil && (
        <p className="flex items-center gap-2 rounded-lg bg-aman-bg/40 px-3 py-2 text-sm text-aman-fg">
          <CheckCircle2 size={16} /> Anda sudah keluar.
        </p>
      )}
      {hasil?.pesan && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-kritis-bg/40 px-3 py-2 text-sm text-kritis-fg">
          <XCircle size={16} className="mt-0.5 shrink-0" /> {hasil.pesan}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required className={kelas} placeholder="admin@kds.um.ac.id" />
      </div>
      <div>
        <label htmlFor="sandi" className="mb-1 block text-sm font-medium text-gray-700">Kata sandi</label>
        <div className="relative">
          <input id="sandi" name="sandi" type={lihat ? "text" : "password"} autoComplete="current-password" required className={`${kelas} pr-12`} />
          <button type="button" onClick={() => setLihat((x) => !x)} aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:bg-krem-100">
            {lihat ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
      <Tombol type="submit" varian="utama" disabled={sedangMasuk} className="mt-2 h-12 w-full">
        {sedangMasuk ? "Memeriksa…" : "Masuk"}
      </Tombol>
    </form>
  );
}

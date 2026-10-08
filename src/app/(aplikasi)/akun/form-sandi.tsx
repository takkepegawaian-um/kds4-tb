"use client";

import { useActionState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Tombol } from "@/components/ui";
import { gantiSandi, keluarSemuaPerangkat, type HasilGanti } from "./aksi";

function Pesan({ h }: { h: HasilGanti }) {
  if (!h) return null;
  return (
    <p role="status" className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${h.ok ? "bg-aman-bg/40 text-aman-fg" : "bg-kritis-bg/40 text-kritis-fg"}`}>
      {h.ok ? <CheckCircle2 size={16} className="mt-0.5" /> : <XCircle size={16} className="mt-0.5" />} {h.pesan}
    </p>
  );
}

export function FormSandi({ panjangMin }: { panjangMin: number }) {
  const [hasil, aksi, proses] = useActionState(gantiSandi, undefined);
  const kelas = "h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]";
  return (
    <form action={aksi} className="grid max-w-md gap-4" key={hasil?.ok ? "selesai" : "isi"}>
      <Pesan h={hasil} />
      <div>
        <label htmlFor="lama" className="mb-1 block text-sm font-medium text-gray-700">Kata sandi sekarang</label>
        <input id="lama" name="lama" type="password" autoComplete="current-password" required className={kelas} />
      </div>
      <div>
        <label htmlFor="baru" className="mb-1 block text-sm font-medium text-gray-700">Kata sandi baru</label>
        <input id="baru" name="baru" type="password" autoComplete="new-password" minLength={panjangMin} required className={kelas} />
      </div>
      <div>
        <label htmlFor="ulang" className="mb-1 block text-sm font-medium text-gray-700">Ulangi kata sandi baru</label>
        <input id="ulang" name="ulang" type="password" autoComplete="new-password" required className={kelas} />
      </div>
      <div>
        <Tombol type="submit" varian="utama" disabled={proses}>{proses ? "Menyimpan…" : "Ganti kata sandi"}</Tombol>
      </div>
    </form>
  );
}

export function TombolKeluarSemua() {
  const [hasil, aksi, proses] = useActionState(keluarSemuaPerangkat, undefined);
  return (
    <form action={aksi} className="grid gap-3">
      <Pesan h={hasil} />
      <div>
        <Tombol type="submit" disabled={proses}>{proses ? "Memproses…" : "Keluarkan semua perangkat lain"}</Tombol>
      </div>
    </form>
  );
}

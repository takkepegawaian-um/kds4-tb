import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, FileText } from "lucide-react";
import { JudulHalaman, JudulKartu, Kartu, MemuatData } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { JENIS_SK } from "@/lib/sk/jenis";

export default function HalamanDaftarSk() {
  return (
    <>
      <JudulHalaman judul="Buat SK" />
      <Suspense fallback={<MemuatData baris={6} />}>
        <IsiDaftar />
      </Suspense>
    </>
  );
}

async function IsiDaftar() {
  await wajibLogin();
  const kelompok = [...new Set(JENIS_SK.map((j) => j.kelompok))];
  return (
    <div className="grid gap-6">
      {kelompok.map((k) => (
        <Kartu key={k}>
          <JudulKartu>{k}</JudulKartu>
          <ul className="grid gap-3 md:grid-cols-2">
            {JENIS_SK.filter((j) => j.kelompok === k).map((j) => (
              <li key={j.id}>
                <Link
                  href={`/sk/${j.id}`}
                  className="flex items-center gap-3 rounded-xl border border-krem-200 p-4 transition-colors hover:border-hijau-900"
                >
                  <FileText size={22} className="shrink-0 text-hijau-700" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-hijau-900">{j.nama}</span>
                    <span className="block text-sm text-gray-600">{j.ringkas}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-gray-400" />
                </Link>
              </li>
            ))}
          </ul>
        </Kartu>
      ))}
    </div>
  );
}

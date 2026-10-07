import { Suspense } from "react";
import { CalendarDays } from "lucide-react";
import { KerangkaAplikasi } from "@/components/kerangka/kerangka-aplikasi";
import { AvatarKosong, AvatarPengguna, KartuPengguna } from "@/components/kerangka/pengguna";
import { tanggalAcuanBerlaku } from "@/lib/pengaturan/baca";
import { formatTanggal } from "@/lib/tanggal";

export default function LayoutAplikasi({ children }: LayoutProps<"/">) {
  return (
    <KerangkaAplikasi
      kartuPengguna={
        <Suspense fallback={<div className="h-20" />}>
          <KartuPengguna />
        </Suspense>
      }
      avatar={
        <Suspense fallback={<AvatarKosong />}>
          <AvatarPengguna />
        </Suspense>
      }
      infoTanggal={
        <Suspense fallback={<PilTanggal teks="Tanggal acuan: …" />}>
          <InfoTanggalAcuan />
        </Suspense>
      }
    >
      {children}
    </KerangkaAplikasi>
  );
}

async function InfoTanggalAcuan() {
  const { tanggal, simulasi } = await tanggalAcuanBerlaku();
  return (
    <PilTanggal
      teks={`${simulasi ? "Simulasi" : "Tanggal acuan"}: ${formatTanggal(tanggal)}`}
      simulasi={simulasi}
    />
  );
}

function PilTanggal({ teks, simulasi }: { teks: string; simulasi?: boolean }) {
  return (
    <span
      className={
        "hidden items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium sm:inline-flex " +
        (simulasi ? "bg-emas-300 text-hijau-900" : "bg-krem-100 text-hijau-900")
      }
      title={simulasi ? "Tanggal acuan diganti di Pengaturan untuk simulasi" : "Hari ini (Asia/Jakarta)"}
    >
      <CalendarDays size={15} />
      {teks}
    </span>
  );
}

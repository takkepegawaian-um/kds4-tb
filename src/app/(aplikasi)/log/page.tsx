import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import clsx from "clsx";
import { JudulHalaman, Kartu, KotakInfo, MemuatData, TombolTautan } from "@/components/ui";
import { PanelSaring } from "@/components/panel-saring";
import {
  bacaFilterLog,
  muatLogAkses,
  muatLogPerubahan,
  PER_HALAMAN_LOG,
  ringkasanLog,
  type FilterLog,
} from "@/lib/data/log";
import {
  LABEL_AKSI_PERUBAHAN,
  LABEL_ENTITAS,
  LABEL_PERISTIWA,
  labelKolom,
  PERISTIWA_PENTING,
  ringkasPerangkat,
} from "@/lib/data/log-label";
import { ISIAN } from "@/lib/data/formulir";
import { formatTanggal, formatWaktu } from "@/lib/tanggal";

type Parameter = Record<string, string | string[] | undefined>;

export default function HalamanLog({ searchParams }: PageProps<"/log">) {
  return (
    <>
      <JudulHalaman
        judul="Log Aktivitas"
      />
      <Suspense fallback={<MemuatData baris={10} />}>
        <IsiLog searchParams={searchParams} />
      </Suspense>
    </>
  );
}

function urlLog(f: FilterLog, ganti: Partial<Record<keyof FilterLog, string | number | undefined>>, dasar = "/log") {
  const u = new URLSearchParams();
  const gabung = { ...f, ...ganti };
  for (const [k, v] of Object.entries(gabung)) {
    if (v === undefined || v === "" || (k === "hal" && v === 1) || (k === "tab" && v === "perubahan")) continue;
    u.set(k, String(v));
  }
  const q = u.toString();
  return q ? `${dasar}?${q}` : dasar;
}

async function IsiLog({ searchParams }: { searchParams: Promise<Parameter> }) {
  const f = bacaFilterLog(await searchParams);
  const [ringkas, data] = await Promise.all([
    ringkasanLog(),
    f.tab === "akses" ? muatLogAkses(f) : muatLogPerubahan(f),
  ]);
  const jumlahHal = Math.max(1, Math.ceil(data.total / PER_HALAMAN_LOG));
  const pilihanAksi = f.tab === "akses" ? LABEL_PERISTIWA : LABEL_AKSI_PERUBAHAN;
  const pilihanEmail = f.tab === "akses" ? ringkas.emailAkses : ringkas.emailPerubahan;
  const lbl = "mb-1 block text-sm font-medium text-gray-700";
  const masukan = "h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]";
  const adaFilter = !!(f.q || f.aksi || f.email || f.dari || f.sampai);

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Ringkas label="Perubahan data (30 hari)" nilai={ringkas.perubahan30} />
        <Ringkas label="Gagal masuk / ditolak (30 hari)" nilai={ringkas.gagal30} penting={ringkas.gagal30 > 0} />
        <Ringkas label="Ekspor data (30 hari)" nilai={ringkas.ekspor30} />
      </div>

      <nav className="flex gap-2 border-b border-krem-200" aria-label="Jenis log">
        {(["perubahan", "akses"] as const).map((t) => (
          <Link
            key={t}
            href={urlLog({ ...f, q: "", aksi: "", email: "", hal: 1 }, { tab: t })}
            className={clsx(
              "-mb-px border-b-2 px-4 py-3 text-[15px] font-semibold",
              f.tab === t ? "border-hijau-900 text-hijau-900" : "border-transparent text-gray-500 hover:text-hijau-900",
            )}
          >
            {t === "perubahan" ? "Riwayat perubahan data" : "Log akses"}
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap gap-3">
        <TombolTautan href={urlLog(f, { hal: undefined }, "/log/ekspor")} prefetch={false}>
          <FileDown size={16} /> Ekspor Excel ({Math.min(data.total, 20000)} baris)
        </TombolTautan>
      </div>

      <PanelSaring jumlahAktif={[f.q, f.aksi, f.email, f.dari, f.sampai].filter(Boolean).length}>
        <Kartu className="p-4 sm:p-5">
          <form action="/log" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
            {f.tab === "akses" && <input type="hidden" name="tab" value="akses" />}
            <div className="sm:col-span-2">
              <label className={lbl} htmlFor="q">{f.tab === "akses" ? "Cari email, IP, atau keterangan" : "Cari nama, NIP, atau isi nilai"}</label>
              <input id="q" name="q" type="search" defaultValue={f.q} className={masukan} />
            </div>
            <div>
              <label className={lbl} htmlFor="aksi">{f.tab === "akses" ? "Peristiwa" : "Tindakan"}</label>
              <select id="aksi" name="aksi" defaultValue={f.aksi} className={masukan}>
                <option value="">Semua</option>
                {Object.entries(pilihanAksi).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl} htmlFor="email">Pengguna</label>
              <select id="email" name="email" defaultValue={f.email} className={masukan}>
                <option value="">Semua</option>
                {pilihanEmail.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl} htmlFor="dari">Dari tanggal</label>
              <input id="dari" name="dari" placeholder="dd/mm/yyyy" inputMode="numeric" defaultValue={f.dari} className={masukan} />
            </div>
            <div>
              <label className={lbl} htmlFor="sampai">Sampai tanggal</label>
              <input id="sampai" name="sampai" placeholder="dd/mm/yyyy" inputMode="numeric" defaultValue={f.sampai} className={masukan} />
            </div>
            <div className="flex gap-3 sm:col-span-2 lg:col-span-6 lg:justify-end">
              <button className="h-11 rounded-lg bg-hijau-900 px-5 text-[13px] font-semibold tracking-[0.08em] text-white uppercase hover:bg-hijau-800">Terapkan</button>
              <Link href={f.tab === "akses" ? "/log?tab=akses" : "/log"} className="inline-flex h-11 items-center rounded-lg border border-krem-300 bg-white px-5 text-[13px] font-semibold tracking-[0.08em] text-hijau-900 uppercase">Reset</Link>
            </div>
          </form>
        </Kartu>
      </PanelSaring>

      <p className="text-[15px]">
        <b>{data.total}</b> catatan{adaFilter && " cocok dengan saringan"}
        {(f.dari || f.sampai) && ` (${f.dari || "awal"} s.d. ${f.sampai || "sekarang"}, WIB)`}.
      </p>

      {data.total === 0 ? (
        <KotakInfo>Tidak ada catatan yang cocok.</KotakInfo>
      ) : f.tab === "akses" ? (
        <TabelAkses baris={(data as Awaited<ReturnType<typeof muatLogAkses>>).baris} />
      ) : (
        <TabelPerubahan baris={(data as Awaited<ReturnType<typeof muatLogPerubahan>>).baris} />
      )}

      {jumlahHal > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Halaman">
          {f.hal > 1 ? <TombolTautan href={urlLog(f, { hal: f.hal - 1 })}><ChevronLeft size={16} /> Lebih baru</TombolTautan> : <span />}
          <span className="text-sm text-gray-600">Halaman {f.hal} dari {jumlahHal}</span>
          {f.hal < jumlahHal ? <TombolTautan href={urlLog(f, { hal: f.hal + 1 })}>Lebih lama <ChevronRight size={16} /></TombolTautan> : <span />}
        </nav>
      )}
    </div>
  );
}

function Ringkas({ label, nilai, penting }: { label: string; nilai: number; penting?: boolean }) {
  return (
    <div className={clsx("rounded-xl border bg-white px-4 py-3", penting ? "border-kritis-bg" : "border-krem-200")}>
      <div className="text-sm text-gray-600">{label}</div>
      <div className={clsx("text-2xl font-bold tabular-nums", penting ? "text-kritis-fg" : "text-hijau-900")}>{nilai}</div>
    </div>
  );
}

function Nilai({ kolom, v }: { kolom: string | null; v: string | null }) {
  if (v === null || v === "") return <span className="text-gray-400 italic">kosong</span>;
  const def = kolom ? ISIAN[kolom as keyof typeof ISIAN] : undefined;
  return <>{def?.isian.jenis === "tanggal" ? formatTanggal(v) : v}</>;
}

type BarisPerubahan = Awaited<ReturnType<typeof muatLogPerubahan>>["baris"][number];

function Objek({ b }: { b: BarisPerubahan }) {
  if (b.pegawai) {
    return (
      <>
        <Link href={`/data-tb/${b.pegawai.id}`} className="font-semibold text-hijau-900 hover:underline">{b.pegawai.nama}</Link>
        <div className="font-mono text-xs text-gray-500">
          {b.pegawai.nip}
          {b.pegawai.dihapusPada && <span className="ml-1 font-sans text-kritis-fg">(terhapus)</span>}
        </div>
      </>
    );
  }
  return (
    <span className="text-gray-700">
      {LABEL_ENTITAS[b.entitas] ?? b.entitas} <span className="text-xs text-gray-500">#{b.entitasId}</span>
    </span>
  );
}

function Rincian({ b }: { b: BarisPerubahan }): ReactNode {
  if (b.kolom) {
    return (
      <>
        <b>{labelKolom(b.kolom)}:</b>{" "}
        <span className="text-kritis-fg line-through"><Nilai kolom={b.kolom} v={b.nilaiLama} /></span> →{" "}
        <span className="text-aman-fg"><Nilai kolom={b.kolom} v={b.nilaiBaru} /></span>
      </>
    );
  }
  return <span className="text-gray-700">{b.nilaiBaru}</span>;
}

function TabelPerubahan({ baris }: { baris: BarisPerubahan[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-krem-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-krem-200 bg-krem-50">
            <tr className="text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase">
              <th className="px-3 py-3 whitespace-nowrap">Waktu</th>
              <th className="px-3 py-3">Oleh</th>
              <th className="px-3 py-3">Tindakan</th>
              <th className="px-3 py-3">Data</th>
              <th className="px-3 py-3">Perubahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-krem-100 align-top">
            {baris.map((b) => (
              <tr key={b.id}>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{formatWaktu(b.waktu)}</td>
                <td className="px-3 py-2.5 text-gray-600">{b.email}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded bg-krem-100 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-hijau-900">
                    {LABEL_AKSI_PERUBAHAN[b.aksi] ?? b.aksi}
                  </span>
                </td>
                <td className="px-3 py-2.5"><Objek b={b} /></td>
                <td className="px-3 py-2.5"><Rincian b={b} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {baris.map((b) => (
          <li key={b.id} className="rounded-xl border border-krem-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between gap-2 text-xs text-gray-500">
              <span>{formatWaktu(b.waktu)}</span>
              <span className="rounded bg-krem-100 px-2 py-0.5 font-semibold text-hijau-900">{LABEL_AKSI_PERUBAHAN[b.aksi] ?? b.aksi}</span>
            </div>
            <div className="mt-2"><Objek b={b} /></div>
            <div className="mt-1"><Rincian b={b} /></div>
            <div className="mt-1 text-xs text-gray-500">oleh {b.email}</div>
          </li>
        ))}
      </ul>
    </>
  );
}

type BarisAkses = Awaited<ReturnType<typeof muatLogAkses>>["baris"][number];

function LabelPeristiwa({ p }: { p: string }) {
  const penting = PERISTIWA_PENTING.has(p);
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold whitespace-nowrap", penting ? "bg-kritis-bg/60 text-kritis-fg" : "bg-krem-100 text-hijau-900")}>
      {penting && <AlertTriangle size={12} />}
      {LABEL_PERISTIWA[p] ?? p}
    </span>
  );
}

function TabelAkses({ baris }: { baris: BarisAkses[] }) {
  return (
    <>
      <div className="hidden overflow-x-auto rounded-xl border border-krem-200 bg-white md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-krem-200 bg-krem-50">
            <tr className="text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase">
              <th className="px-3 py-3 whitespace-nowrap">Waktu</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Peristiwa</th>
              <th className="px-3 py-3">Keterangan</th>
              <th className="px-3 py-3">IP</th>
              <th className="px-3 py-3">Perangkat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-krem-100 align-top">
            {baris.map((b) => (
              <tr key={b.id}>
                <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{formatWaktu(b.waktu)}</td>
                <td className="px-3 py-2.5">{b.email}</td>
                <td className="px-3 py-2.5"><LabelPeristiwa p={b.peristiwa} /></td>
                <td className="px-3 py-2.5 text-gray-700">{b.keterangan}</td>
                <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{b.ip ?? "–"}</td>
                <td className="px-3 py-2.5 text-gray-600" title={b.userAgent ?? ""}>{ringkasPerangkat(b.userAgent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {baris.map((b) => (
          <li key={b.id} className="rounded-xl border border-krem-200 bg-white p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500">{formatWaktu(b.waktu)}</span>
              <LabelPeristiwa p={b.peristiwa} />
            </div>
            <div className="mt-1 font-medium">{b.email}</div>
            {b.keterangan && <div className="text-gray-700">{b.keterangan}</div>}
            <div className="mt-1 text-xs text-gray-500">{ringkasPerangkat(b.userAgent)} · {b.ip ?? "IP –"}</div>
          </li>
        ))}
      </ul>
    </>
  );
}

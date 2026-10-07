// Grafik batang horizontal bertumpuk (HTML biasa, dirender di server).
// Setiap segmen adalah tautan ke daftar orang di baliknya.
// Aksesibilitas: legenda selalu ada, angka ditulis langsung di batang bila muat,
// total di ujung kanan, keterangan saat diarahkan, dan tabel cadangan.

import Link from "next/link";

export type SegmenBatang = { seri: string; nilai: number; href: string };
export type BarisBatang = { label: string; segmen: SegmenBatang[]; hrefTotal?: string };
export type Seri = { nama: string; warna: string };

export function GrafikBatang({
  judul,
  seri,
  baris,
  satuan = "orang",
}: {
  judul: string;
  seri: Seri[];
  baris: BarisBatang[];
  satuan?: string;
}) {
  const total = (b: BarisBatang) => b.segmen.reduce((t, s) => t + s.nilai, 0);
  const maks = Math.max(1, ...baris.map(total));
  const warna = Object.fromEntries(seri.map((s) => [s.nama, s.warna]));

  return (
    <figure aria-label={judul}>
      <figcaption className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
        {seri.map((s) => (
          <span key={s.nama} className="inline-flex items-center gap-1.5">
            <span className="inline-block size-3 rounded-sm" style={{ background: s.warna }} aria-hidden />
            {s.nama}
          </span>
        ))}
        <span className="text-gray-400">· klik batang untuk melihat daftar orangnya</span>
      </figcaption>

      <ul className="space-y-2.5">
        {baris.map((b) => {
          const t = total(b);
          return (
            <li key={b.label} className="grid grid-cols-[minmax(0,1fr)] gap-1 sm:grid-cols-[minmax(160px,38%)_minmax(0,1fr)_3rem] sm:items-center sm:gap-3">
              <div className="text-sm leading-snug text-gray-800">
                {b.label}
                {/* Di HP total ditulis di samping label (kolom total hanya tampil di layar lebar). */}
                <span className="ml-1 font-semibold text-gray-900 sm:hidden">· {t}</span>
              </div>
              <div className="flex h-6 items-center gap-[2px]">
                {t === 0 ? (
                  <span className="h-full w-[2px] rounded-sm bg-krem-200" aria-hidden />
                ) : (
                  b.segmen
                    .filter((s) => s.nilai > 0)
                    .map((s, i, semua) => {
                      const lebar = (s.nilai / maks) * 100;
                      const muat = lebar >= 6;
                      return (
                        <Link
                          key={s.seri}
                          href={s.href}
                          prefetch={false}
                          className={
                            "group/seg relative flex h-full min-w-[4px] items-center justify-center text-[11px] font-semibold text-white outline-offset-2 hover:brightness-110 " +
                            (i === 0 ? "rounded-l-[4px] " : "") +
                            (i === semua.length - 1 ? "rounded-r-[4px]" : "")
                          }
                          style={{ width: `${lebar}%`, background: warna[s.seri] }}
                          aria-label={`${b.label}: ${s.seri} ${s.nilai} ${satuan}`}
                        >
                          {muat && s.nilai}
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden -translate-x-1/2 rounded-md bg-hijau-950 px-2.5 py-1.5 text-xs font-normal whitespace-nowrap text-white shadow-lg group-hover/seg:block group-focus-visible/seg:block"
                          >
                            <b>{s.seri}</b>: {s.nilai} {satuan} · klik untuk daftar
                          </span>
                        </Link>
                      );
                    })
                )}
              </div>
              <div className="hidden text-right text-sm font-semibold text-gray-900 tabular-nums sm:block">
                {b.hrefTotal && t > 0 ? (
                  <Link href={b.hrefTotal} prefetch={false} className="hover:underline">{t}</Link>
                ) : (
                  t
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-hijau-700">Lihat sebagai tabel</summary>
        <table className="mt-2 w-full">
          <thead>
            <tr className="border-b border-krem-200 text-left text-xs text-gray-500 uppercase">
              <th className="py-1.5 pr-2">{judul}</th>
              {seri.map((s) => (
                <th key={s.nama} className="py-1.5 pr-2 text-right">{s.nama}</th>
              ))}
              <th className="py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-krem-100">
            {baris.map((b) => (
              <tr key={b.label}>
                <td className="py-1.5 pr-2">{b.label}</td>
                {seri.map((s) => {
                  const seg = b.segmen.find((x) => x.seri === s.nama);
                  return (
                    <td key={s.nama} className="py-1.5 pr-2 text-right tabular-nums">
                      {seg && seg.nilai > 0 ? <Link href={seg.href} prefetch={false} className="underline">{seg.nilai}</Link> : 0}
                    </td>
                  );
                })}
                <td className="py-1.5 text-right font-semibold tabular-nums">{total(b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

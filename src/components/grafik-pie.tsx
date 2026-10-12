// Diagram lingkaran (donat) dengan irisan yang bisa diklik (dirender di server).
// Setiap irisan dan baris legenda adalah tautan ke daftar orang di baliknya.
// Aksesibilitas: legenda selalu ada dengan jumlah dan persen (warna bukan satu-satunya
// pembeda), jumlah total di tengah, dan keterangan saat diarahkan.

import Link from "next/link";

export type IrisanPie = { nama: string; nilai: number; href: string; warna: string };

const PUSAT = 60;
const LUAR = 56;
const DALAM = 35;

const titik = (r: number, sudut: number) => `${(PUSAT + r * Math.cos(sudut)).toFixed(3)} ${(PUSAT + r * Math.sin(sudut)).toFixed(3)}`;

function jalurIrisan(a0: number, a1: number) {
  const besar = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${titik(LUAR, a0)} A ${LUAR} ${LUAR} 0 ${besar} 1 ${titik(LUAR, a1)} L ${titik(DALAM, a1)} A ${DALAM} ${DALAM} 0 ${besar} 0 ${titik(DALAM, a0)} Z`;
}

const persen = (n: number, total: number) => {
  if (total === 0 || n === 0) return "0%";
  const p = (n / total) * 100;
  return p < 1 ? "<1%" : `${p.toLocaleString("id-ID", { maximumFractionDigits: p < 10 ? 1 : 0 })}%`;
};

export function GrafikPie({
  judul,
  irisan,
  satuan = "orang",
  sembunyikanNol = [],
}: {
  judul: string;
  irisan: IrisanPie[];
  satuan?: string;
  /** Nama irisan yang tidak ditulis di legenda bila nilainya 0 */
  sembunyikanNol?: string[];
}) {
  const total = irisan.reduce((t, x) => t + x.nilai, 0);
  const tampil = irisan.filter((x) => x.nilai > 0 || !sembunyikanNol.includes(x.nama));

  // Sudut mulai dari atas (jam 12), searah jarum jam.
  const berisi = irisan.filter((x) => x.nilai > 0);
  const bidang = berisi.map((x, i) => {
    const sebelum = berisi.slice(0, i).reduce((t, y) => t + y.nilai, 0);
    const a0 = -Math.PI / 2 + (sebelum / total) * Math.PI * 2;
    return { ...x, a0, a1: a0 + (x.nilai / total) * Math.PI * 2 };
  });

  return (
    <figure aria-label={judul} className="flex flex-wrap items-center gap-x-5 gap-y-3">
      {total === 0 ? (
        <p className="py-6 text-sm text-gray-500">Tidak ada data.</p>
      ) : (
        <>
          <svg viewBox="0 0 120 120" className="size-28 shrink-0" role="img" aria-label={`${judul}: total ${total} ${satuan}`}>
            {bidang.length === 1 ? (
              <Link href={bidang[0].href} prefetch={false} aria-label={`${bidang[0].nama}: ${bidang[0].nilai} ${satuan}`}>
                <circle cx={PUSAT} cy={PUSAT} r={(LUAR + DALAM) / 2} fill="none" stroke={bidang[0].warna} strokeWidth={LUAR - DALAM} className="hover:opacity-85">
                  <title>{`${bidang[0].nama}: ${bidang[0].nilai} ${satuan} (100%)`}</title>
                </circle>
              </Link>
            ) : (
              bidang.map((b) => (
                <Link key={b.nama} href={b.href} prefetch={false} aria-label={`${b.nama}: ${b.nilai} ${satuan}`}>
                  <path d={jalurIrisan(b.a0, b.a1)} fill={b.warna} stroke="#fff" strokeWidth={2} strokeLinejoin="round" className="hover:opacity-85">
                    <title>{`${b.nama}: ${b.nilai} ${satuan} (${persen(b.nilai, total)})`}</title>
                  </path>
                </Link>
              ))
            )}
            <text x={PUSAT} y={PUSAT - 1} textAnchor="middle" dominantBaseline="central" className="fill-gray-900 text-[22px] font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
              {total}
            </text>
            <text x={PUSAT} y={PUSAT + 16} textAnchor="middle" className="fill-gray-500 text-[9px]">
              {satuan}
            </text>
          </svg>

          <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
            {tampil.map((x) => (
              <li key={x.nama} className="flex items-center gap-2">
                <span className="inline-block size-3 shrink-0 rounded-sm" style={{ background: x.warna }} aria-hidden />
                <span className="min-w-0 flex-1 leading-snug text-gray-800">{x.nama}</span>
                <span className="tabular-nums">
                  {x.nilai > 0 ? (
                    <Link href={x.href} prefetch={false} className="font-semibold text-hijau-900 hover:underline">{x.nilai}</Link>
                  ) : (
                    <span className="text-gray-400">0</span>
                  )}
                  <span className="ml-1.5 inline-block w-9 text-right text-xs text-gray-500">{persen(x.nilai, total)}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </figure>
  );
}

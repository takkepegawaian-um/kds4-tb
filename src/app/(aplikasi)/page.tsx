// DASHBOARD (pengganti sheet "Dashboard" di Excel).
// Semua angka bisa diklik untuk membuka daftar orang di baliknya (halaman Data TB
// dengan saringan yang sama persis dengan hitungan angka itu).

import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { AlertOctagon, AlertTriangle, CheckCircle2, ChevronDown, Info, Users, X } from "lucide-react";
import clsx from "clsx";
import { GrafikBatang } from "@/components/grafik-batang";
import { GrafikPie } from "@/components/grafik-pie";
import { JudulHalaman, JudulKartu, Kartu, MemuatData } from "@/components/ui";
import type { Level } from "@/lib/aturan/pengaturan";
import { hitungRekapResmi, hitungRingkasan, type PerJenis } from "@/lib/aturan/ringkasan";
import { KOSONG, type Angka, type Saringan } from "@/lib/aturan/saringan";
import { NEGARA_DALAM_NEGERI } from "@/lib/aturan/sebaran";
import { tautanDaftar } from "@/lib/aturan/saringan-url";
import { wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { acuanDariUrl } from "@/lib/data/acuan";
import { muatSemuaDihitung } from "@/lib/data/pegawai";
import { daftarPilihanForm } from "@/lib/pengaturan/baca";
import { formatTanggal } from "@/lib/tanggal";

// Warna seri (sudah diuji dengan validator palet: lolos uji buta warna dan kontras).
const WARNA_BEBAS = "#0f8a63";
const WARNA_TETAP = "#b98424";
// Beasiswa/Mandiri sudah diuji validator palet; abu-abu = belum ada kategori (bukan seri data).
const WARNA_BIAYA: Record<string, string> = { Beasiswa: "#6d5bb5", Mandiri: "#2a93b8", "Belum jelas": "#9aa3ad", "Belum dikelompokkan": "#cfd4da" };
const WARNA_KAMPUS = "#5b6770";
const WARNA_LEVEL: Record<Exclude<Level, "Aman">, string> = { Kritis: "#d93a3a", Waspada: "#e0a800", Perhatian: "#3a78c2" };

type Parameter = Record<string, string | string[] | undefined>;

/** Tautan ke daftar orang untuk sebuah angka (ikut membawa tanggal acuan simulasi). */
function tautanOrang(s: Saringan, acuan?: string) {
  const t = tautanDaftar(s);
  return acuan ? `${t}${t.includes("?") ? "&" : "?"}acuan=${acuan}` : t;
}

/** Angka yang bisa diklik untuk membuka daftar orangnya. */
function TautanAngka({ a, acuan, className }: { a: Angka; acuan?: string; className?: string }) {
  if (a.jumlah === 0) return <span className={clsx("text-gray-400", className)}>0</span>;
  return (
    <Link href={tautanOrang(a.saringan, acuan)} prefetch={false} className={clsx("font-semibold text-hijau-900 underline-offset-2 hover:underline", className)}>
      {a.jumlah}
    </Link>
  );
}

export default function HalamanRingkasan({ searchParams }: PageProps<"/">) {
  return (
    <>
      <JudulHalaman
        judul="Ringkasan"
      />
      <Suspense fallback={<MemuatData baris={12} />}>
        <IsiDashboard searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function IsiDashboard({ searchParams }: { searchParams: Promise<Parameter> }) {
  const p = await searchParams;
  await connection();
  await wajibLogin();
  const acuan = acuanDariUrl(p);
  const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const filter = { fakultas: satu(p.fakultas), jenis: satu(p.jenis) };

  const [{ baris, pengaturan, tanggalAcuan }, daftar, rekapFakultas, rekapSk, tanggalRekap] = await Promise.all([
    muatSemuaDihitung(acuan),
    daftarPilihanForm(),
    prisma.rekapResmiFakultas.findMany(),
    prisma.rekapPenerbitanSk.findMany({ orderBy: { urutan: "asc" } }),
    prisma.parameter.findUnique({ where: { kunci: "tanggalRekapResmi" } }),
  ]);

  if (baris.length === 0) {
    return (
      <Kartu>
        <p className="text-[15px] text-gray-600">
          Belum ada data pegawai.{" "}
          <Link href="/impor" className="font-semibold text-hijau-900 underline">Impor DATA_TB.xlsx</Link> untuk memulai.
        </p>
      </Kartu>
    );
  }

  const r = hitungRingkasan(baris, pengaturan, { statusAkhir: daftar.STATUS_AKHIR, fakultas: daftar.FAKULTAS }, filter);
  const urutanFak = new Map(daftar.FAKULTAS.map((f, i) => [f, i]));
  const rekap = hitungRekapResmi(
    baris,
    [...rekapFakultas].sort((a, b) => (urutanFak.get(a.fakultas) ?? 99) - (urutanFak.get(b.fakultas) ?? 99)),
  );

  const href = (s: Saringan) => tautanOrang(s, acuan);
  const segmenJenis = (pj: PerJenis) => [
    { seri: "Bebas", nilai: pj.bebas.jumlah, href: href(pj.bebas.saringan) },
    { seri: "Tetap", nilai: pj.tetap.jumlah, href: href(pj.tetap.saringan) },
  ];

  const sb = r.sebaran;
  const irisanBiaya = (xs: typeof sb.biayaBebas) =>
    xs.map((x) => ({ nama: x.nama, nilai: x.angka.jumlah, href: href(x.angka.saringan), warna: WARNA_BIAYA[x.nama] }));
  const kampusTeratas = sb.kampus.filter((k) => k.nama !== KOSONG).slice(0, 10);
  const namaNegara = (n: string | null) => (n === null || n === KOSONG ? "Belum diketahui" : n);

  const th = "px-3 py-2 text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase";
  const thK = `${th} text-right`;
  const td = "px-3 py-2 text-[14px]";
  const tdK = `${td} text-right tabular-nums`;

  const ikonLevel: Record<Level, ReactNode> = {
    Kritis: <AlertOctagon size={18} />,
    Waspada: <AlertTriangle size={18} />,
    Perhatian: <Info size={18} />,
    Aman: <CheckCircle2 size={18} />,
  };
  const adaDataTertahan = r.tahap.some((t) => t.rataRataTertahan !== null);
  const gayaLevel: Record<Level, string> = {
    Kritis: "border-l-kritis-fg bg-kritis-bg/25 text-kritis-fg",
    Waspada: "border-l-waspada-fg bg-waspada-bg/30 text-waspada-fg",
    Perhatian: "border-l-perhatian-fg bg-perhatian-bg/40 text-perhatian-fg",
    Aman: "border-l-aman-fg bg-aman-bg/30 text-aman-fg",
  };

  const filterAktif = !!(acuan || filter.fakultas || filter.jenis);
  const sel = "h-10 w-full rounded-lg border border-krem-300 bg-white px-3 text-sm";
  const lbl = "mb-1 block text-xs font-medium text-gray-600";

  return (
    <div className="grid gap-4">
      {/* Filter global (satu baris) */}
      <Kartu className="p-3 sm:p-4">
        <form action="/" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <div>
            <label className={lbl}>Fakultas</label>
            <select name="fakultas" defaultValue={filter.fakultas ?? ""} className={sel}>
              <option value="">Semua fakultas</option>
              {daftar.FAKULTAS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Jenis pelaksanaan</label>
            <select name="jenis" defaultValue={filter.jenis ?? ""} className={sel}>
              <option value="">Bebas dan Tetap</option>
              {daftar.JENIS_PELAKSANAAN.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="acuan" className={lbl}>Tanggal acuan (simulasi)</label>
            <input id="acuan" name="acuan" inputMode="numeric" defaultValue={acuan ? formatTanggal(acuan) : ""}
              placeholder={`${formatTanggal(tanggalAcuan)} (hari ini)`} className={sel} />
          </div>
          <div className="flex gap-2">
            <button className="h-10 rounded-lg bg-hijau-900 px-4 text-[12px] font-semibold tracking-[0.08em] text-white uppercase hover:bg-hijau-800">Terapkan</button>
            <Link href="/" className="inline-flex h-10 items-center rounded-lg border border-krem-300 bg-white px-4 text-[12px] font-semibold tracking-[0.08em] text-hijau-900 uppercase">Reset</Link>
          </div>
        </form>
        {filterAktif && (
          <p className="mt-2 text-sm text-gray-600">
            Per tanggal <b>{formatTanggal(tanggalAcuan)}</b>
            {acuan && (
              <Link href="/" className="ml-2 inline-flex items-center gap-1 rounded-full bg-emas-400 px-2.5 py-0.5 font-semibold text-hijau-900">
                simulasi <X size={13} />
              </Link>
            )}
            {(filter.fakultas || filter.jenis) && <> · disaring: {[filter.fakultas, filter.jenis].filter(Boolean).join(", ")}</>}
          </p>
        )}
      </Kartu>

      {/* Kartu level */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <div className="col-span-2 rounded-xl border border-krem-200 border-l-4 border-l-hijau-900 bg-white p-3 md:col-span-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-hijau-900"><Users size={16} /> Sedang TB</div>
          <div className="mt-0.5 text-3xl font-bold text-hijau-900 tabular-nums">
            <TautanAngka acuan={acuan} a={r.ringkasan.jumlahTb.semua} className="no-underline" />
          </div>
          <div className="text-sm text-gray-600">
            Bebas <TautanAngka acuan={acuan} a={r.ringkasan.jumlahTb.bebas} /> · Tetap <TautanAngka acuan={acuan} a={r.ringkasan.jumlahTb.tetap} />
          </div>
        </div>
        {r.ringkasan.level.map((l) => (
          <div key={l.level} className={clsx("rounded-xl border border-krem-200 border-l-4 p-3", gayaLevel[l.level])}>
            <div className="flex items-center gap-2 text-sm font-semibold">{ikonLevel[l.level]} {l.level}</div>
            <div className="mt-0.5 text-3xl font-bold tabular-nums">
              {l.total === 0 ? <span>0</span> : (
                <Link href={href(l.semua.saringan)} prefetch={false} className="hover:underline">{l.total}</Link>
              )}
            </div>
            <div className="text-sm text-gray-700">
              Bebas <TautanAngka acuan={acuan} a={l.bebas} /> · Tetap <TautanAngka acuan={acuan} a={l.tetap} />
            </div>
          </div>
        ))}
      </div>

      {/* 1-2. Masa TB berakhir | Absensi */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Kartu className="p-4">
          <JudulKartu>Masa TB berakhir</JudulKartu>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-krem-200"><tr><th className={th}>Jangka waktu</th><th className={thK}>Bebas</th><th className={thK}>Tetap</th><th className={thK}>Total</th></tr></thead>
              <tbody className="divide-y divide-krem-100">
                {r.masaTb.map((m) => (
                  <tr key={m.label}>
                    <td className={`${td} ${m.label === "Sudah lewat" ? "font-semibold text-kritis-fg" : ""}`}>{m.label}</td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={m.bebas} /></td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={m.tetap} /></td>
                    <td className={`${tdK} font-semibold`}>{m.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kartu>

        <Kartu className="p-4">
          <JudulKartu>Absensi (Bebas TriDharma)</JudulKartu>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-krem-100">
                {([
                  ["Ditandai TB", r.presensi.aktif],
                  ["Tidak ditandai TB (absen sendiri)", r.presensi.nonAktif],
                  ["Tanggal ditandai TB terisi", r.presensi.ditandaiTerisi],
                  ["Penandaan TB habis dalam ambang hari, padahal masa TB lebih panjang", r.presensi.kode5],
                  ["Masa TB berakhir, absensi masih ditandai TB", r.presensi.kode1],
                  ["SK TB berlaku, absensi tidak ditandai TB", r.presensi.kode2],
                ] as const).map(([label, a]) => (
                  <tr key={label}>
                    <td className={td}>{label}</td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={a} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kartu>
      </div>

      {/* 3. Per fakultas */}
      <Kartu className="p-4">
        <JudulKartu>Per fakultas</JudulKartu>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-krem-200">
                <tr><th className={th}>Fakultas</th><th className={thK}>Total</th><th className={thK}>Bebas</th><th className={thK}>Kritis</th><th className={thK}>Waspada</th><th className={thK}>Perhatian</th><th className={thK}>Arsip</th></tr>
              </thead>
              <tbody className="divide-y divide-krem-100">
                {r.fakultas.baris.filter((f) => !f.fakultas.startsWith("(") || f.total.jumlah > 0).map((f) => (
                  <tr key={f.fakultas}>
                    <td className={`${td} ${f.fakultas.startsWith("(") ? "text-sm text-gray-500 italic" : ""}`}>{f.fakultas.startsWith("(") ? "Kosong / lainnya" : f.fakultas}</td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={f.total} /></td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={f.bebas} /></td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={f.kritis} /></td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={f.waspada} /></td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={f.perhatian} /></td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={f.arsip} /></td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className={td}>Jumlah</td>
                  {(["total", "bebas", "kritis", "waspada", "perhatian", "arsip"] as const).map((k) => (
                    <td key={k} className={tdK}>{r.fakultas.jumlah[k]}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <GrafikBatang
            judul="Fakultas"
            seri={(Object.keys(WARNA_LEVEL) as (keyof typeof WARNA_LEVEL)[]).map((l) => ({ nama: l, warna: WARNA_LEVEL[l] }))}
            baris={r.fakultas.baris.filter((f) => !f.fakultas.startsWith("(")).map((f) => ({
              label: f.fakultas,
              segmen: [
                { seri: "Kritis", nilai: f.kritis.jumlah, href: href(f.kritis.saringan) },
                { seri: "Waspada", nilai: f.waspada.jumlah, href: href(f.waspada.saringan) },
                { seri: "Perhatian", nilai: f.perhatian.jumlah, href: href(f.perhatian.saringan) },
              ],
            }))}
          />
        </div>
      </Kartu>

      {/* Sebaran: Bebas/Tetap, sumber biaya */}
      <Kartu className="p-4">
        <JudulKartu>Sebaran</JudulKartu>
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-3">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Bebas dan Tetap TriDharma</h3>
            <GrafikPie
              judul="Bebas dan Tetap TriDharma"
              irisan={sb.jenis.map((x) => ({ nama: x.nama, nilai: x.angka.jumlah, href: href(x.angka.saringan), warna: x.nama === "Bebas" ? WARNA_BEBAS : WARNA_TETAP }))}
            />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Bebas TriDharma: sumber biaya</h3>
            <GrafikPie judul="Bebas TriDharma: sumber biaya" irisan={irisanBiaya(sb.biayaBebas)} sembunyikanNol={["Belum dikelompokkan"]} />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Tetap TriDharma: sumber biaya</h3>
            <GrafikPie judul="Tetap TriDharma: sumber biaya" irisan={irisanBiaya(sb.biayaTetap)} sembunyikanNol={["Belum dikelompokkan"]} />
          </div>
        </div>
        {[...sb.biayaBebas, ...sb.biayaTetap].some((x) => x.nama === "Belum dikelompokkan" && x.angka.jumlah > 0) && (
          <p className="mt-4 text-sm text-gray-600">
            Ada sumber biaya yang belum dikelompokkan.{" "}
            <Link href="/pengaturan#pembakuan" className="font-semibold text-hijau-900 underline">Atur di Pengaturan</Link>
          </p>
        )}
      </Kartu>

      {/* Sebaran: kampus tujuan */}
      <Kartu className="p-4">
        <JudulKartu>Kampus tujuan</JudulKartu>
        <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <GrafikBatang
            judul="Kampus"
            seri={[{ nama: "Sedang TB", warna: WARNA_KAMPUS }]}
            baris={kampusTeratas.map((k) => ({
              label: k.negara && k.negara !== NEGARA_DALAM_NEGERI ? `${k.nama} · ${k.negara}` : k.nama,
              segmen: [{ seri: "Sedang TB", nilai: k.angka.jumlah, href: href(k.angka.saringan) }],
              hrefTotal: href(k.angka.saringan),
            }))}
          />
          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase">Negara</h3>
            <ul className="columns-2 gap-x-6 text-[14px]">
              {sb.negara.map((n) => (
                <li key={n.nama} className="flex break-inside-avoid items-baseline justify-between gap-2 border-b border-krem-100 py-1.5">
                  <span className={n.nama === KOSONG ? "text-gray-500 italic" : undefined}>{namaNegara(n.nama)}</span>
                  <TautanAngka acuan={acuan} a={n.angka} className="tabular-nums" />
                </li>
              ))}
            </ul>
          </div>
        </div>
        <details className="group mt-5 text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1 font-medium text-hijau-700">
            Semua kampus ({sb.kampus.length}) <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-2 max-h-96 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 border-b border-krem-200 bg-white"><tr><th className={th}>Kampus</th><th className={th}>Negara</th><th className={thK}>Orang</th></tr></thead>
              <tbody className="divide-y divide-krem-100">
                {sb.kampus.map((k) => (
                  <tr key={k.nama}>
                    <td className={td}>{k.nama === KOSONG ? <span className="text-gray-500 italic">Belum diisi</span> : k.nama}</td>
                    <td className={`${td} text-gray-600`}>{k.negara ?? "–"}</td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={k.angka} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Kartu>

      {/* 4. Hambatan (grafik) | status akhir, pihak penahan, tahap */}
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <Kartu className="p-4">
          <JudulKartu>Hambatan yang terdeteksi</JudulKartu>
          <GrafikBatang
            judul="Hambatan"
            seri={[{ nama: "Bebas", warna: WARNA_BEBAS }, { nama: "Tetap", warna: WARNA_TETAP }]}
            baris={r.hambatan.map((h) => ({
              label: h.kode === 0 ? h.nama : `${h.kode}. ${h.nama}`,
              segmen: segmenJenis(h),
              hrefTotal: href(h.semua.saringan),
            }))}
          />
        </Kartu>

        <div className="grid gap-4">
          <Kartu className="p-4">
            <JudulKartu>Posisi per status akhir</JudulKartu>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-krem-200"><tr><th className={th}>Status akhir</th><th className={thK}>Jumlah</th><th className={thK}>%</th></tr></thead>
                <tbody className="divide-y divide-krem-100">
                  {r.statusAkhir.baris.map((s) => (
                    <tr key={s.status}>
                      <td className={td}>{s.status}</td>
                      <td className={tdK}><TautanAngka acuan={acuan} a={s.jumlah} /></td>
                      <td className={`${tdK} text-gray-600`}>{(s.persen * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className={td}>Total</td>
                    <td className={tdK}>{r.statusAkhir.total}</td>
                    <td className={tdK}>100%</td>
                  </tr>
                </tbody>
              </table>
              {!r.statusAkhir.cocok && <p className="mt-2 text-sm text-kritis-fg">Ada status kosong / tidak dikenal</p>}
            </div>
          </Kartu>

          <Kartu className="p-4">
            <JudulKartu>Siapa yang menahan</JudulKartu>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-krem-200"><tr><th className={th}>Pihak penahan</th><th className={thK}>Bebas</th><th className={thK}>Tetap</th><th className={thK}>Total</th></tr></thead>
                <tbody className="divide-y divide-krem-100">
                  {r.penahan.filter((x) => x.pihak !== "Lainnya" || x.total > 0).map((x) => (
                    <tr key={x.pihak}>
                      <td className={td}>{x.pihak}</td>
                      <td className={tdK}><TautanAngka acuan={acuan} a={x.bebas} /></td>
                      <td className={tdK}><TautanAngka acuan={acuan} a={x.tetap} /></td>
                      <td className={`${tdK} font-semibold`}>{x.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kartu>

          <Kartu className="p-4">
            <JudulKartu>Posisi per tahap</JudulKartu>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-krem-200">
                  <tr>
                    <th className={th}>Tahap</th>
                    <th className={thK}>Jumlah</th>
                    {adaDataTertahan && <th className={thK}>Rata-rata tertahan</th>}
                    {adaDataTertahan && <th className={thK}>Terlama</th>}
                    <th className={thK}>Kritis / Waspada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-krem-100">
                  {r.tahap.map((t) => (
                    <tr key={t.tahap}>
                      <td className={td}>{t.tahap}</td>
                      <td className={tdK}><TautanAngka acuan={acuan} a={t.jumlah} /></td>
                      {adaDataTertahan && <td className={`${tdK} text-gray-600`}>{t.rataRataTertahan === null ? "–" : t.rataRataTertahan.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</td>}
                      {adaDataTertahan && <td className={`${tdK} text-gray-600`}>{t.terlama ?? "–"}</td>}
                      <td className={tdK}><TautanAngka acuan={acuan} a={t.kritisWaspada} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kartu>
        </div>
      </div>

      {/* 5. Rekap manual (dilipat) */}
      <details className="group rounded-xl border border-krem-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[15px] font-semibold text-hijau-900">
          <span>Rekap manual: resmi TB dan penerbitan SK</span>
          <ChevronDown size={18} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid gap-6 border-t border-krem-100 p-4 xl:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-hijau-900">Rekap resmi TB dan TB Biaya Mandiri (per {formatTanggal(tanggalRekap?.nilai)})</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-krem-200"><tr><th className={th}>Fakultas</th><th className={thK}>TB</th><th className={thK}>TB Biaya Mandiri</th><th className={thK}>Jumlah rekap</th><th className={thK}>Sedang TB</th><th className={thK}>Selisih</th></tr></thead>
                <tbody className="divide-y divide-krem-100">
                  {rekap.baris.map((x) => (
                    <tr key={x.fakultas}>
                      <td className={td}>{x.fakultas}</td>
                      <td className={tdK}>{x.tugasBelajar}</td>
                      <td className={tdK}>{x.biayaMandiri}</td>
                      <td className={tdK}>{x.jumlahRekap}</td>
                      <td className={tdK}><TautanAngka acuan={acuan} a={x.sedangTb} /></td>
                      <td className={`${tdK} ${x.selisih < 0 ? "text-kritis-fg" : ""}`}>{x.selisih}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className={td}>Jumlah</td>
                    <td className={tdK}>{rekap.jumlah.tugasBelajar}</td>
                    <td className={tdK}>{rekap.jumlah.biayaMandiri}</td>
                    <td className={tdK}>{rekap.jumlah.jumlahRekap}</td>
                    <td className={tdK}>{rekap.jumlah.sedangTb}</td>
                    <td className={tdK}>{rekap.jumlah.selisih}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-hijau-900">Rekap penerbitan SK Tugas Belajar</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <tbody className="divide-y divide-krem-100">
                  {rekapSk.map((x) => (
                    <tr key={x.id}>
                      <td className={`${td} text-sm`}>{x.uraian}</td>
                      <td className={tdK}>{x.jumlah}</td>
                    </tr>
                  ))}
                  <tr className="font-semibold">
                    <td className={td}>Total SK yang sudah terbit</td>
                    <td className={tdK}>{rekapSk.filter((x) => x.kelompok === "SUDAH_TERBIT").reduce((t, x) => t + x.jumlah, 0)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className={td}>Total SK yang belum terbit</td>
                    <td className={tdK}>{rekapSk.filter((x) => x.kelompok === "BELUM_TERBIT").reduce((t, x) => t + x.jumlah, 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

// DASHBOARD (pengganti sheet "Dashboard" di Excel).
// Semua angka bisa diklik untuk membuka daftar orang di baliknya (halaman Data TB
// dengan saringan yang sama persis dengan hitungan angka itu).

import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Users, X } from "lucide-react";
import clsx from "clsx";
import { GrafikBatang } from "@/components/grafik-batang";
import { JudulHalaman, JudulKartu, Kartu, MemuatData } from "@/components/ui";
import type { Level } from "@/lib/aturan/pengaturan";
import { hitungRekapResmi, hitungRingkasan, type PerJenis } from "@/lib/aturan/ringkasan";
import type { Angka, Saringan } from "@/lib/aturan/saringan";
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
const WARNA_LEVEL: Record<Exclude<Level, "Aman">, string> = { Kritis: "#d93a3a", Waspada: "#e0a800", Perhatian: "#3a78c2" };

const KETERANGAN_STATUS: Record<string, string> = {
  "Sedang TB": "Dinilai hambatannya",
  "Sudah PK": "Dari Sudah PK & PK Iqbal",
  Expired: "Masa TB berakhir",
  Lulus: "Update gelar",
  "Rencana studi": "Rencana studi lanjut",
};

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
        keterangan="Posisi pegawai Tugas Belajar dan hambatan administrasinya. Bebas TriDharma (tidak presensi, terkait tunjangan dan kinerja) dipisah dari Tetap TriDharma."
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

  const th = "px-3 py-2 text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase";
  const thK = `${th} text-right`;
  const td = "px-3 py-2.5 text-[15px]";
  const tdK = `${td} text-right tabular-nums`;

  const ikonLevel: Record<Level, ReactNode> = {
    Kritis: <AlertOctagon size={18} />,
    Waspada: <AlertTriangle size={18} />,
    Perhatian: <Info size={18} />,
    Aman: <CheckCircle2 size={18} />,
  };
  const gayaLevel: Record<Level, string> = {
    Kritis: "border-l-kritis-fg bg-kritis-bg/25 text-kritis-fg",
    Waspada: "border-l-waspada-fg bg-waspada-bg/30 text-waspada-fg",
    Perhatian: "border-l-perhatian-fg bg-perhatian-bg/40 text-perhatian-fg",
    Aman: "border-l-aman-fg bg-aman-bg/30 text-aman-fg",
  };

  return (
    <div className="grid gap-6">
      {/* Filter global */}
      <Kartu className="p-4 sm:p-5">
        <form action="/" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fakultas</label>
            <select name="fakultas" defaultValue={filter.fakultas ?? ""} className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]">
              <option value="">Semua fakultas</option>
              {daftar.FAKULTAS.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Jenis pelaksanaan</label>
            <select name="jenis" defaultValue={filter.jenis ?? ""} className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]">
              <option value="">Bebas dan Tetap</option>
              {daftar.JENIS_PELAKSANAAN.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="acuan" className="mb-1 block text-sm font-medium text-gray-700">Tanggal acuan (simulasi)</label>
            <input id="acuan" name="acuan" inputMode="numeric" defaultValue={acuan ? formatTanggal(acuan) : ""}
              placeholder={`${formatTanggal(tanggalAcuan)} (hari ini)`}
              className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]" />
          </div>
          <div className="flex gap-3">
            <button className="h-11 rounded-lg bg-hijau-900 px-5 text-[13px] font-semibold tracking-[0.08em] text-white uppercase hover:bg-hijau-800">Terapkan</button>
            <Link href="/" className="inline-flex h-11 items-center rounded-lg border border-krem-300 bg-white px-5 text-[13px] font-semibold tracking-[0.08em] text-hijau-900 uppercase">Reset</Link>
          </div>
        </form>
        <p className="mt-3 text-sm text-gray-600">
          Per tanggal <b>{formatTanggal(tanggalAcuan)}</b>
          {acuan && (
            <Link href="/" className="ml-2 inline-flex items-center gap-1 rounded-full bg-emas-400 px-2.5 py-0.5 font-semibold text-hijau-900">
              simulasi <X size={13} />
            </Link>
          )}
          {(filter.fakultas || filter.jenis) && <> · disaring: {[filter.fakultas, filter.jenis].filter(Boolean).join(", ")}</>}
          . Penilaian hambatan hanya untuk status akhir &quot;Sedang TB&quot;.
        </p>
      </Kartu>

      {/* Kartu ringkasan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <div className="col-span-2 rounded-xl border border-krem-200 border-l-4 border-l-hijau-900 bg-white p-4 md:col-span-1">
          <div className="flex items-center gap-2 text-sm font-semibold text-hijau-900"><Users size={18} /> Sedang TB</div>
          <div className="mt-1 text-3xl font-bold text-hijau-900 tabular-nums">
            <TautanAngka acuan={acuan} a={r.ringkasan.jumlahTb.semua} className="no-underline" />
          </div>
          <div className="mt-1 text-sm text-gray-600">
            Bebas <TautanAngka acuan={acuan} a={r.ringkasan.jumlahTb.bebas} /> · Tetap <TautanAngka acuan={acuan} a={r.ringkasan.jumlahTb.tetap} />
          </div>
        </div>
        {r.ringkasan.level.map((l) => (
          <div key={l.level} className={clsx("rounded-xl border border-krem-200 border-l-4 p-4", gayaLevel[l.level])}>
            <div className="flex items-center gap-2 text-sm font-semibold">{ikonLevel[l.level]} {l.level}</div>
            <div className="mt-1 text-3xl font-bold tabular-nums">
              {l.total === 0 ? <span>0</span> : (
                <Link href={href(l.semua.saringan)} prefetch={false} className="hover:underline">{l.total}</Link>
              )}
            </div>
            <div className="mt-1 text-sm text-gray-700">
              Bebas <TautanAngka acuan={acuan} a={l.bebas} /> · Tetap <TautanAngka acuan={acuan} a={l.tetap} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Hambatan terdeteksi */}
        <Kartu className="xl:col-span-2">
          <JudulKartu keterangan="Setiap orang Sedang TB dihitung pada satu hambatan utama (yang prioritasnya paling tinggi).">
            Hambatan yang terdeteksi
          </JudulKartu>
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

        {/* Posisi per status akhir */}
        <Kartu>
          <JudulKartu keterangan="Seluruh orang di Data TB.">Posisi per status akhir</JudulKartu>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-krem-200"><tr><th className={th}>Status akhir</th><th className={thK}>Jumlah</th><th className={thK}>%</th><th className={`${th} hidden sm:table-cell`}>Keterangan</th></tr></thead>
            <tbody className="divide-y divide-krem-100">
              {r.statusAkhir.baris.map((s) => (
                <tr key={s.status}>
                  <td className={td}>{s.status}</td>
                  <td className={tdK}><TautanAngka acuan={acuan} a={s.jumlah} /></td>
                  <td className={`${tdK} text-gray-600`}>{(s.persen * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</td>
                  <td className={`${td} hidden text-sm text-gray-500 sm:table-cell`}>{KETERANGAN_STATUS[s.status] ?? ""}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className={td}>Total</td>
                <td className={tdK}>{r.statusAkhir.total}</td>
                <td className={tdK}>100%</td>
                <td className={`${td} hidden text-sm sm:table-cell`}>
                  {r.statusAkhir.cocok ? <span className="text-aman-fg">Cocok dengan Data TB</span> : <span className="text-kritis-fg">Cek: ada status kosong / tidak dikenal</span>}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </Kartu>

        {/* Siapa yang menahan */}
        <Kartu>
          <JudulKartu keterangan="Hanya orang yang punya hambatan.">Siapa yang menahan</JudulKartu>
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

        {/* Posisi per tahap */}
        <Kartu className="xl:col-span-2">
          <JudulKartu keterangan='Hari tertahan terisi setelah kolom "Tanggal masuk tahap" diisi.'>Posisi per tahap</JudulKartu>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-krem-200"><tr><th className={th}>Tahap</th><th className={thK}>Jumlah</th><th className={thK}>Rata-rata hari tertahan</th><th className={thK}>Terlama (hari)</th><th className={thK}>Kritis atau Waspada</th></tr></thead>
              <tbody className="divide-y divide-krem-100">
                {r.tahap.map((t) => (
                  <tr key={t.tahap}>
                    <td className={td}>{t.tahap}</td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={t.jumlah} /></td>
                    <td className={`${tdK} text-gray-600`}>{t.rataRataTertahan === null ? "belum ada data" : t.rataRataTertahan.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</td>
                    <td className={`${tdK} text-gray-600`}>{t.terlama ?? "–"}</td>
                    <td className={tdK}><TautanAngka acuan={acuan} a={t.kritisWaspada} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Kartu>

        {/* Per fakultas */}
        <Kartu className="xl:col-span-2">
          <JudulKartu keterangan="Arsip = selain Sedang TB.">Per fakultas</JudulKartu>
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

        {/* Masa TB berakhir */}
        <Kartu>
          <JudulKartu keterangan="Dihitung dari akhir efektif (perpanjangan bila ada).">Masa TB berakhir</JudulKartu>
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

        {/* Presensi */}
        <Kartu>
          <JudulKartu keterangan="Khusus Bebas TriDharma (tidak presensi).">Presensi</JudulKartu>
          <div className="overflow-x-auto">
          <table className="w-full">
            <tbody className="divide-y divide-krem-100">
              {([
                ["Presensi tercatat AKTIF", r.presensi.aktif],
                ["Presensi tercatat NON AKTIF", r.presensi.nonAktif],
                ["Presensi tidak jelas (MISTERY??)", r.presensi.tidakJelas],
                ["Presensi ditandai TB s.d. diisi", r.presensi.ditandaiTerisi],
                ["Penandaan habis dalam ambang hari, padahal TB lebih panjang", r.presensi.kode5],
                ["Presensi bebas padahal masa TB berakhir", r.presensi.kode1],
                ["Presensi NON AKTIF padahal SK masih berlaku", r.presensi.kode2],
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

        {/* Rekap resmi (manual) */}
        <Kartu>
          <JudulKartu keterangan={`Angka rekap diketik manual (per ${formatTanggal(tanggalRekap?.nilai)}); diubah di Pengaturan. Selisih = Data TB dikurangi rekap.`}>
            Rekap resmi TB dan TB Biaya Mandiri
          </JudulKartu>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-krem-200"><tr><th className={th}>Fakultas</th><th className={thK}>TB</th><th className={thK}>TB Biaya Mandiri</th><th className={thK}>Jumlah rekap</th><th className={thK}>Sedang TB di Data TB</th><th className={thK}>Selisih</th></tr></thead>
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
        </Kartu>

        {/* Rekap penerbitan SK (manual) */}
        <Kartu>
          <JudulKartu keterangan="Angka diketik manual; diubah di Pengaturan.">Rekap penerbitan SK Tugas Belajar</JudulKartu>
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
        </Kartu>
      </div>

      <p className="text-sm text-gray-500">
        Cara membaca: orang Kritis dan Waspada sebaiknya dibahas lebih dulu. Daftar lengkap dan urutannya ada di{" "}
        <Link href={acuan ? `/daftar-perhatian?acuan=${acuan}` : "/daftar-perhatian"} className="font-semibold text-hijau-900 underline">Daftar Perhatian</Link>.
        Aturan hambatan, skor, dan ambang hari ada di Pengaturan.
      </p>
    </div>
  );
}

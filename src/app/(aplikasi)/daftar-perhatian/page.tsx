import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, FileDown, X } from "lucide-react";
import clsx from "clsx";
import { JudulHalaman, Kartu, LencanaLevel, LEVEL, MemuatData, TombolTautan } from "@/components/ui";
import { PanelSaring } from "@/components/panel-saring";
import { saringanKeUrl } from "@/lib/aturan/saringan-url";
import { acuanDariUrl } from "@/lib/data/acuan";
import { uraikanSaringan, type Parameter, type Urut } from "@/lib/data/daftar";
import { muatSemuaDihitung } from "@/lib/data/pegawai";
import { pilihPerhatian } from "@/lib/data/perhatian";
import { daftarPilihanForm } from "@/lib/pengaturan/baca";
import { formatTanggal } from "@/lib/tanggal";

export default function HalamanDaftarPerhatian({ searchParams }: PageProps<"/daftar-perhatian">) {
  return (
    <>
      <JudulHalaman
        judul="Daftar Perhatian"
      />
      <Suspense fallback={<MemuatData baris={10} />}>
        <IsiDaftar searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function ubahUrl(p: Parameter, ganti: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (satu(v) && !(k in ganti)) u.set(k, satu(v));
  for (const [k, v] of Object.entries(ganti)) if (v) u.set(k, v);
  const q = u.toString();
  return q ? `/daftar-perhatian?${q}` : "/daftar-perhatian";
}

/** Nilai di dalam baris yang bisa diklik untuk langsung menyaring daftar. */
const tautanSaring = "hover:underline decoration-gray-400 underline-offset-2";

async function IsiDaftar({ searchParams }: { searchParams: Promise<Parameter> }) {
  const p = await searchParams;
  const acuan = acuanDariUrl(p);
  const [{ baris, pengaturan, tanggalAcuan }, daftar] = await Promise.all([muatSemuaDihitung(acuan), daftarPilihanForm()]);
  const { saringan, urut, arah, hasil } = pilihPerhatian(baris, p);
  const tampilSaringan = { ...saringan, berhambatan: undefined };
  const label = uraikanSaringan(tampilSaringan, pengaturan);

  const paramEkspor = new URLSearchParams({ ...Object.fromEntries(saringanKeUrl(tampilSaringan)), urut, arah, ...(acuan ? { acuan } : {}) });
  const urlEkspor = (format: "xlsx" | "pdf") => `/daftar-perhatian/ekspor?${paramEkspor.toString()}&format=${format}`;

  const lbl = "mb-1 block text-sm font-medium text-gray-700";
  const masukan = "h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]";

  // Jumlah per level dihitung tanpa saringan level, supaya angka di tiap tombol level tetap terlihat
  // dan satu klik langsung menyaring.
  const tanpaLevel = Object.fromEntries(Object.entries(p).filter(([k]) => k !== "level"));
  const untukLevel = pilihPerhatian(baris, tanpaLevel).hasil;
  const jumlahLevel = (l: string) => untukLevel.filter((b) => b.hasil.level === l).length;
  const levelAktif = saringan.level?.[0];

  // Form pencarian hanya memuat kotak cari, jenis, dan tanggal acuan; saringan lain dibawa lewat kolom tersembunyi.
  const dibawa = Object.entries(p).filter(([k, v]) => !["q", "jenis", "acuan"].includes(k) && satu(v));

  const chipLevel = (aktif: boolean) =>
    clsx(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[15px] transition-colors",
      aktif ? "border-hijau-900 bg-white shadow-sm ring-2 ring-hijau-900/15" : "border-krem-300 bg-white/60 hover:border-hijau-900 hover:bg-white",
    );

  // Judul kolom yang bisa diurutkan: klik sekali mengurutkan, klik lagi membalik arah.
  const kepalaUrut = (kunci: Urut, isi: ReactNode, opsi: { kanan?: boolean; padat?: boolean; kelas?: string } = {}) => {
    const aktif = urut === kunci;
    const Ikon = !aktif ? ChevronsUpDown : arah === "naik" ? ArrowUp : ArrowDown;
    const href = ubahUrl(p, { urut: kunci, arah: aktif ? (arah === "naik" ? "turun" : "naik") : undefined });
    return (
      <th
        className={clsx(opsi.padat ? "px-2 py-3" : "px-3 py-3", opsi.kanan && "text-right", opsi.kelas)}
        aria-sort={aktif ? (arah === "naik" ? "ascending" : "descending") : undefined}
      >
        <Link
          href={href}
          prefetch={false}
          className={clsx("inline-flex items-center gap-1 uppercase", aktif ? "text-hijau-900" : "hover:text-hijau-900")}
        >
          {isi}
          <Ikon size={13} className={aktif ? "" : "opacity-40"} aria-hidden />
        </Link>
      </th>
    );
  };

  // Urutan untuk layar kecil (tabel dengan judul kolom hanya tampil di layar lebar).
  const URUT_HP: [Urut, string][] = [["peringkat", "Peringkat"], ["sisa", "Sisa hari"], ["nama", "Nama"]];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-3">
        <TombolTautan href={urlEkspor("xlsx")} prefetch={false}>
          <FileDown size={16} /> Ekspor Excel
        </TombolTautan>
        <TombolTautan href={urlEkspor("pdf")} prefetch={false}>
          <FileDown size={16} /> Ekspor PDF
        </TombolTautan>
      </div>

      <PanelSaring jumlahAktif={label.filter((t) => !t.startsWith("Level")).length + (acuan ? 1 : 0)}>
        <Kartu className="p-4 sm:p-5">
          <form action="/daftar-perhatian" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
            {dibawa.map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={satu(v)} />
            ))}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className={lbl} htmlFor="q">Cari nama atau NIP</label>
              <input id="q" name="q" type="search" defaultValue={saringan.q ?? ""} placeholder="Ketik nama atau NIP…" className={masukan} />
            </div>
            <div>
              <label className={lbl} htmlFor="jenis">Jenis pelaksanaan</label>
              <select id="jenis" name="jenis" defaultValue={saringan.jenis ?? ""} className={masukan}>
                <option value="">Semua</option>
                {daftar.JENIS_PELAKSANAAN.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl} htmlFor="acuan">Tanggal acuan (simulasi)</label>
              <input id="acuan" name="acuan" defaultValue={acuan ? formatTanggal(acuan) : ""} placeholder={`${formatTanggal(tanggalAcuan)} (hari ini)`}
                inputMode="numeric" className={masukan} />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-1">
              <button className="h-11 rounded-lg bg-hijau-900 px-5 text-[13px] font-semibold tracking-[0.08em] text-white uppercase hover:bg-hijau-800">
                Terapkan
              </button>
              <Link href="/daftar-perhatian" className="inline-flex h-11 items-center rounded-lg border border-krem-300 bg-white px-5 text-[13px] font-semibold tracking-[0.08em] text-hijau-900 uppercase">
                Reset
              </Link>
            </div>
          </form>
        </Kartu>
      </PanelSaring>

      {/* Level: satu klik langsung menyaring; klik lagi untuk melepas */}
      <div className="flex flex-wrap items-center gap-2 text-[15px]">
        <Link href={ubahUrl(p, { level: undefined })} prefetch={false} aria-pressed={!levelAktif} className={chipLevel(!levelAktif)}>
          Semua <b className="tabular-nums">{untukLevel.length}</b>
        </Link>
        {LEVEL.filter((l) => l !== "Aman").map((l) => {
          const aktif = levelAktif === l;
          return (
            <Link key={l} href={ubahUrl(p, { level: aktif ? undefined : l })} prefetch={false} aria-pressed={aktif} className={chipLevel(aktif)}>
              <LencanaLevel level={l} /> <b className="tabular-nums">{jumlahLevel(l)}</b>
            </Link>
          );
        })}
        <span className="ml-1 text-sm text-gray-600">per {formatTanggal(tanggalAcuan)}</span>
      </div>

      {(acuan || label.some((t) => !t.startsWith("Level"))) && (
        <div className="flex flex-wrap items-center gap-2 text-[15px]">
          {acuan && (
            <Link href={ubahUrl(p, { acuan: undefined })} className="inline-flex items-center gap-1 rounded-full bg-emas-400 px-3 py-1 text-sm font-semibold text-hijau-900">
              Simulasi {formatTanggal(acuan)} <X size={14} />
            </Link>
          )}
          {Object.keys(tampilSaringan).filter((k) => k !== "level").map((k) => {
            const teks = uraikanSaringan({ [k]: tampilSaringan[k as keyof typeof tampilSaringan] }, pengaturan)[0];
            if (!teks) return null;
            return (
              <Link key={k} href={ubahUrl(p, { [k]: undefined })} title="Lepas saringan ini"
                className="inline-flex items-center gap-1 rounded-full bg-emas-300/60 px-3 py-1 text-sm text-hijau-900 hover:bg-emas-300">
                {teks} <X size={14} />
              </Link>
            );
          })}
        </div>
      )}

      {hasil.length === 0 ? (
        <Kartu><p className="text-[15px] text-gray-600">Tidak ada orang berhambatan yang cocok dengan saringan ini.</p></Kartu>
      ) : (
        <>
          <div className="hidden max-h-[75vh] overflow-auto rounded-xl border border-krem-200 bg-white lg:block">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-krem-50 shadow-[0_1px_0_var(--color-krem-200)]">
                <tr className="text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase">
                  {kepalaUrut("peringkat", "#", { kanan: true, padat: true, kelas: "w-10" })}
                  {kepalaUrut("nama", "Nama / NIP")}
                  {kepalaUrut("fakultas", "Fak. / Jenis")}
                  {kepalaUrut("skor", "Level", { padat: true })}
                  {kepalaUrut("hambatan", "Hambatan dan saran tindakan", { kelas: "w-[34%] min-w-[15rem]" })}
                  {kepalaUrut("pihak", "Pihak penahan")}
                  {kepalaUrut("sisa", "Akhir efektif")}
                  {kepalaUrut("tertahan", "Tertahan", { kanan: true, padat: true })}
                  <th className="hidden w-[12%] px-3 py-3 2xl:table-cell">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-krem-100 align-top">
                {hasil.map(({ pegawai: o, hasil: h }) => (
                  <tr key={o.id} className="hover:bg-krem-50">
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{h.peringkat}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/data-tb/${o.id}`} className="font-semibold text-hijau-900 hover:underline">{o.nama}</Link>
                      <div className="font-mono text-[11px] text-gray-500">{o.nip}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {o.fakultas ? (
                        <Link href={ubahUrl(p, { fakultas: o.fakultas })} prefetch={false} title={`Saring fakultas ${o.fakultas}`} className={tautanSaring}>{o.fakultas}</Link>
                      ) : "–"}
                      <div className="text-xs text-gray-500">
                        {o.jenisPelaksanaan ? (
                          <Link href={ubahUrl(p, { jenis: o.jenisPelaksanaan })} prefetch={false} title={`Saring jenis ${o.jenisPelaksanaan}`} className={tautanSaring}>{o.jenisPelaksanaan}</Link>
                        ) : "–"}
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      {h.level && (
                        <Link href={ubahUrl(p, { level: h.level })} prefetch={false} title={`Saring level ${h.level}`} className="inline-block">
                          <LencanaLevel level={h.level} />
                        </Link>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={ubahUrl(p, { kode: String(h.kode) })} prefetch={false} title="Saring hambatan ini" className={clsx("font-medium text-gray-900", tautanSaring)}>
                        {h.hambatan}
                      </Link>
                      <div className="mt-0.5 text-gray-600">{h.saran}</div>
                      {o.catatan && <div className="mt-1 text-xs text-gray-500 italic 2xl:hidden">Catatan: {o.catatan}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      {h.pihakPenahan ? (
                        <Link href={ubahUrl(p, { pihak: h.pihakPenahan })} prefetch={false} title={`Saring pihak ${h.pihakPenahan}`} className={tautanSaring}>{h.pihakPenahan}</Link>
                      ) : "–"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {formatTanggal(h.akhirEfektif) || "–"}
                      {h.sisaHari !== null && (
                        <div className={`text-xs tabular-nums ${h.sisaHari < 0 ? "font-semibold text-kritis-fg" : "text-gray-500"}`}>
                          {h.sisaHari < 0 ? `lewat ${-h.sisaHari} hari` : `sisa ${h.sisaHari} hari`}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{h.hariTertahan ?? "–"}</td>
                    <td className="hidden max-w-[220px] px-3 py-2.5 text-gray-600 2xl:table-cell">{o.catatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm lg:hidden">
            <span className="text-gray-600">Urutkan:</span>
            {URUT_HP.map(([k, t]) => {
              const aktif = urut === k;
              const Ikon = arah === "naik" ? ArrowUp : ArrowDown;
              return (
                <Link
                  key={k}
                  href={ubahUrl(p, { urut: k, arah: aktif ? (arah === "naik" ? "turun" : "naik") : undefined })}
                  prefetch={false}
                  className={clsx("inline-flex items-center gap-1 rounded-full border px-3 py-1", aktif ? "border-hijau-900 bg-white font-semibold text-hijau-900" : "border-krem-300 bg-white/60")}
                >
                  {t} {aktif && <Ikon size={13} aria-hidden />}
                </Link>
              );
            })}
          </div>

          <ul className="grid gap-3 lg:hidden">
            {hasil.map(({ pegawai: o, hasil: h }) => (
              <li key={o.id} className="rounded-xl border border-krem-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-500">#{h.peringkat}</div>
                    <Link href={`/data-tb/${o.id}`} className="font-semibold text-hijau-900">{o.nama}</Link>
                    <div className="font-mono text-xs text-gray-500">{o.nip}</div>
                  </div>
                  {h.level && <LencanaLevel level={h.level} />}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {[o.fakultas, o.jenisPelaksanaan, h.pihakPenahan].filter(Boolean).join(" · ")}
                </div>
                <div className="mt-2 text-[15px] font-medium text-gray-900">{h.hambatan}</div>
                <div className="mt-1 text-sm text-gray-700">
                  <span className="font-semibold">Saran:</span> {h.saran}
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  Akhir efektif {formatTanggal(h.akhirEfektif) || "–"} · sisa {h.sisaHari ?? "–"} hari
                  {h.hariTertahan !== null && ` · tertahan ${h.hariTertahan} hari`}
                </div>
                {o.catatan && <div className="mt-1 text-sm text-gray-500 italic">{o.catatan}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

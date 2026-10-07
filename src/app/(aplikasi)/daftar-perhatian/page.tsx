import Link from "next/link";
import { Suspense } from "react";
import { FileDown, X } from "lucide-react";
import { JudulHalaman, Kartu, LencanaLevel, LEVEL, MemuatData, TombolTautan } from "@/components/ui";
import { PanelSaring } from "@/components/panel-saring";
import { saringanKeUrl } from "@/lib/aturan/saringan-url";
import { acuanDariUrl } from "@/lib/data/acuan";
import { uraikanSaringan, type Parameter } from "@/lib/data/daftar";
import { muatSemuaDihitung } from "@/lib/data/pegawai";
import { pilihPerhatian } from "@/lib/data/perhatian";
import { daftarPilihanForm } from "@/lib/pengaturan/baca";
import { formatTanggal } from "@/lib/tanggal";

export const metadata = { title: "Daftar Perhatian" };

export default function HalamanDaftarPerhatian({ searchParams }: PageProps<"/daftar-perhatian">) {
  return (
    <>
      <JudulHalaman
        judul="Daftar Perhatian"
        keterangan="Orang Sedang TB yang punya hambatan, diurutkan dari skor tertinggi. Bahas Kritis dan Waspada lebih dulu."
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

const URUT = { peringkat: "Peringkat", sisa: "Sisa hari (tersedikit dulu)", nama: "Nama", fakultas: "Fakultas" };

async function IsiDaftar({ searchParams }: { searchParams: Promise<Parameter> }) {
  const p = await searchParams;
  const acuan = acuanDariUrl(p);
  const [{ baris, pengaturan, tanggalAcuan }, daftar] = await Promise.all([muatSemuaDihitung(acuan), daftarPilihanForm()]);
  const { saringan, urut, hasil } = pilihPerhatian(baris, p);
  const tampilSaringan = { ...saringan, berhambatan: undefined };
  const label = uraikanSaringan(tampilSaringan, pengaturan);

  const paramEkspor = new URLSearchParams({ ...Object.fromEntries(saringanKeUrl(tampilSaringan)), urut, ...(acuan ? { acuan } : {}) });
  const urlEkspor = (format: "xlsx" | "pdf") => `/daftar-perhatian/ekspor?${paramEkspor.toString()}&format=${format}`;

  const pilih = (nama: string, isi: [string, string][], nilai: string) => (
    <select name={nama} defaultValue={nilai} className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]">
      <option value="">Semua</option>
      {isi.map(([v, t]) => (
        <option key={v} value={v}>{t}</option>
      ))}
    </select>
  );
  const lbl = "mb-1 block text-sm font-medium text-gray-700";
  const daftarPihak = [...new Set([...pengaturan.statusSk.map((s) => s.pihakPenahan), pengaturan.pihakStatusKosong])];
  const kodeAktif = pengaturan.aturan.filter((a) => a.kode > 0);
  const jumlahLevel = (l: string) => hasil.filter((b) => b.hasil.level === l).length;

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

      <PanelSaring jumlahAktif={label.length + (acuan ? 1 : 0)}>
        <Kartu className="p-4 sm:p-5">
          <form action="/daftar-perhatian" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className={lbl} htmlFor="q">Cari nama atau NIP</label>
              <input id="q" name="q" type="search" defaultValue={saringan.q ?? ""} placeholder="Ketik nama atau NIP…"
                className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]" />
            </div>
            <div>
              <label className={lbl}>Fakultas</label>
              {pilih("fakultas", daftar.FAKULTAS.map((f) => [f, f]), saringan.fakultas ?? "")}
            </div>
            <div>
              <label className={lbl}>Jenis pelaksanaan</label>
              {pilih("jenis", daftar.JENIS_PELAKSANAAN.map((f) => [f, f]), saringan.jenis ?? "")}
            </div>
            <div>
              <label className={lbl}>Level</label>
              {pilih("level", LEVEL.filter((l) => l !== "Aman").map((l) => [l, l]), saringan.level?.join("|") ?? "")}
            </div>
            <div className="sm:col-span-2">
              <label className={lbl}>Hambatan utama</label>
              {pilih("kode", kodeAktif.map((a) => [String(a.kode), `${a.kode}. ${a.nama}`]), saringan.kode !== undefined ? String(saringan.kode) : "")}
            </div>
            <div>
              <label className={lbl}>Pihak penahan</label>
              {pilih("pihak", daftarPihak.map((x) => [x, x]), saringan.pihak ?? "")}
            </div>
            <div>
              <label className={lbl}>Urutkan</label>
              <select name="urut" defaultValue={urut} className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]">
                {Object.entries(URUT).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl} htmlFor="acuan">Tanggal acuan (simulasi)</label>
              <input id="acuan" name="acuan" defaultValue={acuan ? formatTanggal(acuan) : ""} placeholder={`${formatTanggal(tanggalAcuan)} (hari ini)`}
                inputMode="numeric" className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]" />
            </div>
            <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-3 lg:justify-end">
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

      <div className="flex flex-wrap items-center gap-2 text-[15px]">
        <span>
          <b>{hasil.length}</b> orang · per {formatTanggal(tanggalAcuan)} ·
        </span>
        {LEVEL.filter((l) => l !== "Aman").map((l) => (
          <span key={l} className="inline-flex items-center gap-1">
            <LencanaLevel level={l} /> <b>{jumlahLevel(l)}</b>
          </span>
        ))}
        {acuan && (
          <Link href={ubahUrl(p, { acuan: undefined })} className="inline-flex items-center gap-1 rounded-full bg-emas-400 px-3 py-1 text-sm font-semibold text-hijau-900">
            Simulasi {formatTanggal(acuan)} <X size={14} />
          </Link>
        )}
        {Object.keys(tampilSaringan).map((k) => {
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

      {hasil.length === 0 ? (
        <Kartu><p className="text-[15px] text-gray-600">Tidak ada orang berhambatan yang cocok dengan saringan ini.</p></Kartu>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-krem-200 bg-white lg:block">
            <table className="w-full text-sm">
              <thead className="border-b border-krem-200 bg-krem-50">
                <tr className="text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase">
                  <th className="w-10 px-3 py-3 text-right">#</th>
                  <th className="px-3 py-3">Nama / NIP</th>
                  <th className="px-3 py-3">Fak. / Jenis</th>
                  <th className="px-3 py-3">Level</th>
                  <th className="w-[34%] px-3 py-3">Hambatan utama dan saran tindakan</th>
                  <th className="px-3 py-3">Pihak penahan</th>
                  <th className="px-3 py-3 whitespace-nowrap">Akhir efektif</th>
                  <th className="px-3 py-3 text-right">Tertahan</th>
                  <th className="px-3 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-krem-100 align-top">
                {hasil.map(({ pegawai: o, hasil: h }) => (
                  <tr key={o.id} className="hover:bg-krem-50">
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{h.peringkat}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/data-tb/${o.id}`} className="font-semibold text-hijau-900 hover:underline">{o.nama}</Link>
                      <div className="font-mono text-xs text-gray-500">{o.nip}</div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {o.fakultas ?? "–"}
                      <div className="text-xs text-gray-500">{o.jenisPelaksanaan ?? "–"}</div>
                    </td>
                    <td className="px-3 py-2.5">{h.level && <LencanaLevel level={h.level} />}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-900">{h.hambatan}</div>
                      <div className="mt-0.5 text-gray-600">{h.saran}</div>
                    </td>
                    <td className="px-3 py-2.5">{h.pihakPenahan}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {formatTanggal(h.akhirEfektif) || "–"}
                      {h.sisaHari !== null && (
                        <div className={`text-xs tabular-nums ${h.sisaHari < 0 ? "font-semibold text-kritis-fg" : "text-gray-500"}`}>
                          {h.sisaHari < 0 ? `lewat ${-h.sisaHari} hari` : `sisa ${h.sisaHari} hari`}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{h.hariTertahan ?? "–"}</td>
                    <td className="max-w-[220px] px-3 py-2.5 text-gray-600">{o.catatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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

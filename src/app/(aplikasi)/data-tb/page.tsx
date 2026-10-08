import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { JudulHalaman, Kartu, LencanaLevel, LEVEL, MemuatData, TombolTautan } from "@/components/ui";
import { KOSONG } from "@/lib/aturan/saringan";
import { saringanKeUrl } from "@/lib/aturan/saringan-url";
import { wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { acuanDariUrl } from "@/lib/data/acuan";
import { PILIHAN_URUT, pilihBaris, uraikanSaringan, type Parameter } from "@/lib/data/daftar";
import { muatSemuaDihitung } from "@/lib/data/pegawai";
import { daftarPilihanForm } from "@/lib/pengaturan/baca";
import { PanelSaring } from "@/components/panel-saring";
import { formatTanggal, formatWaktu } from "@/lib/tanggal";

const PER_HALAMAN = 50;

export default function HalamanDataTb({ searchParams }: PageProps<"/data-tb">) {
  return (
    <>
      <JudulHalaman judul="Data TB" />
      <Suspense fallback={<MemuatData baris={10} />}>
        <IsiDataTb searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const satu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Alamat halaman ini dengan parameter diganti / dihapus (undefined = hapus). */
function ubahUrl(p: Parameter, ganti: Record<string, string | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    const s = satu(v);
    if (s && !(k in ganti)) u.set(k, s);
  }
  for (const [k, v] of Object.entries(ganti)) if (v) u.set(k, v);
  const q = u.toString();
  return q ? `/data-tb?${q}` : "/data-tb";
}

async function IsiDataTb({ searchParams }: { searchParams: Promise<Parameter> }) {
  const p = await searchParams;
  if (satu(p.terhapus) === "1") return <DaftarTerhapus />;

  const acuan = acuanDariUrl(p);
  const [{ baris, pengaturan, tanggalAcuan }, daftar] = await Promise.all([muatSemuaDihitung(acuan), daftarPilihanForm()]);
  const { saringan, urut, hasil } = pilihBaris(baris, p);
  const halaman = Math.max(1, Math.min(Number(satu(p.hal)) || 1, Math.ceil(hasil.length / PER_HALAMAN) || 1));
  const tampil = hasil.slice((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN);

  // Saringan yang tidak ada di form (mis. dari klik angka Dashboard) ditampilkan sebagai label.
  const DI_FORM = new Set(["q", "statusAkhir", "fakultas", "jenis", "level", "statusSk", "adaCekData"]);
  const saringanLain = Object.fromEntries(Object.entries(saringan).filter(([k]) => !DI_FORM.has(k)));
  const label = uraikanSaringan(saringan, pengaturan);
  const urlEkspor = `/data-tb/ekspor?${new URLSearchParams({ ...Object.fromEntries(saringanKeUrl(saringan)), urut, ...(acuan ? { acuan } : {}) }).toString()}`;

  const pilihan = (nama: string, isi: string[], nilai: string, semua = "Semua") => (
    <select name={nama} defaultValue={nilai} className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]">
      <option value="">{semua}</option>
      {isi.map((x) => (
        <option key={x} value={x}>
          {x === KOSONG ? "(belum diisi)" : x}
        </option>
      ))}
    </select>
  );
  const lbl = "mb-1 block text-sm font-medium text-gray-700";

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <TombolTautan href="/data-tb/baru" varian="utama">
          <Plus size={16} /> Tambah pegawai
        </TombolTautan>
        <TombolTautan href={urlEkspor} prefetch={false}>
          Ekspor Excel ({hasil.length} baris)
        </TombolTautan>
        <TombolTautan href="/data-tb?terhapus=1" varian="garis">
          Data terhapus
        </TombolTautan>
      </div>

      <PanelSaring jumlahAktif={label.length}>
      <Kartu className="p-4 sm:p-5">
        <form action="/data-tb" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(Object.fromEntries(saringanKeUrl(saringanLain))).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {acuan && <input type="hidden" name="acuan" value={acuan} />}
          <div className="sm:col-span-2">
            <label className={lbl} htmlFor="q">Cari nama atau NIP</label>
            <input id="q" name="q" type="search" defaultValue={saringan.q ?? ""} placeholder="Ketik nama atau NIP…"
              className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]" />
          </div>
          <div>
            <label className={lbl}>Status akhir</label>
            {pilihan("statusAkhir", daftar.STATUS_AKHIR, saringan.statusAkhir ?? "")}
          </div>
          <div>
            <label className={lbl}>Fakultas</label>
            {pilihan("fakultas", daftar.FAKULTAS, saringan.fakultas ?? "")}
          </div>
          <div>
            <label className={lbl}>Jenis pelaksanaan</label>
            {pilihan("jenis", daftar.JENIS_PELAKSANAAN, saringan.jenis ?? "")}
          </div>
          <div>
            <label className={lbl}>Level</label>
            {pilihan("level", [...LEVEL], saringan.level?.join("|") ?? "")}
          </div>
          <div>
            <label className={lbl}>Status SK</label>
            {pilihan("statusSk", [...daftar.STATUS_SK, KOSONG], saringan.statusSk ?? "")}
          </div>
          <div>
            <label className={lbl}>Urutkan</label>
            <select name="urut" defaultValue={urut} className="h-11 w-full rounded-lg border border-krem-300 bg-white px-3 text-[15px]">
              {Object.entries(PILIHAN_URUT).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-[15px] sm:col-span-2 lg:col-span-2">
            <input type="checkbox" name="adaCekData" value="1" defaultChecked={!!saringan.adaCekData} className="size-5 accent-hijau-900" />
            Hanya yang punya catatan Cek data / peringatan
          </label>
          <div className="flex gap-3 sm:col-span-2 lg:col-span-2 lg:justify-end">
            <button className="h-11 rounded-lg bg-hijau-900 px-5 text-[13px] font-semibold tracking-[0.08em] text-white uppercase hover:bg-hijau-800">
              Terapkan
            </button>
            <Link href="/data-tb" className="inline-flex h-11 items-center rounded-lg border border-krem-300 bg-white px-5 text-[13px] font-semibold tracking-[0.08em] text-hijau-900 uppercase">
              Reset
            </Link>
          </div>
        </form>
      </Kartu>
      </PanelSaring>

      <div className="flex flex-wrap items-center gap-2 text-[15px]">
        <span>
          <b>{hasil.length}</b> orang · tanggal acuan {formatTanggal(tanggalAcuan)}
        </span>
        {acuan && (
          <Link href={ubahUrl(p, { acuan: undefined })} title="Kembali ke tanggal acuan biasa"
            className="inline-flex items-center gap-1 rounded-full bg-emas-400 px-3 py-1 text-sm font-semibold text-hijau-900">
            Simulasi {formatTanggal(acuan)} <X size={14} />
          </Link>
        )}
        {label.length > 0 && Object.keys(saringan).map((k) => {
          const teks = uraikanSaringan({ [k]: saringan[k as keyof typeof saringan] }, pengaturan)[0];
          if (!teks) return null;
          return (
            <Link key={k} href={ubahUrl(p, { [k]: undefined, hal: undefined })}
              className="inline-flex items-center gap-1 rounded-full bg-emas-300/60 px-3 py-1 text-sm text-hijau-900 hover:bg-emas-300"
              title="Lepas saringan ini">
              {teks} <X size={14} />
            </Link>
          );
        })}
      </div>

      {tampil.length === 0 ? (
        <Kartu><p className="text-[15px] text-gray-600">Tidak ada orang yang cocok dengan saringan ini.</p></Kartu>
      ) : (
        <>
          {/* Layar lebar: tabel */}
          <div className="hidden overflow-x-auto rounded-xl border border-krem-200 bg-white md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-krem-200 bg-krem-50">
                <tr className="text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase">
                  <th className="px-3 py-3">Nama / NIP</th>
                  <th className="px-3 py-3">Status akhir</th>
                  <th className="px-3 py-3">Fakultas</th>
                  <th className="px-3 py-3">Jenis</th>
                  <th className="px-3 py-3">Status SK</th>
                  <th className="px-3 py-3 whitespace-nowrap">Akhir efektif</th>
                  <th className="px-3 py-3 text-right">Sisa hari</th>
                  <th className="px-3 py-3">Level</th>
                  <th className="px-3 py-3">Hambatan utama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-krem-100">
                {tampil.map(({ pegawai: o, hasil: h }) => (
                  <tr key={o.id} className="hover:bg-krem-50">
                    <td className="px-3 py-2.5">
                      <Link href={`/data-tb/${o.id}`} className="font-semibold text-hijau-900 hover:underline">{o.nama}</Link>
                      <div className="font-mono text-xs text-gray-500">
                        {o.nip}
                        {(h.cekData || h.peringatan.length > 0) && (
                          <span title={[h.cekData, ...h.peringatan].filter(Boolean).join(" ")} className="ml-2 inline-flex items-center gap-1 font-sans text-waspada-fg">
                            <AlertTriangle size={12} /> cek data
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{o.statusAkhir}</td>
                    <td className="px-3 py-2.5">{o.fakultas ?? <Kosong />}</td>
                    <td className="px-3 py-2.5">{o.jenisPelaksanaan ?? <Kosong />}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{o.statusSk ?? <Kosong />}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatTanggal(h.akhirEfektif) || <Kosong />}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums ${h.sisaHari !== null && h.sisaHari < 0 ? "font-semibold text-kritis-fg" : ""}`}>
                      {h.sisaHari ?? <Kosong />}
                    </td>
                    <td className="px-3 py-2.5">{h.level ? <LencanaLevel level={h.level} /> : <span className="text-gray-400">arsip</span>}</td>
                    <td className="max-w-xs px-3 py-2.5 text-gray-700">{h.kode > 0 ? h.hambatan : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* HP: kartu */}
          <ul className="grid gap-3 md:hidden">
            {tampil.map(({ pegawai: o, hasil: h }) => (
              <li key={o.id}>
                <Link href={`/data-tb/${o.id}`} className="block rounded-xl border border-krem-200 bg-white p-4 active:bg-krem-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-hijau-900">{o.nama}</div>
                      <div className="font-mono text-xs text-gray-500">{o.nip}</div>
                    </div>
                    {h.level ? <LencanaLevel level={h.level} /> : <span className="text-xs text-gray-400">{o.statusAkhir}</span>}
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    {[o.fakultas, o.jenisPelaksanaan, o.statusSk].filter(Boolean).join(" · ")}
                  </div>
                  {h.kode > 0 && <div className="mt-1 text-sm text-gray-800">{h.hambatan}</div>}
                  <div className="mt-1 text-sm text-gray-500">
                    Akhir efektif {formatTanggal(h.akhirEfektif) || "-"} · sisa {h.sisaHari ?? "-"} hari
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <Halaman p={p} halaman={halaman} total={hasil.length} />
        </>
      )}
    </div>
  );
}

function Kosong() {
  return <span className="text-gray-400">–</span>;
}

function Halaman({ p, halaman, total }: { p: Parameter; halaman: number; total: number }) {
  const jumlahHal = Math.ceil(total / PER_HALAMAN);
  if (jumlahHal <= 1) return null;
  const tombol = "inline-flex h-11 items-center gap-1 rounded-lg border border-krem-300 bg-white px-4 text-sm font-semibold text-hijau-900";
  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Halaman">
      {halaman > 1 ? (
        <Link className={tombol} href={ubahUrl(p, { hal: String(halaman - 1) })}><ChevronLeft size={16} /> Sebelumnya</Link>
      ) : <span />}
      <span className="text-sm text-gray-600">
        Halaman {halaman} dari {jumlahHal} ({(halaman - 1) * PER_HALAMAN + 1}–{Math.min(halaman * PER_HALAMAN, total)} dari {total})
      </span>
      {halaman < jumlahHal ? (
        <Link className={tombol} href={ubahUrl(p, { hal: String(halaman + 1) })}>Berikutnya <ChevronRight size={16} /></Link>
      ) : <span />}
    </nav>
  );
}

async function DaftarTerhapus() {
  await wajibLogin();
  const terhapus = await prisma.pegawaiTB.findMany({ where: { dihapusPada: { not: null } }, orderBy: { dihapusPada: "desc" } });
  return (
    <div className="grid gap-4">
      <div><TombolTautan href="/data-tb"><ChevronLeft size={16} /> Kembali ke Data TB</TombolTautan></div>
      <Kartu>
        <h2 className="mb-3 text-lg font-semibold text-hijau-900">Data terhapus ({terhapus.length})</h2>
        {terhapus.length === 0 ? (
          <p className="text-[15px] text-gray-600">Tidak ada data yang dihapus.</p>
        ) : (
          <ul className="divide-y divide-krem-100">
            {terhapus.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <Link href={`/data-tb/${o.id}`} className="font-semibold text-hijau-900 hover:underline">{o.nama}</Link>
                  <div className="text-sm text-gray-500">
                    NIP {o.nip} · dihapus {formatWaktu(o.dihapusPada!)} oleh {o.dihapusOleh}
                  </div>
                </div>
                <TombolTautan href={`/data-tb/${o.id}`}>Lihat / pulihkan</TombolTautan>
              </li>
            ))}
          </ul>
        )}
      </Kartu>
    </div>
  );
}

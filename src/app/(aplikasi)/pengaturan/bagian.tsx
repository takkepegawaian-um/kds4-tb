"use client";

// Bagian-bagian layar Pengaturan yang bisa diubah.

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, EyeOff, Eye, Lock, Plus, Trash2, XCircle } from "lucide-react";
import clsx from "clsx";
import { Tombol } from "@/components/ui";
import { LEVEL } from "@/lib/aturan/pengaturan";
import { ATURAN_HAMBATAN_BAWAAN, STATUS_SK_BAWAAN } from "@/lib/pengaturan/bawaan";
import { labelAbsensi } from "@/lib/aturan/label-absensi";
import { formatTanggal } from "@/lib/tanggal";
import {
  hapusLibur,
  hapusPilihan,
  kembalikanAturanBawaan,
  kembalikanParameterBawaan,
  kembalikanStatusSkBawaan,
  pratinjauStatusSkKosong,
  terapkanStatusSkKosong,
  simpanAturan,
  simpanParameter,
  simpanRekapFakultas,
  simpanRekapSk,
  simpanStatusSk,
  tambahLibur,
  tambahPilihan,
  ubahPilihan,
  type HasilPengaturan,
} from "./aksi";
import type { PratinjauIsiStatusSk } from "@/lib/data/isi-status-sk";

// ---------------------------------------------------------------------------
// Pembantu
// ---------------------------------------------------------------------------

function useAksi() {
  const router = useRouter();
  const [hasil, setHasil] = useState<HasilPengaturan | null>(null);
  const [proses, mulai] = useTransition();
  const jalankan = (aksi: () => Promise<HasilPengaturan>, konfirmasi?: string) => {
    if (konfirmasi && !window.confirm(konfirmasi)) return;
    mulai(async () => {
      const h = await aksi();
      setHasil(h);
      if (h.ok) router.refresh();
    });
  };
  return { hasil, proses, jalankan, galat: hasil?.galat ?? {} };
}

function PesanHasil({ hasil }: { hasil: HasilPengaturan | null }) {
  if (!hasil) return null;
  const d = hasil.dampak;
  const berubah = d && LEVEL.some((l) => d.sebelum[l] !== d.sesudah[l]);
  return (
    <div role="status" className={clsx("rounded-lg px-4 py-3 text-sm", hasil.ok ? "bg-aman-bg/40 text-aman-fg" : "bg-kritis-bg/40 text-kritis-fg")}>
      <div className="flex items-start gap-2 font-medium">
        {hasil.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />} {hasil.pesan}
      </div>
      {d && (
        <div className="mt-2 text-gray-800">
          {berubah ? "Dampak pada orang Sedang TB: " : "Jumlah per level tidak berubah: "}
          {LEVEL.map((l) => (
            <span key={l} className="mr-3 inline-block">
              {l} <b>{d.sebelum[l]}</b>
              {d.sebelum[l] !== d.sesudah[l] && <> → <b>{d.sesudah[l]}</b></>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const masukan = (salah?: string) =>
  clsx("w-full rounded-lg border bg-white px-3 text-[15px] outline-none focus:border-hijau-700", salah ? "border-kritis-fg" : "border-krem-300");

function Salah({ teks }: { teks?: string }) {
  return teks ? <p className="mt-1 text-xs text-kritis-fg">{teks}</p> : null;
}

function BarisTombol({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-3">{children}</div>;
}

// ---------------------------------------------------------------------------
// Parameter
// ---------------------------------------------------------------------------

type Param = { kunci: string; label: string; keterangan: string | null; tipe: string; nilai: string };

export function FormParameter({ parameter }: { parameter: Param[] }) {
  const awal = Object.fromEntries(parameter.map((p) => [p.kunci, p.tipe === "tanggal" ? formatTanggal(p.nilai) : p.nilai]));
  const [isian, setIsian] = useState<Record<string, string>>(awal);
  const { hasil, proses, jalankan, galat } = useAksi();
  return (
    <div className="grid gap-4">
      <PesanHasil hasil={hasil} />
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        {parameter.map((p) => (
          <div key={p.kunci}>
            <label htmlFor={`p-${p.kunci}`} className="mb-1 block text-sm font-medium text-gray-700">{p.label}</label>
            <input
              id={`p-${p.kunci}`}
              value={isian[p.kunci] ?? ""}
              inputMode={p.tipe === "teks" ? undefined : "numeric"}
              placeholder={p.tipe === "tanggal" ? "dd/mm/yyyy (kosong = hari ini)" : undefined}
              onChange={(e) => setIsian((s) => ({ ...s, [p.kunci]: e.target.value }))}
              className={clsx(masukan(galat[p.kunci]), "h-11", p.tipe === "angka" && "max-w-40")}
            />
            <Salah teks={galat[p.kunci]} />
          </div>
        ))}
      </div>
      <BarisTombol>
        <Tombol varian="utama" disabled={proses} onClick={() => jalankan(() => simpanParameter(isian))}>
          {proses ? "Menyimpan…" : "Simpan parameter"}
        </Tombol>
        <Tombol
          disabled={proses}
          onClick={() =>
            jalankan(async () => {
              const h = await kembalikanParameterBawaan();
              if (h.ok) setIsian(Object.fromEntries(parameter.map((p) => [p.kunci, ""])));
              return h;
            }, "Kembalikan semua parameter ke nilai bawaan Excel (termasuk mengosongkan tanggal acuan simulasi)?")
          }
        >
          Kembalikan ke bawaan Excel
        </Tombol>
      </BarisTombol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aturan hambatan
// ---------------------------------------------------------------------------

type Aturan = { kode: number; nama: string; skorDasar: number; saran: string; aktif: boolean };

export function TabelAturan({ aturan }: { aturan: Aturan[] }) {
  const [baris, setBaris] = useState<(Omit<Aturan, "skorDasar"> & { skorDasar: string })[]>(
    aturan.map((a) => ({ ...a, skorDasar: String(a.skorDasar) })),
  );
  const { hasil, proses, jalankan, galat } = useAksi();
  const ubah = (kode: number, k: string, v: string | boolean) => setBaris((s) => s.map((b) => (b.kode === kode ? { ...b, [k]: v } : b)));

  return (
    <div className="grid gap-4">
      <PesanHasil hasil={hasil} />
      <div className="grid gap-3">
        {baris.map((a) => (
          <div key={a.kode} className={clsx("rounded-xl border p-4", a.aktif ? "border-krem-200" : "border-dashed border-krem-300 bg-krem-50 opacity-80")}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="grid size-8 place-items-center rounded-full bg-hijau-900 text-sm font-bold text-white">{a.kode}</span>
              {a.kode === 0 ? null : (
                <>
                  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                    Skor dasar
                    <input
                      value={a.skorDasar}
                      inputMode="numeric"
                      onChange={(e) => ubah(a.kode, "skorDasar", e.target.value)}
                      className={clsx(masukan(galat[`${a.kode}.skorDasar`]), "h-10 w-20 text-center")}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={a.aktif} onChange={(e) => ubah(a.kode, "aktif", e.target.checked)} className="size-5 accent-hijau-900" />
                    Aktif
                  </label>
                </>
              )}
              <Salah teks={galat[`${a.kode}.skorDasar`]} />
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Nama hambatan</label>
                <textarea rows={2} value={a.nama} onChange={(e) => ubah(a.kode, "nama", e.target.value)} className={clsx(masukan(galat[`${a.kode}.nama`]), "py-2")} />
                <Salah teks={galat[`${a.kode}.nama`]} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Saran tindakan</label>
                <textarea rows={2} value={a.saran} onChange={(e) => ubah(a.kode, "saran", e.target.value)} className={clsx(masukan(galat[`${a.kode}.saran`]), "py-2")} />
                <Salah teks={galat[`${a.kode}.saran`]} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <BarisTombol>
        <Tombol varian="utama" disabled={proses} onClick={() => jalankan(() => simpanAturan(baris.map((b) => ({ ...b, skorDasar: b.skorDasar }))))}>
          {proses ? "Menyimpan…" : "Simpan aturan"}
        </Tombol>
        <Tombol
          disabled={proses}
          onClick={() =>
            jalankan(async () => {
              const h = await kembalikanAturanBawaan();
              if (h.ok) setBaris(ATURAN_HAMBATAN_BAWAAN.map((a) => ({ ...a, skorDasar: String(a.skorDasar), aktif: true })));
              return h;
            }, "Kembalikan nama, skor, saran, dan status aktif semua aturan ke bawaan Excel?")
          }
        >
          Kembalikan ke bawaan Excel
        </Tombol>
      </BarisTombol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pemetaan Status SK
// ---------------------------------------------------------------------------

type StatusSk = { statusSk: string; tahap: string; pihakPenahan: string; skTerbit: string; baru?: boolean };

export function TabelStatusSk({ baris: awal, dipakai, terkunci }: { baris: StatusSk[]; dipakai: Record<string, number>; terkunci: string[] }) {
  const [baris, setBaris] = useState<StatusSk[]>(awal);
  const { hasil, proses, jalankan, galat } = useAksi();
  const ubah = (i: number, k: keyof StatusSk, v: string) => setBaris((s) => s.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  const geser = (i: number, arah: -1 | 1) =>
    setBaris((s) => {
      const t = [...s];
      [t[i], t[i + arah]] = [t[i + arah], t[i]];
      return t;
    });

  return (
    <div className="grid gap-4">
      <PesanHasil hasil={hasil} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-krem-200 text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase">
            <tr>
              <th className="px-2 py-2">Status SK</th>
              <th className="px-2 py-2">Tahap</th>
              <th className="px-2 py-2">Pihak penahan bawaan</th>
              <th className="px-2 py-2">SK sudah terbit?</th>
              <th className="px-2 py-2 text-right">Dipakai</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-krem-100 align-top">
            {baris.map((b, i) => {
              const n = dipakai[b.statusSk] ?? 0;
              const kunci = terkunci.includes(b.statusSk);
              return (
                <tr key={i}>
                  <td className="px-2 py-2">
                    {b.baru ? (
                      <input value={b.statusSk} onChange={(e) => ubah(i, "statusSk", e.target.value)} placeholder="Nama status baru" className={clsx(masukan(galat[`${i}.statusSk`]), "h-10")} />
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        {b.statusSk} {kunci && <Lock size={12} className="text-gray-400" aria-label="Dipakai aturan" />}
                      </span>
                    )}
                    <Salah teks={galat[`${i}.statusSk`]} />
                  </td>
                  <td className="px-2 py-2">
                    <input value={b.tahap} onChange={(e) => ubah(i, "tahap", e.target.value)} className={clsx(masukan(galat[`${i}.tahap`]), "h-10 min-w-[230px]")} />
                    <Salah teks={galat[`${i}.tahap`]} />
                  </td>
                  <td className="px-2 py-2">
                    <input value={b.pihakPenahan} onChange={(e) => ubah(i, "pihakPenahan", e.target.value)} className={clsx(masukan(galat[`${i}.pihakPenahan`]), "h-10")} />
                    <Salah teks={galat[`${i}.pihakPenahan`]} />
                  </td>
                  <td className="px-2 py-2">
                    <select value={b.skTerbit} onChange={(e) => ubah(i, "skTerbit", e.target.value)} className={clsx(masukan(galat[`${i}.skTerbit`]), "h-10")}>
                      <option value="Ya">Ya</option>
                      <option value="Belum">Belum</option>
                    </select>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums text-gray-600">{n} orang</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    <button type="button" disabled={i === 0} onClick={() => geser(i, -1)} className="rounded p-1.5 text-gray-500 hover:bg-krem-100 disabled:opacity-30" aria-label="Naikkan"><ArrowUp size={16} /></button>
                    <button type="button" disabled={i === baris.length - 1} onClick={() => geser(i, 1)} className="rounded p-1.5 text-gray-500 hover:bg-krem-100 disabled:opacity-30" aria-label="Turunkan"><ArrowDown size={16} /></button>
                    <button
                      type="button"
                      disabled={kunci || n > 0}
                      title={kunci ? "Dipakai aturan hambatan" : n > 0 ? "Masih dipakai data" : "Hapus baris ini"}
                      onClick={() => setBaris((s) => s.filter((_, j) => j !== i))}
                      className="rounded p-1.5 text-kritis-fg hover:bg-kritis-bg/40 disabled:text-gray-300 disabled:hover:bg-transparent"
                      aria-label="Hapus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <BarisTombol>
        <Tombol type="button" onClick={() => setBaris((s) => [...s, { statusSk: "", tahap: "", pihakPenahan: "", skTerbit: "Belum", baru: true }])}>
          <Plus size={16} /> Tambah Status SK
        </Tombol>
        <Tombol
          varian="utama"
          disabled={proses}
          onClick={() =>
            jalankan(async () => {
              const h = await simpanStatusSk(baris);
              // Setelah tersimpan, nama Status SK baru terkunci seperti yang lain.
              if (h.ok) setBaris((s) => s.map((b) => ({ ...b, baru: false })));
              return h;
            })
          }
        >
          {proses ? "Menyimpan…" : "Simpan Status SK"}
        </Tombol>
        <Tombol
          disabled={proses}
          onClick={() =>
            jalankan(async () => {
              const h = await kembalikanStatusSkBawaan();
              if (h.ok) setBaris((s) => [...STATUS_SK_BAWAAN, ...s.filter((b) => !b.baru && !STATUS_SK_BAWAAN.some((x) => x.statusSk === b.statusSk))]);
              return h;
            }, "Kembalikan tahap, pihak penahan, dan SK terbit ke bawaan Excel? Status SK tambahan tetap disimpan.")
          }
        >
          Kembalikan ke bawaan Excel
        </Tombol>
      </BarisTombol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Daftar pilihan
// ---------------------------------------------------------------------------

type Pilihan = { id: number; nilai: string; aktif: boolean; sistem: boolean; dipakai: number };

export function KelolaPilihan({ kategori, judul, isi }: { kategori: string; judul: string; isi: Pilihan[] }) {
  const [baru, setBaru] = useState("");
  const { hasil, proses, jalankan } = useAksi();
  const tombolIkon = "rounded p-1.5 text-gray-500 hover:bg-krem-100 disabled:opacity-30";
  return (
    <div className="rounded-xl border border-krem-200 p-4">
      <h3 className="mb-3 font-semibold text-hijau-900">{judul}</h3>
      <div className="mb-3"><PesanHasil hasil={hasil} /></div>
      <ul className="divide-y divide-krem-100">
        {isi.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2 py-1.5">
            <span className={clsx("flex-1 text-[15px]", !p.aktif && "text-gray-400 line-through")}>
              {kategori === "PRESENSI" ? labelAbsensi(p.nilai) : p.nilai} {p.sistem && <Lock size={12} className="inline text-gray-400" aria-label="Dipakai aturan" />}
            </span>
            <span className="text-xs text-gray-500 tabular-nums">{p.dipakai} orang</span>
            <button type="button" className={tombolIkon} disabled={proses || i === 0} onClick={() => jalankan(() => ubahPilihan(p.id, { geser: -1 }))} aria-label="Naikkan"><ArrowUp size={15} /></button>
            <button type="button" className={tombolIkon} disabled={proses || i === isi.length - 1} onClick={() => jalankan(() => ubahPilihan(p.id, { geser: 1 }))} aria-label="Turunkan"><ArrowDown size={15} /></button>
            <button
              type="button"
              className={tombolIkon}
              disabled={proses || p.sistem}
              title={p.aktif ? "Sembunyikan dari dropdown" : "Tampilkan lagi di dropdown"}
              onClick={() => jalankan(() => ubahPilihan(p.id, { aktif: !p.aktif }))}
              aria-label={p.aktif ? "Sembunyikan" : "Tampilkan"}
            >
              {p.aktif ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <button
              type="button"
              className="rounded p-1.5 text-kritis-fg hover:bg-kritis-bg/40 disabled:text-gray-300 disabled:hover:bg-transparent"
              disabled={proses || p.sistem || p.dipakai > 0}
              title={p.sistem ? "Dipakai aturan hambatan" : p.dipakai > 0 ? "Masih dipakai data; sembunyikan saja" : "Hapus"}
              onClick={() => jalankan(() => hapusPilihan(p.id), `Hapus "${p.nilai}" dari daftar ${judul}?`)}
              aria-label="Hapus"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          jalankan(async () => {
            const h = await tambahPilihan(kategori, baru);
            if (h.ok) setBaru("");
            return h;
          });
        }}
      >
        <input value={baru} onChange={(e) => setBaru(e.target.value)} placeholder="Nilai baru…" className={clsx(masukan(), "h-10 flex-1")} />
        <Tombol type="submit" disabled={proses || !baru.trim()} className="h-10 px-3"><Plus size={15} /> Tambah</Tombol>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hari libur
// ---------------------------------------------------------------------------

export function KelolaLibur({ libur }: { libur: { tanggal: string; keterangan: string | null }[] }) {
  const [tanggal, setTanggal] = useState("");
  const [ket, setKet] = useState("");
  const { hasil, proses, jalankan, galat } = useAksi();
  return (
    <div className="grid gap-4">
      <PesanHasil hasil={hasil} />
      <form
        className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-start"
        onSubmit={(e) => {
          e.preventDefault();
          jalankan(async () => {
            const h = await tambahLibur(tanggal, ket);
            if (h.ok) {
              setTanggal("");
              setKet("");
            }
            return h;
          });
        }}
      >
        <div>
          <input value={tanggal} onChange={(e) => setTanggal(e.target.value)} placeholder="dd/mm/yyyy" inputMode="numeric" aria-label="Tanggal libur" className={clsx(masukan(galat.tanggal), "h-11")} />
          <Salah teks={galat.tanggal} />
        </div>
        <input value={ket} onChange={(e) => setKet(e.target.value)} placeholder="Keterangan, mis. Hari Kemerdekaan RI" aria-label="Keterangan" className={clsx(masukan(), "h-11")} />
        <Tombol type="submit" varian="utama" disabled={proses || !tanggal.trim()}><Plus size={16} /> Tambah</Tombol>
      </form>
      {libur.length === 0 ? (
        <p className="text-[15px] text-gray-500">Belum ada hari libur.</p>
      ) : (
        <ul className="divide-y divide-krem-100">
          {libur.map((h) => (
            <li key={h.tanggal} className="flex items-center gap-3 py-2">
              <span className="w-28 font-medium tabular-nums">{formatTanggal(h.tanggal)}</span>
              <span className="flex-1 text-gray-700">{h.keterangan}</span>
              <button
                type="button"
                disabled={proses}
                onClick={() => jalankan(() => hapusLibur(h.tanggal), `Hapus hari libur ${formatTanggal(h.tanggal)}?`)}
                className="rounded p-1.5 text-kritis-fg hover:bg-kritis-bg/40"
                aria-label="Hapus"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rekap manual
// ---------------------------------------------------------------------------

export function FormRekapFakultas({ tanggal, baris: awal }: { tanggal: string; baris: { fakultas: string; tugasBelajar: number; biayaMandiri: number }[] }) {
  const [tgl, setTgl] = useState(formatTanggal(tanggal));
  const [baris, setBaris] = useState(awal.map((b) => ({ ...b, tugasBelajar: String(b.tugasBelajar), biayaMandiri: String(b.biayaMandiri) })));
  const { hasil, proses, jalankan, galat } = useAksi();
  const ubah = (f: string, k: "tugasBelajar" | "biayaMandiri", v: string) => setBaris((s) => s.map((b) => (b.fakultas === f ? { ...b, [k]: v } : b)));
  return (
    <div className="grid gap-4">
      <PesanHasil hasil={hasil} />
      <label className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-700">
        Rekap per tanggal
        <input value={tgl} onChange={(e) => setTgl(e.target.value)} inputMode="numeric" className={clsx(masukan(galat.tanggalRekap), "h-10 w-36")} />
        <Salah teks={galat.tanggalRekap} />
      </label>
      <div className="overflow-x-auto">
        <table className="w-full max-w-xl text-sm">
          <thead className="border-b border-krem-200 text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase">
            <tr><th className="px-2 py-2">Fakultas</th><th className="px-2 py-2">Tugas Belajar</th><th className="px-2 py-2">TB Biaya Mandiri</th></tr>
          </thead>
          <tbody className="divide-y divide-krem-100">
            {baris.map((b) => (
              <tr key={b.fakultas}>
                <td className="px-2 py-1.5 font-medium">{b.fakultas}</td>
                {(["tugasBelajar", "biayaMandiri"] as const).map((k) => (
                  <td key={k} className="px-2 py-1.5">
                    <input value={b[k]} inputMode="numeric" onChange={(e) => ubah(b.fakultas, k, e.target.value)} className={clsx(masukan(galat[`${b.fakultas}.${k}`]), "h-10 w-24 text-right")} aria-label={`${b.fakultas} ${k}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BarisTombol>
        <Tombol varian="utama" disabled={proses} onClick={() => jalankan(() => simpanRekapFakultas(tgl, baris))}>{proses ? "Menyimpan…" : "Simpan rekap fakultas"}</Tombol>
      </BarisTombol>
    </div>
  );
}

type RekapSk = { id?: number; uraian: string; jumlah: string; kelompok: string | null };

export function FormRekapSk({ baris: awal }: { baris: { id: number; uraian: string; jumlah: number; kelompok: string | null }[] }) {
  const [baris, setBaris] = useState<RekapSk[]>(awal.map((b) => ({ ...b, jumlah: String(b.jumlah) })));
  const { hasil, proses, jalankan, galat } = useAksi();
  const ubah = (i: number, k: keyof RekapSk, v: string | null) => setBaris((s) => s.map((b, j) => (j === i ? { ...b, [k]: v } : b)));
  return (
    <div className="grid gap-4">
      <PesanHasil hasil={hasil} />
      <ul className="grid gap-2">
        {baris.map((b, i) => (
          <li key={b.id ?? `baru-${i}`} className="grid gap-2 rounded-lg border border-krem-200 p-3 sm:grid-cols-[1fr_6rem_11rem_auto] sm:items-center">
            <div>
              <input value={b.uraian} onChange={(e) => ubah(i, "uraian", e.target.value)} placeholder="Uraian" aria-label="Uraian" className={clsx(masukan(galat[`${i}.uraian`]), "h-10")} />
              <Salah teks={galat[`${i}.uraian`]} />
            </div>
            <div>
              <input value={b.jumlah} inputMode="numeric" onChange={(e) => ubah(i, "jumlah", e.target.value)} aria-label="Jumlah" className={clsx(masukan(galat[`${i}.jumlah`]), "h-10 text-right")} />
              <Salah teks={galat[`${i}.jumlah`]} />
            </div>
            <select value={b.kelompok ?? ""} onChange={(e) => ubah(i, "kelompok", e.target.value || null)} aria-label="Dijumlahkan ke" className={clsx(masukan(), "h-10")}>
              <option value="">Tidak dijumlahkan</option>
              <option value="SUDAH_TERBIT">Total sudah terbit</option>
              <option value="BELUM_TERBIT">Total belum terbit</option>
            </select>
            <button type="button" onClick={() => setBaris((s) => s.filter((_, j) => j !== i))} className="justify-self-end rounded p-1.5 text-kritis-fg hover:bg-kritis-bg/40" aria-label="Hapus baris">
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      <BarisTombol>
        <Tombol type="button" onClick={() => setBaris((s) => [...s, { uraian: "", jumlah: "0", kelompok: null }])}><Plus size={16} /> Tambah baris</Tombol>
        <Tombol varian="utama" disabled={proses} onClick={() => jalankan(() => simpanRekapSk(baris))}>{proses ? "Menyimpan…" : "Simpan rekap SK"}</Tombol>
      </BarisTombol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Perawatan data: isi Status SK yang kosong
// ---------------------------------------------------------------------------

export function IsiStatusSkKosong({ jumlah, pilihan }: { jumlah: number; pilihan: string[] }) {
  const router = useRouter();
  const [nilai, setNilai] = useState(pilihan.includes("TB Aktif") ? "TB Aktif" : (pilihan[0] ?? ""));
  const [pratinjau, setPratinjau] = useState<PratinjauIsiStatusSk | null>(null);
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [proses, mulai] = useTransition();

  const lihat = () =>
    mulai(async () => {
      setPesan(null);
      const h = await pratinjauStatusSkKosong(nilai);
      if (h.ok) setPratinjau(h.data);
      else setPesan({ ok: false, teks: h.pesan });
    });

  const terapkan = () => {
    if (!pratinjau || !window.confirm(`Isi Status SK "${pratinjau.nilai}" untuk ${pratinjau.jumlah} orang? Perubahan tercatat di Log Aktivitas.`)) return;
    mulai(async () => {
      const h = await terapkanStatusSkKosong(nilai);
      setPesan({ ok: h.ok, teks: h.pesan });
      if (h.ok) {
        setPratinjau(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-4">
      {pesan && (
        <div role="status" className={clsx("flex items-start gap-2 rounded-lg px-4 py-3 text-sm font-medium", pesan.ok ? "bg-aman-bg/40 text-aman-fg" : "bg-kritis-bg/40 text-kritis-fg")}>
          {pesan.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />} {pesan.teks}
        </div>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="mb-1 text-sm font-medium text-gray-700">Sedang TB dengan Status SK kosong</div>
          <div className="text-3xl font-bold text-hijau-900 tabular-nums">{jumlah}</div>
        </div>
        <div>
          <label htmlFor="isi-sk" className="mb-1 block text-sm font-medium text-gray-700">Isi dengan</label>
          <select
            id="isi-sk"
            value={nilai}
            onChange={(e) => {
              setNilai(e.target.value);
              setPratinjau(null);
            }}
            className={clsx(masukan(), "h-11")}
          >
            {pilihan.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <Tombol disabled={proses || jumlah === 0} onClick={lihat}>
          {proses && !pratinjau ? "Menghitung…" : "Lihat dampak"}
        </Tombol>
      </div>

      {pratinjau && (
        <div className="grid gap-4 rounded-xl border border-krem-200 bg-krem-50 p-4">
          <div className="text-[15px]">
            <b>{pratinjau.jumlah} orang</b> akan diisi <b>{pratinjau.nilai}</b>
            <span className="text-gray-600"> (tahap {pratinjau.tahap}, SK terbit: {pratinjau.skTerbit})</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]">
            {LEVEL.map((l) => (
              <span key={l}>
                {l} <b>{pratinjau.sebelum[l]}</b>
                {pratinjau.sebelum[l] !== pratinjau.sesudah[l] && (
                  <>
                    {" "}→ <b className="text-hijau-900">{pratinjau.sesudah[l]}</b>
                  </>
                )}
              </span>
            ))}
          </div>
          <ul className="text-sm text-gray-700">
            {pratinjau.perpindahan.map((g) => (
              <li key={`${g.dari}-${g.ke}`}>
                kode {g.dari} → kode {g.ke}: {g.jumlah} orang
              </li>
            ))}
          </ul>
          <div>
            <Tombol varian="utama" disabled={proses} onClick={terapkan}>
              {proses ? "Menyimpan…" : `Terapkan ke ${pratinjau.jumlah} orang`}
            </Tombol>
          </div>
        </div>
      )}
    </div>
  );
}

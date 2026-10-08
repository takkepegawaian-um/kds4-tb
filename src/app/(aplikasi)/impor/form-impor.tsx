"use client";

// Layar Impor: pilih berkas -> periksa (pratinjau) -> pilih baris -> simpan.

import Link from "next/link";
import { useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, XCircle } from "lucide-react";
import clsx from "clsx";
import { Kartu, JudulKartu, KotakInfo, Tombol } from "@/components/ui";
import { labelAbsensi } from "@/lib/aturan/label-absensi";
import { formatTanggal } from "@/lib/tanggal";
import { periksaBerkas, simpanImpor, type HasilSimpan, type PratinjauImpor } from "./aksi";

const KOLOM_TANGGAL = new Set(["tmtTb", "masaStudiSd", "perpanjanganSd", "presensiTbSd", "tanggalMasukTahap"]);

function tampil(kolom: string, v: string | number | null) {
  if (v === null || v === "") return <span className="text-gray-400 italic">kosong</span>;
  if (kolom === "presensi") return labelAbsensi(String(v));
  return KOLOM_TANGGAL.has(kolom) ? formatTanggal(String(v)) : String(v);
}

export function FormImpor() {
  const masukan = useRef<HTMLInputElement>(null);
  const [berkas, setBerkas] = useState<File | null>(null);
  const [pratinjau, setPratinjau] = useState<PratinjauImpor | null>(null);
  const [dipilih, setDipilih] = useState<Set<number>>(new Set());
  const [galat, setGalat] = useState<string | null>(null);
  const [selesai, setSelesai] = useState<HasilSimpan | null>(null);
  const [sedangProses, mulai] = useTransition();
  const [aksi, setAksi] = useState<"periksa" | "simpan">("periksa");

  function pilihBerkas(f: File | null) {
    setBerkas(f);
    setPratinjau(null);
    setSelesai(null);
    setGalat(null);
  }

  function periksa() {
    if (!berkas) return;
    const fd = new FormData();
    fd.set("berkas", berkas);
    setAksi("periksa");
    mulai(async () => {
      setGalat(null);
      const h = await periksaBerkas(fd);
      if (!h.ok) return setGalat(h.pesan);
      setPratinjau(h.data);
      setDipilih(new Set([...h.data.baru, ...h.data.ubah].map((b) => b.baris)));
    });
  }

  function simpan() {
    if (!berkas || !pratinjau) return;
    if (!window.confirm(`Simpan ${dipilih.size} baris ke database?`)) return;
    const fd = new FormData();
    fd.set("berkas", berkas);
    fd.set("dipilih", JSON.stringify([...dipilih]));
    setAksi("simpan");
    mulai(async () => {
      setGalat(null);
      const h = await simpanImpor(fd);
      if (!h.ok) return setGalat(h.pesan);
      setSelesai(h.data);
      setPratinjau(null);
      setBerkas(null);
      if (masukan.current) masukan.current.value = "";
    });
  }

  return (
    <div className="grid gap-6">
      <Kartu>
        <JudulKartu>
          1. Pilih berkas Excel
        </JudulKartu>
        <label
          className={clsx(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
            berkas ? "border-hijau-700 bg-krem-50" : "border-krem-300 hover:border-hijau-700",
          )}
        >
          <FileSpreadsheet size={36} className="text-hijau-700" />
          <span className="text-[15px] font-semibold text-hijau-900">
            {berkas ? berkas.name : "Klik untuk memilih berkas DATA_TB.xlsx"}
          </span>
          {berkas && <span className="text-sm text-gray-500">{`${(berkas.size / 1024).toFixed(0)} KB`}</span>}
          <input
            ref={masukan}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="sr-only"
            onChange={(e) => pilihBerkas(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <Tombol varian="utama" onClick={periksa} disabled={!berkas || sedangProses}>
            {sedangProses && aksi === "periksa" ? "Memeriksa…" : "Periksa berkas"}
          </Tombol>
        </div>
      </Kartu>

      {galat && (
        <div className="flex items-start gap-3 rounded-xl border border-kritis-bg bg-kritis-bg/40 px-4 py-3 text-kritis-fg">
          <XCircle size={20} className="mt-0.5 shrink-0" />
          <div>{galat}</div>
        </div>
      )}

      {selesai && <HasilSelesai hasil={selesai} />}

      {pratinjau && (
        <Pratinjau
          p={pratinjau}
          dipilih={dipilih}
          setDipilih={setDipilih}
          onSimpan={simpan}
          sedangProses={sedangProses && aksi === "simpan"}
        />
      )}
    </div>
  );
}

function HasilSelesai({ hasil }: { hasil: HasilSimpan }) {
  return (
    <Kartu className="border-aman-bg bg-aman-bg/30">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 shrink-0 text-aman-fg" />
        <div>
          <div className="text-lg font-semibold text-aman-fg">Impor berhasil disimpan</div>
          <p className="mt-1 text-[15px]">
            {hasil.ditambah} orang ditambahkan, {hasil.diubah} orang diperbarui, {hasil.dilewati} tidak dipilih,{" "}
            {hasil.gagal} baris gagal (tidak disimpan).
          </p>
          <Link href="/" className="mt-2 inline-block font-semibold text-hijau-900 underline">
            Lihat Ringkasan
          </Link>
        </div>
      </div>
    </Kartu>
  );
}

function Angka({ label, nilai, nada }: { label: string; nilai: number; nada?: "baik" | "buruk" | "waspada" }) {
  return (
    <div
      className={clsx(
        "rounded-xl border px-4 py-3",
        nada === "buruk" && nilai > 0
          ? "border-kritis-bg bg-kritis-bg/30"
          : nada === "waspada" && nilai > 0
            ? "border-waspada-bg bg-waspada-bg/30"
            : nada === "baik"
              ? "border-aman-bg bg-aman-bg/20"
              : "border-krem-200 bg-white",
      )}
    >
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-bold text-hijau-900">{nilai}</div>
    </div>
  );
}

function Bagian({ judul, jumlah, terbuka, children }: { judul: string; jumlah: number; terbuka?: boolean; children: ReactNode }) {
  if (jumlah === 0) return null;
  return (
    <details open={terbuka} className="group rounded-xl border border-krem-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[15px] font-semibold text-hijau-900">
        <span>
          {judul} <span className="text-gray-500">({jumlah})</span>
        </span>
        <span className="text-sm font-normal text-gray-500 group-open:hidden">Tampilkan</span>
        <span className="hidden text-sm font-normal text-gray-500 group-open:inline">Sembunyikan</span>
      </summary>
      <div className="max-h-[480px] overflow-auto border-t border-krem-100">{children}</div>
    </details>
  );
}

const th = "sticky top-0 bg-krem-50 px-3 py-2 text-left text-xs font-semibold tracking-[0.06em] text-gray-500 uppercase";
const td = "px-3 py-2 align-top text-sm";

function Pratinjau({
  p,
  dipilih,
  setDipilih,
  onSimpan,
  sedangProses,
}: {
  p: PratinjauImpor;
  dipilih: Set<number>;
  setDipilih: (s: Set<number>) => void;
  onSimpan: () => void;
  sedangProses: boolean;
}) {
  const berperingatan = useMemo(
    () => [...p.baru, ...p.ubah, ...p.sama].filter((b) => b.peringatan.length).sort((a, b) => a.baris - b.baris),
    [p],
  );
  const bisaDipilih = [...p.baru, ...p.ubah].map((b) => b.baris);

  const ubahPilihan = (baris: number, ya: boolean) => {
    const s = new Set(dipilih);
    if (ya) s.add(baris);
    else s.delete(baris);
    setDipilih(s);
  };
  const pilihSemua = (daftar: number[], ya: boolean) => {
    const s = new Set(dipilih);
    daftar.forEach((b) => (ya ? s.add(b) : s.delete(b)));
    setDipilih(s);
  };

  const kotakPilih = (baris: number) => (
    <input
      type="checkbox"
      className="size-5 accent-hijau-900"
      checked={dipilih.has(baris)}
      onChange={(e) => ubahPilihan(baris, e.target.checked)}
      aria-label={`Pilih baris ${baris}`}
    />
  );
  const pilihSemuaKotak = (daftar: number[]) => (
    <input
      type="checkbox"
      className="size-5 accent-hijau-900"
      checked={daftar.every((b) => dipilih.has(b))}
      onChange={(e) => pilihSemua(daftar, e.target.checked)}
      aria-label="Pilih semua"
    />
  );

  return (
    <>
      <Kartu>
        <JudulKartu>
          2. Hasil pemeriksaan: {p.namaBerkas}
        </JudulKartu>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Angka label="Baris terbaca" nilai={p.jumlahBaris} />
          <Angka label="Orang baru" nilai={p.baru.length} nada="baik" />
          <Angka label="Data berubah" nilai={p.ubah.length} />
          <Angka label="Sama, tidak berubah" nilai={p.sama.length} />
          <Angka label="Gagal" nilai={p.gagal.length} nada="buruk" />
          <Angka label="Dengan peringatan" nilai={berperingatan.length} nada="waspada" />
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          {p.kolomHilang.length > 0 && (
            <KotakInfo nada="peringatan">
              Kolom tidak ditemukan di berkas (akan dibiarkan kosong untuk orang baru): {p.kolomHilang.join(", ")}.
            </KotakInfo>
          )}
        </div>
      </Kartu>

      <div className="grid gap-4">
        <Bagian judul="Baris gagal (tidak akan disimpan)" jumlah={p.gagal.length} terbuka>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Baris</th>
                <th className={th}>Nama</th>
                <th className={th}>NIP</th>
                <th className={th}>Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-krem-100">
              {p.gagal.map((g) => (
                <tr key={g.baris}>
                  <td className={td}>{g.baris}</td>
                  <td className={td}>{g.nama}</td>
                  <td className={`${td} font-mono`}>{g.nip}</td>
                  <td className={`${td} text-kritis-fg`}>{g.alasan.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bagian>

        <Bagian judul="Peringatan (tetap disimpan, mohon diperiksa)" jumlah={berperingatan.length} terbuka>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Baris</th>
                <th className={th}>Nama</th>
                <th className={th}>NIP</th>
                <th className={th}>Peringatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-krem-100">
              {berperingatan.map((b) => (
                <tr key={b.baris}>
                  <td className={td}>{b.baris}</td>
                  <td className={td}>{b.nama}</td>
                  <td className={`${td} font-mono`}>{b.nip}</td>
                  <td className={`${td} text-waspada-fg`}>
                    <ul className="list-disc pl-4">
                      {b.peringatan.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bagian>

        <Bagian judul="Data berubah" jumlah={p.ubah.length} terbuka>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>
                  {pilihSemuaKotak(p.ubah.map((u) => u.baris))}
                </th>
                <th className={th}>Baris</th>
                <th className={th}>Nama</th>
                <th className={th}>Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-krem-100">
              {p.ubah.map((u) => (
                <tr key={u.baris}>
                  <td className={td}>
                    {kotakPilih(u.baris)}
                  </td>
                  <td className={td}>{u.baris}</td>
                  <td className={td}>
                    {u.nama}
                    <div className="font-mono text-xs text-gray-500">{u.nip}</div>
                  </td>
                  <td className={td}>
                    <ul className="space-y-1">
                      {u.perubahan.map((x) => (
                        <li key={x.kolom}>
                          <span className="font-semibold">{x.judul}:</span>{" "}
                          <span className="text-kritis-fg line-through">{tampil(x.kolom, x.lama)}</span>{" "}
                          → <span className="text-aman-fg">{tampil(x.kolom, x.baru)}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bagian>

        <Bagian judul="Orang baru" jumlah={p.baru.length} terbuka={p.baru.length <= 20}>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>
                  {pilihSemuaKotak(p.baru.map((b) => b.baris))}
                </th>
                <th className={th}>Baris</th>
                <th className={th}>Nama</th>
                <th className={th}>NIP</th>
                <th className={th}>Status akhir</th>
                <th className={th}>Fakultas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-krem-100">
              {p.baru.map((b) => (
                <tr key={b.baris}>
                  <td className={td}>
                    {kotakPilih(b.baris)}
                  </td>
                  <td className={td}>{b.baris}</td>
                  <td className={td}>
                    {b.nama} {b.peringatan.length > 0 && <AlertTriangle size={14} className="inline text-waspada-fg" />}
                  </td>
                  <td className={`${td} font-mono`}>{b.nip}</td>
                  <td className={td}>{b.statusAkhir}</td>
                  <td className={td}>{b.fakultas ?? <span className="text-gray-400 italic">kosong</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bagian>
      </div>

      <Kartu className="sticky bottom-4 z-10 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-[15px]">
            <b>{dipilih.size}</b> dari {bisaDipilih.length} baris dipilih untuk disimpan
            {p.gagal.length > 0 && <span className="text-gray-500"> · {p.gagal.length} baris gagal dilewati</span>}
          </div>
          <Tombol varian="utama" onClick={onSimpan} disabled={dipilih.size === 0 || sedangProses}>
            {sedangProses ? "Menyimpan…" : `3. Simpan ${dipilih.size} baris`}
          </Tombol>
        </div>
      </Kartu>
    </>
  );
}

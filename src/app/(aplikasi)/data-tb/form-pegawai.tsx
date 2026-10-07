"use client";

// Form tambah / ubah data pegawai TB.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { AlertTriangle, Info, XCircle } from "lucide-react";
import clsx from "clsx";
import { Kartu, Tombol } from "@/components/ui";
import { ISIAN, KELOMPOK_FORM, type DaftarPilihanForm, type KolomForm } from "@/lib/data/formulir";
import { formatTanggal, hariIniJakarta } from "@/lib/tanggal";
import { cekNip, simpanPegawai } from "./aksi";

type Props = {
  id: number | null;
  /** Isian awal; tanggal ditulis dd/mm/yyyy */
  awal: Partial<Record<KolomForm, string>>;
  daftar: DaftarPilihanForm;
  /** Status SK -> Tahap, untuk mengisi otomatis "Tanggal masuk tahap" */
  petaTahap: Record<string, string>;
  tahapKosong: string;
};

/** "31082026" -> "31/08/2026" saat isian tanggal ditinggalkan. */
function rapikanTanggal(t: string): string {
  const angka = t.replace(/\D/g, "");
  if (/^\d{8}$/.test(angka) && !t.includes("/")) return `${angka.slice(0, 2)}/${angka.slice(2, 4)}/${angka.slice(4)}`;
  return t.trim();
}

export function FormPegawai({ id, awal, daftar, petaTahap, tahapKosong }: Props) {
  const router = useRouter();
  const [isian, setIsian] = useState<Partial<Record<KolomForm, string>>>(awal);
  const [galat, setGalat] = useState<Partial<Record<KolomForm, string>>>({});
  const [pesan, setPesan] = useState<string | null>(null);
  const [nipKembar, setNipKembar] = useState<{ id: number; nama: string; statusAkhir: string }[]>([]);
  const [catatanTahap, setCatatanTahap] = useState<string | null>(null);
  const [menyimpan, mulai] = useTransition();
  const atas = useRef<HTMLDivElement>(null);

  const tahapDari = (statusSk: string | undefined) => (statusSk && petaTahap[statusSk]) || tahapKosong;

  function ubah(kolom: KolomForm, nilai: string) {
    setIsian((s) => ({ ...s, [kolom]: nilai }));
    if (galat[kolom]) setGalat((g) => ({ ...g, [kolom]: undefined }));

    if (kolom === "statusSk") {
      const tahapLama = tahapDari(awal.statusSk);
      const tahapBaru = tahapDari(nilai);
      if (tahapBaru !== tahapLama) {
        const hariIni = formatTanggal(hariIniJakarta());
        setIsian((s) => ({ ...s, statusSk: nilai, tanggalMasukTahap: hariIni }));
        setCatatanTahap(`Tahap berubah menjadi "${tahapBaru}", jadi Tanggal masuk tahap diisi ${hariIni}. Ubah bila tanggal sebenarnya berbeda.`);
      } else {
        setIsian((s) => ({ ...s, statusSk: nilai, tanggalMasukTahap: awal.tanggalMasukTahap ?? "" }));
        setCatatanTahap(null);
      }
    }
  }

  async function periksaNip() {
    const nip = (isian.nip ?? "").trim();
    setNipKembar(nip ? await cekNip(nip, id ?? undefined) : []);
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault();
    mulai(async () => {
      setPesan(null);
      const h = await simpanPegawai(id, isian);
      if (!h.ok) {
        setGalat(h.galat ?? {});
        setPesan(h.pesan);
        atas.current?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      router.push(`/data-tb/${h.id}?disimpan=1`);
      router.refresh();
    });
  }

  const nipTidakBaku = !!isian.nip && !/^\d{18}$/.test(isian.nip.trim());

  return (
    <form onSubmit={simpan} className="grid gap-6" noValidate>
      <div ref={atas} />
      {pesan && (
        <div className="flex items-start gap-3 rounded-xl border border-kritis-bg bg-kritis-bg/40 px-4 py-3 text-kritis-fg">
          <XCircle size={20} className="mt-0.5 shrink-0" />
          <div>{pesan}</div>
        </div>
      )}

      {KELOMPOK_FORM.map((kelompok) => (
        <Kartu key={kelompok.judul}>
          <h2 className="mb-4 text-lg font-semibold text-hijau-900">{kelompok.judul}</h2>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {kelompok.kolom.map((kolom) => {
              const def = ISIAN[kolom];
              const nilai = isian[kolom] ?? "";
              const idIsian = `isian-${kolom}`;
              const kelas = clsx(
                "w-full rounded-lg border bg-white px-3 text-[15px] outline-none focus:border-hijau-700 focus:ring-2 focus:ring-hijau-700/15",
                galat[kolom] ? "border-kritis-fg" : "border-krem-300",
              );
              let masukan: React.ReactNode;
              if (def.isian.jenis === "pilihan") {
                const pilihan = daftar[def.isian.daftar] ?? [];
                const diLuar = nilai && !pilihan.some((p) => p.toLowerCase() === nilai.toLowerCase());
                masukan = (
                  <select id={idIsian} value={nilai} onChange={(e) => ubah(kolom, e.target.value)} className={`${kelas} h-11`}>
                    <option value="">{def.wajib ? "Pilih…" : "(kosong)"}</option>
                    {pilihan.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                    {diLuar && <option value={nilai}>{nilai} (tidak ada di daftar)</option>}
                  </select>
                );
              } else if (def.isian.jenis === "panjang") {
                masukan = (
                  <textarea id={idIsian} value={nilai} rows={3} onChange={(e) => ubah(kolom, e.target.value)} className={`${kelas} py-2`} />
                );
              } else if (def.isian.jenis === "tanggal") {
                masukan = (
                  <input id={idIsian} value={nilai} inputMode="numeric" placeholder="dd/mm/yyyy" autoComplete="off"
                    onChange={(e) => ubah(kolom, e.target.value)}
                    onBlur={(e) => ubah(kolom, rapikanTanggal(e.target.value))}
                    className={`${kelas} h-11`} />
                );
              } else {
                masukan = (
                  <input id={idIsian} value={nilai} autoComplete="off"
                    inputMode={kolom === "nip" ? "numeric" : undefined}
                    onChange={(e) => ubah(kolom, e.target.value)}
                    onBlur={kolom === "nip" ? periksaNip : undefined}
                    className={`${kelas} h-11 ${kolom === "nip" ? "font-mono" : ""}`} />
                );
              }
              return (
                <div key={kolom} className={def.isian.jenis === "panjang" || kolom === "nama" ? "sm:col-span-2" : ""}>
                  <label htmlFor={idIsian} className="mb-1 block text-sm font-medium text-gray-700">
                    {def.label} {def.wajib && <span className="text-kritis-fg">*</span>}
                  </label>
                  {masukan}
                  {galat[kolom] && <p className="mt-1 text-sm text-kritis-fg">{galat[kolom]}</p>}
                  {def.bantuan && !galat[kolom] && <p className="mt-1 text-xs text-gray-500">{def.bantuan}</p>}
                  {kolom === "nip" && nipTidakBaku && (
                    <p className="mt-1 flex items-center gap-1 text-sm text-waspada-fg">
                      <AlertTriangle size={14} /> NIP berisi {isian.nip!.trim().length} karakter, biasanya 18 digit angka.
                    </p>
                  )}
                  {kolom === "nip" && nipKembar.length > 0 && (
                    <p className="mt-1 text-sm text-waspada-fg">
                      <AlertTriangle size={14} className="mr-1 inline" />
                      NIP ini sudah dipakai:{" "}
                      {nipKembar.map((o, i) => (
                        <span key={o.id}>
                          {i > 0 && ", "}
                          <Link href={`/data-tb/${o.id}`} target="_blank" className="underline">{o.nama}</Link> ({o.statusAkhir})
                        </span>
                      ))}
                      . Tetap boleh disimpan bila memang benar.
                    </p>
                  )}
                  {kolom === "tanggalMasukTahap" && catatanTahap && (
                    <p className="mt-1 flex items-start gap-1 text-sm text-perhatian-fg">
                      <Info size={14} className="mt-0.5 shrink-0" /> {catatanTahap}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Kartu>
      ))}

      <Kartu className="sticky bottom-4 z-10 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="hidden text-sm text-gray-600 sm:block"><span className="text-kritis-fg">*</span> wajib diisi. Setiap perubahan dicatat di riwayat.</p>
          <div className="flex w-full gap-3 sm:w-auto">
            <Link href={id ? `/data-tb/${id}` : "/data-tb"}
              className="inline-flex h-11 items-center rounded-lg border border-krem-300 bg-white px-5 text-[13px] font-semibold tracking-[0.08em] text-hijau-900 uppercase">
              Batal
            </Link>
            <Tombol type="submit" varian="utama" disabled={menyimpan} className="flex-1 sm:flex-none">
              {menyimpan ? "Menyimpan…" : id ? "Simpan perubahan" : "Simpan pegawai baru"}
            </Tombol>
          </div>
        </div>
      </Kartu>
    </form>
  );
}

"use client";

// Formulir pembuat SK: pilih pegawai (opsional), lengkapi isian, unduh konsep Word.

import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, Download, XCircle } from "lucide-react";
import clsx from "clsx";
import { JudulKartu, Kartu, Tombol } from "@/components/ui";
import type { Isian } from "@/lib/sk/jenis";
import { ambilIsianPegawai } from "../aksi";

type IsianKlien = Omit<Isian, "dariPegawai"> & { dariData: boolean };

type Props = {
  jenisId: string;
  isian: IsianKlien[];
  pegawai: { id: number; label: string }[];
};

/** "31082026" -> "31/08/2026" saat isian tanggal ditinggalkan. */
function rapikanTanggal(t: string): string {
  const angka = t.replace(/\D/g, "");
  if (/^\d{8}$/.test(angka) && !t.includes("/")) return `${angka.slice(0, 2)}/${angka.slice(2, 4)}/${angka.slice(4)}`;
  return t.trim();
}

const kelasDasar = "w-full rounded-lg border bg-white px-3 text-[15px] outline-none focus:border-hijau-700 focus:ring-2 focus:ring-hijau-700/15";

export function FormSk({ jenisId, isian, pegawai }: Props) {
  const [nilai, setNilai] = useState<Record<string, string>>(() => Object.fromEntries(isian.map((f) => [f.kunci, f.bawaan ?? ""])));
  const [galat, setGalat] = useState<Record<string, string>>({});
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null);
  const [cari, setCari] = useState("");
  const [bekerja, setBekerja] = useState(false);
  const atas = useRef<HTMLDivElement>(null);

  const kelompok = [...new Set(isian.map((f) => f.kelompok))];
  const adaDariData = isian.some((f) => f.dariData);

  function ubah(kunci: string, v: string) {
    setNilai((s) => ({ ...s, [kunci]: v }));
    if (galat[kunci]) setGalat((g) => ({ ...g, [kunci]: "" }));
  }

  async function pilihPegawai(teks: string) {
    setCari(teks);
    const p = pegawai.find((x) => x.label === teks);
    if (!p) return;
    setBekerja(true);
    try {
      const data = await ambilIsianPegawai(jenisId, p.id);
      setNilai((s) => ({ ...s, ...data }));
      setPesan({ ok: true, teks: `Data ${p.label.split(" · ")[0]} diisikan. Lengkapi isian yang masih kosong.` });
    } catch {
      setPesan({ ok: false, teks: "Data pegawai gagal diambil. Coba lagi." });
    } finally {
      setBekerja(false);
    }
  }

  async function unduh(e: React.FormEvent) {
    e.preventDefault();
    setPesan(null);
    setBekerja(true);
    try {
      const fd = new FormData();
      fd.set("jenis", jenisId);
      for (const [k, v] of Object.entries(nilai)) fd.set(k, v);
      const r = await fetch("/sk/unduh", { method: "POST", body: fd });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { pesan?: string; galat?: Record<string, string> } | null;
        setGalat(j?.galat ?? {});
        setPesan({ ok: false, teks: j?.pesan ?? "Konsep SK gagal dibuat. Coba lagi." });
        atas.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const nama = /filename="([^"]+)"/.exec(r.headers.get("content-disposition") ?? "")?.[1] ?? "Konsep SK.docx";
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = nama;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPesan({ ok: true, teks: `Konsep SK diunduh (${nama}). Periksa isinya di Word.` });
    } catch {
      setPesan({ ok: false, teks: "Koneksi terputus. Coba lagi." });
    } finally {
      setBekerja(false);
    }
  }

  return (
    <form onSubmit={unduh} className="grid gap-6" noValidate>
      <div ref={atas} className="scroll-mt-20" />
      {pesan && (
        <div role="status" className={clsx("flex items-start gap-2 rounded-xl px-4 py-3 text-[15px] font-medium", pesan.ok ? "bg-aman-bg/40 text-aman-fg" : "bg-kritis-bg/40 text-kritis-fg")}>
          {pesan.ok ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <XCircle size={18} className="mt-0.5 shrink-0" />} {pesan.teks}
        </div>
      )}

      {adaDariData && (
        <Kartu>
          <JudulKartu>Ambil dari Data TB</JudulKartu>
          <input
            list="daftar-pegawai"
            value={cari}
            onChange={(e) => void pilihPegawai(e.target.value)}
            placeholder="Ketik nama atau NIP, lalu pilih"
            aria-label="Pilih pegawai dari Data TB"
            className={clsx(kelasDasar, "h-11 max-w-xl border-krem-300")}
          />
          <datalist id="daftar-pegawai">
            {pegawai.map((p) => <option key={p.id} value={p.label} />)}
          </datalist>
        </Kartu>
      )}

      {kelompok.map((k) => (
        <Kartu key={k}>
          <JudulKartu>{k}</JudulKartu>
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {isian.filter((f) => f.kelompok === k).map((f) => {
              const id = `sk-${f.kunci}`;
              const kelas = clsx(kelasDasar, galat[f.kunci] ? "border-kritis-fg" : "border-krem-300");
              const v = nilai[f.kunci] ?? "";
              return (
                <div key={f.kunci} className={f.tipe === "teksPanjang" || f.kunci === "nama" ? "sm:col-span-2" : ""}>
                  <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
                    {f.label} {f.wajib && <span className="text-kritis-fg">*</span>}
                  </label>
                  {f.tipe === "pilihan" ? (
                    <select id={id} value={v} onChange={(e) => ubah(f.kunci, e.target.value)} className={clsx(kelas, "h-11")}>
                      {!f.bawaan && <option value="">(pilih)</option>}
                      {v && !f.pilihan?.includes(v) && <option>{v}</option>}
                      {f.pilihan?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  ) : f.tipe === "teksPanjang" ? (
                    <textarea id={id} value={v} rows={3} placeholder={f.contoh} onChange={(e) => ubah(f.kunci, e.target.value)} className={clsx(kelas, "py-2")} />
                  ) : (
                    <input
                      id={id}
                      value={v}
                      inputMode={f.tipe === "tanggal" ? "numeric" : undefined}
                      placeholder={f.tipe === "tanggal" ? "dd/mm/yyyy" : f.contoh}
                      onChange={(e) => ubah(f.kunci, e.target.value)}
                      onBlur={f.tipe === "tanggal" ? () => ubah(f.kunci, rapikanTanggal(v)) : undefined}
                      className={clsx(kelas, "h-11", f.kunci.toLowerCase().includes("nip") || f.kunci === "nip" ? "font-mono" : "")}
                    />
                  )}
                  {galat[f.kunci] && <p className="mt-1 text-sm text-kritis-fg">{galat[f.kunci]}</p>}
                </div>
              );
            })}
          </div>
        </Kartu>
      ))}

      <Kartu className="sticky bottom-4 z-10 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">Isian yang kosong ditulis ……</p>
          <div className="flex w-full gap-3 sm:w-auto">
            <Link href="/sk" className="inline-flex h-11 items-center rounded-lg border border-krem-300 bg-white px-5 text-[13px] font-semibold tracking-[0.08em] text-hijau-900 uppercase">
              Batal
            </Link>
            <Tombol type="submit" varian="utama" disabled={bekerja} className="flex-1 sm:flex-none">
              <Download size={16} /> {bekerja ? "Menyiapkan…" : "Unduh konsep SK"}
            </Tombol>
          </div>
        </div>
      </Kartu>
    </form>
  );
}

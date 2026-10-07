import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, ExternalLink, Pencil } from "lucide-react";
import { JudulKartu, Kartu, KotakInfo, LencanaLevel, MemuatData, TombolTautan } from "@/components/ui";
import { hitungSemua } from "@/lib/aturan/mesin";
import { wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { ISIAN, KELOMPOK_FORM } from "@/lib/data/formulir";
import { muatSemuaDihitung } from "@/lib/data/pegawai";
import { dbKeNilai, keInputAturan } from "@/lib/data/peta";
import { pengaturanAturan } from "@/lib/pengaturan/baca";
import { formatTanggal, formatWaktu } from "@/lib/tanggal";
import { TombolHapus, TombolPulihkan } from "./tombol-aksi";

export default function HalamanDetail({ params, searchParams }: PageProps<"/data-tb/[id]">) {
  return (
    <Suspense fallback={<MemuatData baris={8} />}>
      <IsiDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

type Param = Promise<Record<string, string | string[] | undefined>>;

async function IsiDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Param }) {
  await wajibLogin();
  const id = Number((await params).id);
  const disimpan = (await searchParams).disimpan === "1";
  const pegawai = Number.isInteger(id) ? await prisma.pegawaiTB.findUnique({ where: { id } }) : null;
  if (!pegawai) notFound();

  // Hasil hitung: dari seluruh data (supaya Peringkat dan NIP kembar benar).
  // Untuk data terhapus dihitung sendiri tanpa peringkat.
  const { baris, tanggalAcuan } = await muatSemuaDihitung();
  let hasil = baris.find((b) => b.pegawai.id === id)?.hasil;
  if (!hasil) {
    const pengaturan = await pengaturanAturan();
    hasil = hitungSemua([keInputAturan(pegawai)], pengaturan, tanggalAcuan)[0];
  }
  const jumlahBerperingkat = baris.filter((b) => b.hasil.peringkat !== null).length;
  const terhapus = pegawai.dihapusPada !== null;
  const nilai = dbKeNilai(pegawai);

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/data-tb" className="inline-flex items-center gap-1 text-sm font-medium text-hijau-700 hover:underline">
          <ChevronLeft size={16} /> Data TB
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-hijau-900 sm:text-[28px]">{pegawai.nama}</h1>
            <p className="mt-1 text-[15px] text-gray-600">
              NIP <span className="font-mono">{pegawai.nip}</span> · {pegawai.statusAkhir}
              {pegawai.fakultas && ` · ${pegawai.fakultas}`}
              {pegawai.jenisPelaksanaan && ` · ${pegawai.jenisPelaksanaan} TriDharma`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {terhapus ? (
              <TombolPulihkan id={pegawai.id} />
            ) : (
              <>
                <TombolTautan href={`/data-tb/${pegawai.id}/ubah`} varian="utama">
                  <Pencil size={15} /> Ubah data
                </TombolTautan>
                <TombolHapus id={pegawai.id} nama={pegawai.nama} />
              </>
            )}
          </div>
        </div>
      </div>

      {disimpan && !terhapus && (
        <div className="flex items-center gap-2 rounded-xl border border-aman-bg bg-aman-bg/30 px-4 py-3 text-aman-fg">
          <CheckCircle2 size={18} /> Data tersimpan. Hambatan di bawah sudah dihitung ulang.
        </div>
      )}
      {terhapus && (
        <KotakInfo nada="peringatan">
          Data ini dihapus {formatWaktu(pegawai.dihapusPada!)} oleh {pegawai.dihapusOleh}. Data tidak ikut dihitung di
          Ringkasan dan Daftar Perhatian sampai dipulihkan.
        </KotakInfo>
      )}

      <Kartu>
        <JudulKartu keterangan={`Dihitung per tanggal acuan ${formatTanggal(tanggalAcuan)}.`}>Hambatan dan saran tindakan</JudulKartu>
        {hasil.level === null ? (
          <p className="text-[15px] text-gray-600">
            Status akhir &quot;{pegawai.statusAkhir}&quot; termasuk arsip. Hambatan hanya dihitung untuk orang yang Sedang TB.
          </p>
        ) : (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <LencanaLevel level={hasil.level} />
              <span className="text-[15px] text-gray-700">
                Skor <b>{hasil.skor}</b>
                {hasil.peringkat !== null && (
                  <> · Peringkat <b>{hasil.peringkat}</b> dari {jumlahBerperingkat} orang berhambatan</>
                )}
              </span>
            </div>
            <div className="rounded-xl bg-krem-50 p-4">
              <div className="text-sm font-semibold text-gray-500">Hambatan utama (kode {hasil.kode})</div>
              <div className="mt-1 text-lg font-semibold text-hijau-900">{hasil.hambatan}</div>
              {hasil.kode > 0 && (
                <>
                  <div className="mt-3 text-sm font-semibold text-gray-500">Saran tindakan</div>
                  <div className="mt-1 text-[15px] text-gray-800">{hasil.saran}</div>
                </>
              )}
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
              <Isi label="Tahap">{hasil.tahap}</Isi>
              <Isi label="Pihak penahan">{hasil.pihakPenahan}</Isi>
              <Isi label="SK sudah terbit?">{hasil.skTerbit === "?" ? "Belum diketahui" : hasil.skTerbit}</Isi>
              <Isi label="Akhir efektif">{formatTanggal(hasil.akhirEfektif)}</Isi>
              <Isi label="Sisa hari">
                {hasil.sisaHari === null ? null : (
                  <span className={hasil.sisaHari < 0 ? "font-semibold text-kritis-fg" : ""}>
                    {hasil.sisaHari < 0 ? `lewat ${-hasil.sisaHari} hari` : `${hasil.sisaHari} hari`}
                  </span>
                )}
              </Isi>
              <Isi label="Hari kuliah tanpa SK">{hasil.hariKuliahTanpaSk}</Isi>
              <Isi label="Hari tertahan">{hasil.hariTertahan}</Isi>
            </dl>
          </div>
        )}
        {(hasil.cekData || hasil.peringatan.length > 0) && (
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-waspada-bg bg-waspada-bg/30 px-4 py-3 text-waspada-fg">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">Cek data</div>
              <ul className="list-disc pl-4 text-[15px]">
                {hasil.cekData?.split(/(?<=\.)\s+/).map((c) => <li key={c}>{c}</li>)}
                {hasil.peringatan.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          </div>
        )}
      </Kartu>

      <div className="grid gap-6 lg:grid-cols-2">
        {KELOMPOK_FORM.map((k) => (
          <Kartu key={k.judul}>
            <JudulKartu>{k.judul}</JudulKartu>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {k.kolom.map((kolom) => {
                const v = nilai[kolom];
                const def = ISIAN[kolom];
                let isi: ReactNode = v === null ? null : def.isian.jenis === "tanggal" ? formatTanggal(String(v)) : String(v);
                if (kolom === "linkSk" && typeof v === "string") isi = <TautanSk teks={v} />;
                return (
                  <Isi key={kolom} label={def.label} lebar={def.isian.jenis === "panjang" || kolom === "linkSk"}>
                    {isi}
                  </Isi>
                );
              })}
            </dl>
          </Kartu>
        ))}
      </div>

      <Kartu>
        <JudulKartu keterangan={`Ditambahkan ${formatWaktu(pegawai.dibuatPada)}${pegawai.dibuatOleh ? ` oleh ${pegawai.dibuatOleh}` : ""} · terakhir diubah ${formatWaktu(pegawai.diubahPada)}${pegawai.diubahOleh ? ` oleh ${pegawai.diubahOleh}` : ""}.`}>
          Riwayat perubahan
        </JudulKartu>
        <Suspense fallback={<MemuatData baris={3} />}>
          <Riwayat id={pegawai.id} />
        </Suspense>
      </Kartu>
    </div>
  );
}

function Isi({ label, children, lebar }: { label: string; children: ReactNode; lebar?: boolean }) {
  const kosong = children === null || children === undefined || children === "";
  return (
    <div className={lebar ? "sm:col-span-2" : ""}>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-[15px] break-words text-gray-900">{kosong ? <span className="text-gray-400">–</span> : children}</dd>
    </div>
  );
}

/** Teks Link SK bisa berisi keterangan + alamat, mis. "SK TB: https://...". Alamatnya dijadikan tautan. */
function TautanSk({ teks }: { teks: string }) {
  const bagian = teks.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {bagian.map((b, i) =>
        /^https?:\/\//.test(b) ? (
          <a key={i} href={b} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-hijau-700 underline">
            Buka berkas <ExternalLink size={13} />
          </a>
        ) : (
          <span key={i}>{b}</span>
        ),
      )}
    </>
  );
}

const LABEL_AKSI: Record<string, string> = {
  TAMBAH: "Ditambahkan",
  UBAH: "Diubah",
  HAPUS: "Dihapus",
  PULIHKAN: "Dipulihkan",
  IMPOR: "Impor Excel",
};

async function Riwayat({ id }: { id: number }) {
  await wajibLogin();
  const log = await prisma.logPerubahan.findMany({
    where: { entitas: "PegawaiTB", entitasId: String(id) },
    orderBy: [{ waktu: "desc" }, { id: "desc" }],
    take: 200,
  });
  if (log.length === 0) return <p className="text-[15px] text-gray-500">Belum ada catatan perubahan.</p>;
  const tampil = (kolom: string | null, v: string | null) => {
    if (v === null || v === "") return <span className="text-gray-400 italic">kosong</span>;
    const def = kolom ? ISIAN[kolom as keyof typeof ISIAN] : undefined;
    return def?.isian.jenis === "tanggal" ? formatTanggal(v) : v;
  };
  return (
    <ol className="divide-y divide-krem-100">
      {log.map((l) => (
        <li key={l.id} className="grid gap-1 py-3 sm:grid-cols-[200px_1fr]">
          <div className="text-sm text-gray-500">
            {formatWaktu(l.waktu)}
            <div className="text-xs">{l.email}</div>
          </div>
          <div className="text-[15px]">
            <span className="mr-2 rounded bg-krem-100 px-2 py-0.5 text-xs font-semibold text-hijau-900">{LABEL_AKSI[l.aksi] ?? l.aksi}</span>
            {l.kolom ? (
              <>
                <b>{ISIAN[l.kolom as keyof typeof ISIAN]?.label ?? l.kolom}:</b>{" "}
                <span className="text-kritis-fg line-through">{tampil(l.kolom, l.nilaiLama)}</span> →{" "}
                <span className="text-aman-fg">{tampil(l.kolom, l.nilaiBaru)}</span>
              </>
            ) : (
              l.nilaiBaru && <span className="text-gray-700">{l.nilaiBaru}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

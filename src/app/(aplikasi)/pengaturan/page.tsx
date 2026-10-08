import { Suspense, type ReactNode } from "react";
import { JudulHalaman, JudulKartu, Kartu, MemuatData } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { KATEGORI_PILIHAN, type KategoriPilihan } from "@/lib/pengaturan/bawaan";
import { semuaPengaturan } from "@/lib/pengaturan/baca";
import { KOLOM_KATEGORI, STATUS_SK_SISTEM } from "@/lib/pengaturan/validasi";
import { dariDb } from "@/lib/tanggal";
import { hitungStatusSkKosong } from "@/lib/data/isi-status-sk";
import { FormParameter, FormRekapFakultas, FormRekapSk, IsiStatusSkKosong, KelolaLibur, KelolaPilihan, TabelAturan, TabelStatusSk } from "./bagian";

const BAGIAN = [
  ["parameter", "Parameter"],
  ["aturan", "Aturan hambatan"],
  ["status-sk", "Status SK"],
  ["pilihan", "Daftar pilihan"],
  ["libur", "Hari libur"],
  ["rekap", "Rekap manual"],
  ["perawatan", "Perawatan data"],
] as const;

export default function HalamanPengaturan() {
  return (
    <>
      <JudulHalaman
        judul="Pengaturan"
      />
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Bagian pengaturan">
        {BAGIAN.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="rounded-full border border-krem-300 bg-white px-4 py-2 text-sm font-medium text-hijau-900 hover:border-hijau-900">
            {label}
          </a>
        ))}
      </nav>
      <Suspense fallback={<MemuatData baris={12} />}>
        <IsiPengaturan />
      </Suspense>
    </>
  );
}

function Bagian({ id, judul, children }: { id: string; judul: string; children: ReactNode }) {
  return (
    <Kartu id={id} className="scroll-mt-20">
      <JudulKartu>{judul}</JudulKartu>
      {children}
    </Kartu>
  );
}

async function IsiPengaturan() {
  await wajibLogin("ADMIN");
  const kategori = Object.keys(KATEGORI_PILIHAN) as KategoriPilihan[];
  const [{ parameter, statusSk, aturan, pilihan, hariLibur }, rekapFakultas, rekapSk, pakaiStatusSk, ...pakaiPilihan] = await Promise.all([
    semuaPengaturan(),
    prisma.rekapResmiFakultas.findMany(),
    prisma.rekapPenerbitanSk.findMany({ orderBy: { urutan: "asc" } }),
    prisma.pegawaiTB.groupBy({ by: ["statusSk"], where: { dihapusPada: null }, _count: true }),
    ...kategori.map((k) =>
      prisma.pegawaiTB.groupBy({ by: [KOLOM_KATEGORI[k] as "fakultas"], _count: true }),
    ),
  ]);

  const dipakaiStatusSk = Object.fromEntries(pakaiStatusSk.filter((x) => x.statusSk).map((x) => [x.statusSk!, x._count]));
  const dipakaiPilihan = (k: KategoriPilihan, nilai: string) => {
    const grup = pakaiPilihan[kategori.indexOf(k)] as { _count: number; [kolom: string]: unknown }[];
    return grup
      .filter((g) => String(g[KOLOM_KATEGORI[k]] ?? "").toLowerCase() === nilai.toLowerCase())
      .reduce((t, g) => t + g._count, 0);
  };
  const jumlahSkKosong = await hitungStatusSkKosong();
  const urutanFak = pilihan.filter((p) => p.kategori === "FAKULTAS").map((p) => p.nilai);
  const tanggalRekap = parameter.find((p) => p.kunci === "tanggalRekapResmi")?.nilai ?? "";

  return (
    <div className="grid gap-6">

      <Bagian id="parameter" judul="Parameter">
        <FormParameter
          parameter={parameter
            .filter((p) => p.kunci !== "tanggalRekapResmi")
            .map(({ kunci, label, keterangan, tipe, nilai }) => ({ kunci, label, keterangan, tipe, nilai }))}
        />
      </Bagian>

      <Bagian
        id="aturan"
        judul="Aturan hambatan"
      >
        <TabelAturan aturan={aturan} />
      </Bagian>

      <Bagian id="status-sk" judul="Pemetaan Status SK">
        <TabelStatusSk
          baris={statusSk.map(({ statusSk: s, tahap, pihakPenahan, skTerbit }) => ({ statusSk: s, tahap, pihakPenahan, skTerbit }))}
          dipakai={dipakaiStatusSk}
          terkunci={[...STATUS_SK_SISTEM]}
        />
      </Bagian>

      <Bagian
        id="pilihan"
        judul="Daftar pilihan"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kategori.map((k) => (
            <KelolaPilihan
              key={k}
              kategori={k}
              judul={KATEGORI_PILIHAN[k]}
              isi={pilihan
                .filter((p) => p.kategori === k)
                .map((p) => ({ id: p.id, nilai: p.nilai, aktif: p.aktif, sistem: p.sistem, dipakai: dipakaiPilihan(k, p.nilai) }))}
            />
          ))}
        </div>
      </Bagian>

      <Bagian id="libur" judul="Hari libur nasional">
        <KelolaLibur libur={hariLibur.map((h) => ({ tanggal: dariDb(h.tanggal)!, keterangan: h.keterangan }))} />
      </Bagian>

      <div id="rekap" className="grid scroll-mt-20 gap-6 xl:grid-cols-2">
        <Bagian id="rekap-fakultas" judul="Rekap resmi TB dan TB Biaya Mandiri">
          <FormRekapFakultas
            tanggal={tanggalRekap}
            baris={[...rekapFakultas].sort((a, b) => urutanFak.indexOf(a.fakultas) - urutanFak.indexOf(b.fakultas))}
          />
        </Bagian>
        <Bagian id="rekap-sk" judul="Rekap penerbitan SK Tugas Belajar">
          <FormRekapSk baris={rekapSk} />
        </Bagian>
      </div>

      <Bagian id="perawatan" judul="Perawatan data: isi Status SK yang kosong">
        <IsiStatusSkKosong jumlah={jumlahSkKosong} pilihan={statusSk.map((s) => s.statusSk)} />
      </Bagian>
    </div>
  );
}

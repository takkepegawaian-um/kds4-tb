import { Suspense, type ReactNode } from "react";
import { JudulHalaman, JudulKartu, Kartu, KotakInfo, MemuatData } from "@/components/ui";
import { wajibLogin } from "@/lib/auth/sesi";
import { prisma } from "@/lib/db";
import { KATEGORI_PILIHAN, type KategoriPilihan } from "@/lib/pengaturan/bawaan";
import { semuaPengaturan } from "@/lib/pengaturan/baca";
import { KOLOM_KATEGORI, STATUS_SK_SISTEM } from "@/lib/pengaturan/validasi";
import { dariDb } from "@/lib/tanggal";
import { FormParameter, FormRekapFakultas, FormRekapSk, KelolaLibur, KelolaPilihan, TabelAturan, TabelStatusSk } from "./bagian";

export const metadata = { title: "Pengaturan" };

const BAGIAN = [
  ["parameter", "Parameter"],
  ["aturan", "Aturan hambatan"],
  ["status-sk", "Status SK"],
  ["pilihan", "Daftar pilihan"],
  ["libur", "Hari libur"],
  ["rekap", "Rekap manual"],
] as const;

export default function HalamanPengaturan() {
  return (
    <>
      <JudulHalaman
        judul="Pengaturan"
        keterangan="Angka dan daftar yang dipakai untuk menghitung hambatan. Setiap perubahan dicatat di Log Aktivitas dan langsung berlaku di semua halaman."
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

function Bagian({ id, judul, keterangan, children }: { id: string; judul: string; keterangan?: ReactNode; children: ReactNode }) {
  return (
    <Kartu id={id} className="scroll-mt-20">
      <JudulKartu keterangan={keterangan}>{judul}</JudulKartu>
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
  const urutanFak = pilihan.filter((p) => p.kategori === "FAKULTAS").map((p) => p.nilai);
  const tanggalRekap = parameter.find((p) => p.kunci === "tanggalRekapResmi")?.nilai ?? "";

  return (
    <div className="grid gap-6">
      <KotakInfo>
        Nilai bawaan diambil dari sheet &quot;Pengaturan&quot; di DATA_TB.xlsx. Setelah disimpan, aplikasi menampilkan dampaknya pada jumlah orang
        Kritis, Waspada, Perhatian, dan Aman. Tombol <b>Kembalikan ke bawaan Excel</b> tersedia bila ingin mengulang.
      </KotakInfo>

      <Bagian id="parameter" judul="Parameter" keterangan="Ambang hari dan batas skor. Tanggal acuan diisi untuk simulasi (mis. tanggal rapat); kosongkan untuk memakai hari ini.">
        <FormParameter
          parameter={parameter
            .filter((p) => p.kunci !== "tanggalRekapResmi")
            .map(({ kunci, label, keterangan, tipe, nilai }) => ({ kunci, label, keterangan, tipe, nilai }))}
        />
      </Bagian>

      <Bagian
        id="aturan"
        judul="Aturan hambatan"
        keterangan="Skor dasar, nama, dan saran tindakan tiap kode. Syarat setiap kode mengikuti rumus Excel dan ada di program (teruji). Kode yang dinonaktifkan dilewati; orangnya jatuh ke kode berikutnya yang terpenuhi."
      >
        <TabelAturan aturan={aturan} />
      </Bagian>

      <Bagian id="status-sk" judul="Pemetaan Status SK" keterangan='Menentukan Tahap, Pihak penahan, dan "SK sudah terbit?" untuk setiap isian kolom Status SK. Urutan baris menentukan urutan di dropdown.'>
        <TabelStatusSk
          baris={statusSk.map(({ statusSk: s, tahap, pihakPenahan, skTerbit }) => ({ statusSk: s, tahap, pihakPenahan, skTerbit }))}
          dipakai={dipakaiStatusSk}
          terkunci={[...STATUS_SK_SISTEM]}
        />
      </Bagian>

      <Bagian
        id="pilihan"
        judul="Daftar pilihan"
        keterangan="Isi dropdown di form Data TB. Nilai yang masih dipakai data tidak bisa dihapus, hanya disembunyikan. Nilai bertanda gembok dipakai langsung oleh aturan hambatan."
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

      <Bagian id="libur" judul="Hari libur nasional" keterangan="Dipakai untuk menghitung hari kerja (hambatan kode 6: batas 14 hari kerja sebelum kuliah).">
        <KelolaLibur libur={hariLibur.map((h) => ({ tanggal: dariDb(h.tanggal)!, keterangan: h.keterangan }))} />
      </Bagian>

      <div id="rekap" className="grid scroll-mt-20 gap-6 xl:grid-cols-2">
        <Bagian id="rekap-fakultas" judul="Rekap resmi TB dan TB Biaya Mandiri" keterangan="Angka rekap resmi per fakultas, dibandingkan dengan jumlah Sedang TB di Ringkasan.">
          <FormRekapFakultas
            tanggal={tanggalRekap}
            baris={[...rekapFakultas].sort((a, b) => urutanFak.indexOf(a.fakultas) - urutanFak.indexOf(b.fakultas))}
          />
        </Bagian>
        <Bagian id="rekap-sk" judul="Rekap penerbitan SK Tugas Belajar" keterangan='Baris yang dijumlahkan ke "Total sudah/belum terbit" ditampilkan di Ringkasan.'>
          <FormRekapSk baris={rekapSk} />
        </Bagian>
      </div>
    </div>
  );
}

// Akses tabel pembakuan (Sumber biaya dan Tempat studi) di database.
import "server-only";
import { prisma } from "@/lib/db";
import { NILAI, sama } from "@/lib/aturan/mesin";
import { kunciTeks, rapikanTeks, susunPembakuan, type JenisPembakuan, type Pembakuan } from "@/lib/aturan/sebaran";

/** Pembakuan dalam bentuk yang dipakai pengelompokan Dashboard dan saringan daftar. */
export async function muatPembakuan(): Promise<Pembakuan> {
  return susunPembakuan(await prisma.pembakuanNilai.findMany());
}

export type BarisKelola = {
  asli: string;
  /** Jumlah orang Sedang TB yang memakai tulisan ini */
  jumlah: number;
  baku: string;
  negara: string;
};

/**
 * Bahan layar Pengaturan: tulisan yang dipakai orang berstatus Sedang TB (hanya merekalah yang
 * masuk diagram Sebaran) digabung dengan baris yang sudah tersimpan. Yang belum punya padanan
 * (baku kosong) ditaruh paling atas.
 */
export async function bacaPembakuanKelola(): Promise<Record<JenisPembakuan, BarisKelola[]>> {
  const [pegawai, tabel] = await Promise.all([
    prisma.pegawaiTB.findMany({ where: { dihapusPada: null }, select: { statusAkhir: true, sumberBiaya: true, tempatStudi: true } }),
    prisma.pembakuanNilai.findMany(),
  ]);

  const sedangTb = pegawai.filter((p) => sama(p.statusAkhir, NILAI.SEDANG_TB));
  const susun = (jenis: JenisPembakuan, tulisan: (string | null)[]): BarisKelola[] => {
    const per = new Map<string, BarisKelola>();
    for (const t of tulisan) {
      const asli = rapikanTeks(t ?? "");
      if (!asli) continue;
      const k = kunciTeks(asli);
      const ada = per.get(k);
      if (ada) ada.jumlah++;
      else per.set(k, { asli, jumlah: 1, baku: "", negara: "" });
    }
    for (const r of tabel.filter((x) => x.jenis === jenis)) {
      const k = kunciTeks(r.asli);
      const ada = per.get(k) ?? { asli: rapikanTeks(r.asli), jumlah: 0, baku: "", negara: "" };
      ada.baku = r.baku;
      ada.negara = r.negara ?? "";
      per.set(k, ada);
    }
    return [...per.values()].sort(
      (a, b) => Number(!!a.baku) - Number(!!b.baku) || b.jumlah - a.jumlah || a.asli.localeCompare(b.asli, "id"),
    );
  };

  return {
    BIAYA: susun("BIAYA", sedangTb.map((p) => p.sumberBiaya)),
    KAMPUS: susun("KAMPUS", sedangTb.map((p) => p.tempatStudi)),
  };
}

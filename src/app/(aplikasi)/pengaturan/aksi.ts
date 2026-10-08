"use server";

// Aksi server layar Pengaturan. Hanya admin. Setiap perubahan dicatat di Log perubahan,
// dan aksi yang memengaruhi hitungan melaporkan dampaknya (jumlah per level sebelum/sesudah).

import { revalidatePath } from "next/cache";
import { hitungSemua } from "@/lib/aturan/mesin";
import { LEVEL, susunPengaturan, type Level } from "@/lib/aturan/pengaturan";
import { prisma } from "@/lib/db";
import { keInputAturan } from "@/lib/data/peta";
import { pratinjauIsiStatusSk, terapkanIsiStatusSk, type PratinjauIsiStatusSk } from "@/lib/data/isi-status-sk";
import { bacaTanggal } from "@/lib/excel/data-tb";
import {
  ATURAN_HAMBATAN_BAWAAN,
  KATEGORI_PILIHAN,
  PARAMETER_BAWAAN,
  STATUS_SK_BAWAAN,
  type KategoriPilihan,
} from "@/lib/pengaturan/bawaan";
import {
  KOLOM_KATEGORI,
  periksaAturan,
  periksaNilaiPilihan,
  periksaParameter,
  periksaStatusSk,
  type BarisAturan,
  type BarisStatusSk,
  type Galat,
} from "@/lib/pengaturan/validasi";
import { emailPengguna } from "@/lib/sesi";
import { dariDb, hariIniJakarta, keDb } from "@/lib/tanggal";

export type Dampak = { sebelum: Record<Level, number>; sesudah: Record<Level, number> };
export type HasilPengaturan = { ok: boolean; pesan: string; galat?: Galat; dampak?: Dampak };

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type Log = { entitas: string; entitasId: string; aksi: string; kolom?: string | null; nilaiLama?: string | null; nilaiBaru?: string | null };

async function catat(tx: Tx, email: string, log: Log[]) {
  if (log.length) await tx.logPerubahan.createMany({ data: log.map((l) => ({ email, kolom: null, nilaiLama: null, nilaiBaru: null, ...l })) });
}

/** Jumlah orang Sedang TB per level dengan Pengaturan yang ada di database saat ini. */
async function hitungLevel(): Promise<Record<Level, number>> {
  const [pegawai, parameter, statusSk, aturan, libur] = await Promise.all([
    prisma.pegawaiTB.findMany({ where: { dihapusPada: null } }),
    prisma.parameter.findMany(),
    prisma.pemetaanStatusSk.findMany({ orderBy: { urutan: "asc" } }),
    prisma.aturanHambatan.findMany(),
    prisma.hariLibur.findMany(),
  ]);
  const p = susunPengaturan({ parameter, statusSk, aturan, hariLibur: libur.map((h) => dariDb(h.tanggal)!) });
  const acuan = parameter.find((x) => x.kunci === "tanggalAcuan")?.nilai || hariIniJakarta();
  const hasil = hitungSemua(pegawai.map(keInputAturan), p, acuan);
  return Object.fromEntries(LEVEL.map((l) => [l, hasil.filter((h) => h.level === l).length])) as Record<Level, number>;
}

async function denganDampak(kerja: () => Promise<HasilPengaturan>): Promise<HasilPengaturan> {
  const sebelum = await hitungLevel();
  const h = await kerja();
  if (!h.ok) return h;
  revalidatePath("/", "layout");
  return { ...h, dampak: { sebelum, sesudah: await hitungLevel() } };
}

const pesanGalat = "Periksa kembali isian yang ditandai merah.";

// ---------------------------------------------------------------------------
// Parameter
// ---------------------------------------------------------------------------

export async function simpanParameter(isian: Record<string, string>): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  return denganDampak(async () => {
    // Hanya parameter yang dikirim form yang diproses (tanggal rekap diubah di bagian Rekap).
    const lama = (await prisma.parameter.findMany()).filter((p) => p.kunci in isian);
    const { nilai, galat } = periksaParameter(isian, Object.fromEntries(lama.map((p) => [p.kunci, p.tipe])));
    if (Object.keys(galat).length) return { ok: false, pesan: pesanGalat, galat };
    const berubah = lama.filter((p) => p.nilai !== nilai[p.kunci]);
    if (!berubah.length) return { ok: true, pesan: "Tidak ada yang berubah." };
    await prisma.$transaction(async (tx) => {
      for (const p of berubah) await tx.parameter.update({ where: { kunci: p.kunci }, data: { nilai: nilai[p.kunci] } });
      await catat(tx, email, berubah.map((p) => ({ entitas: "Parameter", entitasId: p.kunci, aksi: "UBAH", kolom: p.label, nilaiLama: p.nilai, nilaiBaru: nilai[p.kunci] })));
    });
    return { ok: true, pesan: `${berubah.length} parameter disimpan.` };
  });
}

export async function kembalikanParameterBawaan(): Promise<HasilPengaturan> {
  const bawaan = Object.fromEntries(PARAMETER_BAWAAN.filter((p) => p.kunci !== "tanggalRekapResmi").map((p) => [p.kunci, p.nilai]));
  // Tanggal acuan simulasi juga dikosongkan (kembali ke "hari ini").
  return simpanParameter(bawaan);
}

// ---------------------------------------------------------------------------
// Aturan hambatan
// ---------------------------------------------------------------------------

export async function simpanAturan(baris: BarisAturan[]): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  return denganDampak(async () => {
    const lama = new Map((await prisma.aturanHambatan.findMany()).map((a) => [a.kode, a]));
    const { nilai, galat } = periksaAturan(baris.filter((b) => lama.has(b.kode)));
    if (Object.keys(galat).length) return { ok: false, pesan: pesanGalat, galat };
    const log: Log[] = [];
    await prisma.$transaction(async (tx) => {
      for (const a of nilai) {
        const l = lama.get(a.kode)!;
        const kolom = (["nama", "skorDasar", "saran", "aktif"] as const).filter((k) => l[k] !== a[k]);
        if (!kolom.length) continue;
        await tx.aturanHambatan.update({ where: { kode: a.kode }, data: a });
        for (const k of kolom) {
          log.push({
            entitas: "AturanHambatan",
            entitasId: String(a.kode),
            aksi: "UBAH",
            kolom: `Kode ${a.kode}: ${{ nama: "Nama hambatan", skorDasar: "Skor dasar", saran: "Saran tindakan", aktif: "Aktif" }[k]}`,
            nilaiLama: String(l[k]),
            nilaiBaru: String(a[k]),
          });
        }
      }
      await catat(tx, email, log);
    });
    return { ok: true, pesan: log.length ? `${log.length} isian aturan disimpan.` : "Tidak ada yang berubah." };
  });
}

export async function kembalikanAturanBawaan(): Promise<HasilPengaturan> {
  return simpanAturan(ATURAN_HAMBATAN_BAWAAN.map((a) => ({ ...a, aktif: true })));
}

// ---------------------------------------------------------------------------
// Pemetaan Status SK
// ---------------------------------------------------------------------------

export async function simpanStatusSk(baris: BarisStatusSk[]): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  return denganDampak(async () => {
    const { nilai, galat } = periksaStatusSk(baris);
    if (Object.keys(galat).length) return { ok: false, pesan: galat.umum ?? pesanGalat, galat };
    const lama = await prisma.pemetaanStatusSk.findMany();
    const perNama = new Map(lama.map((s) => [s.statusSk, s]));
    const dibuang = lama.filter((s) => !nilai.some((n) => n.statusSk === s.statusSk));
    for (const s of dibuang) {
      const dipakai = await prisma.pegawaiTB.count({ where: { statusSk: s.statusSk, dihapusPada: null } });
      if (dipakai) return { ok: false, pesan: `Status SK "${s.statusSk}" masih dipakai ${dipakai} orang di Data TB, jadi tidak bisa dihapus.` };
    }
    const log: Log[] = [];
    await prisma.$transaction(async (tx) => {
      for (const s of dibuang) {
        await tx.pemetaanStatusSk.delete({ where: { statusSk: s.statusSk } });
        log.push({ entitas: "PemetaanStatusSk", entitasId: s.statusSk, aksi: "HAPUS", nilaiLama: `${s.tahap} / ${s.pihakPenahan} / SK ${s.skTerbit}` });
      }
      for (const [i, n] of nilai.entries()) {
        const l = perNama.get(n.statusSk);
        if (!l) {
          await tx.pemetaanStatusSk.create({ data: { ...n, urutan: i + 1 } });
          log.push({ entitas: "PemetaanStatusSk", entitasId: n.statusSk, aksi: "TAMBAH", nilaiBaru: `${n.tahap} / ${n.pihakPenahan} / SK ${n.skTerbit}` });
          continue;
        }
        const kolom = (["tahap", "pihakPenahan", "skTerbit"] as const).filter((k) => l[k] !== n[k]);
        if (kolom.length || l.urutan !== i + 1) await tx.pemetaanStatusSk.update({ where: { statusSk: n.statusSk }, data: { ...n, urutan: i + 1 } });
        for (const k of kolom) {
          log.push({
            entitas: "PemetaanStatusSk",
            entitasId: n.statusSk,
            aksi: "UBAH",
            kolom: `${n.statusSk}: ${{ tahap: "Tahap", pihakPenahan: "Pihak penahan", skTerbit: "SK sudah terbit?" }[k]}`,
            nilaiLama: l[k],
            nilaiBaru: n[k],
          });
        }
      }
      await catat(tx, email, log);
    });
    return { ok: true, pesan: log.length ? `${log.length} perubahan Status SK disimpan.` : "Tidak ada yang berubah." };
  });
}

export async function kembalikanStatusSkBawaan(): Promise<HasilPengaturan> {
  // Status SK tambahan yang masih dipakai dipertahankan (akan ditolak bila dihapus).
  const lama = await prisma.pemetaanStatusSk.findMany({ orderBy: { urutan: "asc" } });
  const tambahan = lama.filter((s) => !STATUS_SK_BAWAAN.some((b) => b.statusSk === s.statusSk));
  return simpanStatusSk([...STATUS_SK_BAWAAN, ...tambahan]);
}

// ---------------------------------------------------------------------------
// Daftar pilihan
// ---------------------------------------------------------------------------

const kategoriSah = (k: string): k is KategoriPilihan => k in KATEGORI_PILIHAN;

export async function tambahPilihan(kategori: string, nilaiBaru: string): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  if (!kategoriSah(kategori)) return { ok: false, pesan: "Kategori tidak dikenal." };
  const ada = await prisma.pilihanNilai.findMany({ where: { kategori }, orderBy: { urutan: "asc" } });
  const g = periksaNilaiPilihan(nilaiBaru, ada.map((a) => a.nilai));
  if (g) return { ok: false, pesan: g };
  const v = nilaiBaru.trim();
  await prisma.$transaction(async (tx) => {
    const p = await tx.pilihanNilai.create({ data: { kategori, nilai: v, urutan: (ada.at(-1)?.urutan ?? 0) + 1 } });
    await catat(tx, email, [{ entitas: "PilihanNilai", entitasId: String(p.id), aksi: "TAMBAH", kolom: KATEGORI_PILIHAN[kategori], nilaiBaru: v }]);
  });
  revalidatePath("/", "layout");
  return { ok: true, pesan: `"${v}" ditambahkan ke ${KATEGORI_PILIHAN[kategori]}.` };
}

export async function ubahPilihan(id: number, ubah: { aktif?: boolean; geser?: -1 | 1 }): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  const p = await prisma.pilihanNilai.findUnique({ where: { id } });
  if (!p) return { ok: false, pesan: "Pilihan tidak ditemukan." };
  if (ubah.aktif === false && p.sistem) return { ok: false, pesan: `"${p.nilai}" dipakai aturan hambatan, jadi tidak bisa disembunyikan.` };
  await prisma.$transaction(async (tx) => {
    if (ubah.aktif !== undefined && ubah.aktif !== p.aktif) {
      await tx.pilihanNilai.update({ where: { id }, data: { aktif: ubah.aktif } });
      await catat(tx, email, [{ entitas: "PilihanNilai", entitasId: String(id), aksi: "UBAH", kolom: `${KATEGORI_PILIHAN[p.kategori as KategoriPilihan]}: ${p.nilai} ditampilkan`, nilaiLama: String(p.aktif), nilaiBaru: String(ubah.aktif) }]);
    }
    if (ubah.geser) {
      const semua = await tx.pilihanNilai.findMany({ where: { kategori: p.kategori }, orderBy: { urutan: "asc" } });
      const i = semua.findIndex((x) => x.id === id);
      const j = i + ubah.geser;
      if (j >= 0 && j < semua.length) {
        [semua[i], semua[j]] = [semua[j], semua[i]];
        for (const [k, x] of semua.entries()) if (x.urutan !== k + 1) await tx.pilihanNilai.update({ where: { id: x.id }, data: { urutan: k + 1 } });
      }
    }
  });
  revalidatePath("/", "layout");
  return { ok: true, pesan: "Disimpan." };
}

export async function hapusPilihan(id: number): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  const p = await prisma.pilihanNilai.findUnique({ where: { id } });
  if (!p) return { ok: false, pesan: "Pilihan tidak ditemukan." };
  if (p.sistem) return { ok: false, pesan: `"${p.nilai}" dipakai aturan hambatan, jadi tidak bisa dihapus.` };
  const kolom = KOLOM_KATEGORI[p.kategori as KategoriPilihan];
  const dipakai = await prisma.pegawaiTB.count({ where: { [kolom]: { equals: p.nilai, mode: "insensitive" } } });
  if (dipakai) {
    return { ok: false, pesan: `"${p.nilai}" masih dipakai ${dipakai} orang (termasuk data terhapus). Sembunyikan saja dari dropdown.` };
  }
  await prisma.$transaction(async (tx) => {
    await tx.pilihanNilai.delete({ where: { id } });
    await catat(tx, email, [{ entitas: "PilihanNilai", entitasId: String(id), aksi: "HAPUS", kolom: KATEGORI_PILIHAN[p.kategori as KategoriPilihan], nilaiLama: p.nilai }]);
  });
  revalidatePath("/", "layout");
  return { ok: true, pesan: `"${p.nilai}" dihapus.` };
}

// ---------------------------------------------------------------------------
// Hari libur
// ---------------------------------------------------------------------------

export async function tambahLibur(tanggal: string, keterangan: string): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  const t = bacaTanggal(tanggal.trim());
  if (!t) return { ok: false, pesan: "Tulis tanggal dengan format dd/mm/yyyy.", galat: { tanggal: "Format dd/mm/yyyy" } };
  if (await prisma.hariLibur.findUnique({ where: { tanggal: keDb(t)! } })) return { ok: false, pesan: "Tanggal ini sudah ada di daftar." };
  return denganDampak(async () => {
    const ket = keterangan.trim().slice(0, 200) || null;
    await prisma.$transaction(async (tx) => {
      await tx.hariLibur.create({ data: { tanggal: keDb(t)!, keterangan: ket } });
      await catat(tx, email, [{ entitas: "HariLibur", entitasId: t, aksi: "TAMBAH", nilaiBaru: ket ?? t }]);
    });
    return { ok: true, pesan: "Hari libur ditambahkan." };
  });
}

export async function hapusLibur(tanggal: string): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  const t = bacaTanggal(tanggal);
  const ada = t ? await prisma.hariLibur.findUnique({ where: { tanggal: keDb(t)! } }) : null;
  if (!t || !ada) return { ok: false, pesan: "Tanggal tidak ditemukan." };
  return denganDampak(async () => {
    await prisma.$transaction(async (tx) => {
      await tx.hariLibur.delete({ where: { tanggal: keDb(t)! } });
      await catat(tx, email, [{ entitas: "HariLibur", entitasId: t, aksi: "HAPUS", nilaiLama: ada.keterangan ?? t }]);
    });
    return { ok: true, pesan: "Hari libur dihapus." };
  });
}

// ---------------------------------------------------------------------------
// Rekap manual
// ---------------------------------------------------------------------------

export async function simpanRekapFakultas(
  tanggalRekap: string,
  baris: { fakultas: string; tugasBelajar: number | string; biayaMandiri: number | string }[],
): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  const galat: Galat = {};
  const t = bacaTanggal(tanggalRekap.trim());
  if (!t) galat.tanggalRekap = "Format dd/mm/yyyy";
  const bersih = baris.map((b) => {
    const tb = Number(b.tugasBelajar);
    const bm = Number(b.biayaMandiri);
    if (!Number.isInteger(tb) || tb < 0) galat[`${b.fakultas}.tugasBelajar`] = "Bilangan bulat ≥ 0";
    if (!Number.isInteger(bm) || bm < 0) galat[`${b.fakultas}.biayaMandiri`] = "Bilangan bulat ≥ 0";
    return { fakultas: b.fakultas.trim(), tugasBelajar: tb, biayaMandiri: bm };
  });
  if (Object.keys(galat).length) return { ok: false, pesan: pesanGalat, galat };

  const [lama, paramLama] = await Promise.all([
    prisma.rekapResmiFakultas.findMany(),
    prisma.parameter.findUnique({ where: { kunci: "tanggalRekapResmi" } }),
  ]);
  const perFak = new Map(lama.map((r) => [r.fakultas, r]));
  const log: Log[] = [];
  await prisma.$transaction(async (tx) => {
    for (const b of bersih) {
      const l = perFak.get(b.fakultas);
      if (l && l.tugasBelajar === b.tugasBelajar && l.biayaMandiri === b.biayaMandiri) continue;
      await tx.rekapResmiFakultas.upsert({ where: { fakultas: b.fakultas }, update: b, create: b });
      if (l?.tugasBelajar !== b.tugasBelajar) log.push({ entitas: "RekapResmiFakultas", entitasId: b.fakultas, aksi: "UBAH", kolom: `${b.fakultas}: TB`, nilaiLama: l ? String(l.tugasBelajar) : null, nilaiBaru: String(b.tugasBelajar) });
      if (l?.biayaMandiri !== b.biayaMandiri) log.push({ entitas: "RekapResmiFakultas", entitasId: b.fakultas, aksi: "UBAH", kolom: `${b.fakultas}: TB Biaya Mandiri`, nilaiLama: l ? String(l.biayaMandiri) : null, nilaiBaru: String(b.biayaMandiri) });
    }
    if (paramLama?.nilai !== t) {
      await tx.parameter.update({ where: { kunci: "tanggalRekapResmi" }, data: { nilai: t! } });
      log.push({ entitas: "Parameter", entitasId: "tanggalRekapResmi", aksi: "UBAH", kolom: "Tanggal rekap resmi", nilaiLama: paramLama?.nilai ?? null, nilaiBaru: t });
    }
    await catat(tx, email, log);
  });
  revalidatePath("/", "layout");
  return { ok: true, pesan: log.length ? `${log.length} angka rekap disimpan.` : "Tidak ada yang berubah." };
}

export async function simpanRekapSk(
  baris: { id?: number; uraian: string; jumlah: number | string; kelompok: string | null }[],
): Promise<HasilPengaturan> {
  const email = await emailPengguna();
  const galat: Galat = {};
  const bersih = baris.map((b, i) => {
    const jumlah = Number(b.jumlah);
    const uraian = b.uraian.trim();
    if (!uraian) galat[`${i}.uraian`] = "Wajib diisi";
    if (!Number.isInteger(jumlah) || jumlah < 0) galat[`${i}.jumlah`] = "Bilangan bulat ≥ 0";
    const kelompok = b.kelompok === "SUDAH_TERBIT" || b.kelompok === "BELUM_TERBIT" ? b.kelompok : null;
    return { id: b.id, uraian: uraian.slice(0, 300), jumlah, kelompok, urutan: i + 1 };
  });
  if (Object.keys(galat).length) return { ok: false, pesan: pesanGalat, galat };

  const lama = await prisma.rekapPenerbitanSk.findMany();
  const perId = new Map(lama.map((r) => [r.id, r]));
  const log: Log[] = [];
  await prisma.$transaction(async (tx) => {
    for (const l of lama.filter((l) => !bersih.some((b) => b.id === l.id))) {
      await tx.rekapPenerbitanSk.delete({ where: { id: l.id } });
      log.push({ entitas: "RekapPenerbitanSk", entitasId: String(l.id), aksi: "HAPUS", nilaiLama: `${l.uraian}: ${l.jumlah}` });
    }
    for (const b of bersih) {
      const data = { uraian: b.uraian, jumlah: b.jumlah, kelompok: b.kelompok, urutan: b.urutan };
      const l = b.id ? perId.get(b.id) : undefined;
      if (!l) {
        const r = await tx.rekapPenerbitanSk.create({ data });
        log.push({ entitas: "RekapPenerbitanSk", entitasId: String(r.id), aksi: "TAMBAH", nilaiBaru: `${b.uraian}: ${b.jumlah}` });
        continue;
      }
      if (l.uraian === b.uraian && l.jumlah === b.jumlah && l.kelompok === b.kelompok && l.urutan === b.urutan) continue;
      await tx.rekapPenerbitanSk.update({ where: { id: l.id }, data });
      if (l.uraian !== b.uraian) log.push({ entitas: "RekapPenerbitanSk", entitasId: String(l.id), aksi: "UBAH", kolom: "Uraian", nilaiLama: l.uraian, nilaiBaru: b.uraian });
      if (l.jumlah !== b.jumlah) log.push({ entitas: "RekapPenerbitanSk", entitasId: String(l.id), aksi: "UBAH", kolom: `Jumlah: ${b.uraian}`, nilaiLama: String(l.jumlah), nilaiBaru: String(b.jumlah) });
      if (l.kelompok !== b.kelompok) log.push({ entitas: "RekapPenerbitanSk", entitasId: String(l.id), aksi: "UBAH", kolom: `Dijumlahkan ke: ${b.uraian}`, nilaiLama: l.kelompok, nilaiBaru: b.kelompok });
    }
    await catat(tx, email, log);
  });
  revalidatePath("/", "layout");
  return { ok: true, pesan: log.length ? `${log.length} perubahan rekap disimpan.` : "Tidak ada yang berubah." };
}

// ---------------------------------------------------------------------------
// Perawatan data: isi Status SK yang kosong
// ---------------------------------------------------------------------------

export type HasilPratinjauSk = { ok: true; data: PratinjauIsiStatusSk } | { ok: false; pesan: string };

export async function pratinjauStatusSkKosong(nilai: string): Promise<HasilPratinjauSk> {
  await emailPengguna();
  try {
    return { ok: true, data: await pratinjauIsiStatusSk(nilai) };
  } catch (e) {
    return { ok: false, pesan: e instanceof Error ? e.message : "Terjadi kesalahan yang tidak dikenal." };
  }
}

export async function terapkanStatusSkKosong(nilai: string): Promise<{ ok: boolean; pesan: string; jumlah?: number }> {
  // Di luar try: bila belum login, redirect ke halaman Masuk tidak boleh tertangkap catch.
  const email = await emailPengguna();
  try {
    const jumlah = await terapkanIsiStatusSk(nilai, email);
    revalidatePath("/", "layout");
    return { ok: true, jumlah, pesan: jumlah ? `${jumlah} orang diisi Status SK "${nilai}".` : "Tidak ada Status SK kosong yang perlu diisi." };
  } catch (e) {
    return { ok: false, pesan: e instanceof Error ? e.message : "Terjadi kesalahan yang tidak dikenal." };
  }
}

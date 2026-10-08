// Urutan bawaan daftar: sisa hari, tersedikit dulu (yang sudah lewat paling atas, tanpa tanggal paling bawah).
import { describe, expect, it } from "vitest";
import { hitungSemua, type InputPegawai } from "@/lib/aturan/mesin";
import { pengaturanBawaan } from "@/lib/aturan/pengaturan";
import { pilihBaris } from "@/lib/data/daftar";
import { pilihPerhatian, type BarisPerhatian } from "@/lib/data/perhatian";

const orang = (urutan: number, masaStudiSd: string | null, ubah: Partial<InputPegawai> = {}): InputPegawai => ({
  urutan, nama: `Orang ${urutan}`, nip: `19900101202012${1000 + urutan}`, statusAkhir: "Sedang TB", fakultas: "FT",
  jenisPelaksanaan: "Bebas", statusSk: "TB Aktif", presensi: null, tmtTb: "2024-09-01", masaStudiSd,
  perpanjanganSd: null, presensiTbSd: null, tanggalMasukTahap: null, ...ubah,
});

function baris(data: InputPegawai[]): BarisPerhatian[] {
  const hasil = hitungSemua(data, pengaturanBawaan(), "2026-10-07");
  return data.map((input, i) => ({ input, hasil: hasil[i], pegawai: { id: i + 1 } as BarisPerhatian["pegawai"] }));
}

describe("urutan bawaan = sisa hari tersedikit dulu", () => {
  const data = [
    orang(1, "2028-08-31"), //  +1060 hari
    orang(2, "2026-10-01"), //  -6 (sudah lewat)
    orang(3, null, { statusSk: null }), // tanpa tanggal
    orang(4, "2026-12-31"), //  +85
    orang(5, "2024-01-01"), //  paling lama lewat
  ];
  const urutanBaris = (hasil: { input: InputPegawai }[]) => hasil.map((b) => b.input.urutan);

  it("Data TB", () => {
    expect(urutanBaris(pilihBaris(baris(data), {}).hasil)).toEqual([5, 2, 4, 1, 3]);
  });

  it("Daftar Perhatian (hanya yang berhambatan)", () => {
    const { hasil } = pilihPerhatian(baris(data), {});
    expect(hasil.every((b) => b.hasil.skor > 0)).toBe(true);
    const sisa = hasil.map((b) => b.hasil.sisaHari ?? Infinity);
    expect(sisa).toEqual([...sisa].sort((a, b) => a - b));
  });

  it("pilihan urutan lain tetap bisa dipakai lewat alamat", () => {
    expect(urutanBaris(pilihBaris(baris(data), { urut: "urutan" }).hasil)).toEqual([1, 2, 3, 4, 5]);
    expect(pilihPerhatian(baris(data), { urut: "peringkat" }).urut).toBe("peringkat");
  });
});

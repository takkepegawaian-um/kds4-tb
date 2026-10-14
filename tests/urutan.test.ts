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

  it("arah urutan bisa dibalik, dan nilai kosong tetap di akhir", () => {
    const naik = urutanBaris(pilihBaris(baris(data), { urut: "sisa", arah: "naik" }).hasil);
    const turun = urutanBaris(pilihBaris(baris(data), { urut: "sisa", arah: "turun" }).hasil);
    expect(naik).toEqual([5, 2, 4, 1, 3]);
    expect(turun).toEqual([1, 4, 2, 5, 3]); // yang tanpa tanggal (3) tetap paling bawah
    expect(pilihBaris(baris(data), { urut: "sisa", arah: "turun" }).arah).toBe("turun");
  });

  it("arah alami: skor dan tertahan terbesar dulu, selain itu kecil/A dulu", () => {
    const b = baris(data);
    expect(pilihBaris(b, { urut: "skor" }).arah).toBe("turun");
    expect(pilihBaris(b, { urut: "tertahan" }).arah).toBe("turun");
    expect(pilihBaris(b, { urut: "nama" }).arah).toBe("naik");
    const skor = pilihBaris(b, { urut: "skor" }).hasil.map((x) => x.hasil.skor);
    expect(skor).toEqual([...skor].sort((x, y) => y - x));
    const skorNaik = pilihBaris(b, { urut: "skor", arah: "naik" }).hasil.map((x) => x.hasil.skor);
    expect(skorNaik).toEqual([...skorNaik].sort((x, y) => x - y));
  });

  it("urutan menurut hambatan, pihak penahan, dan nama", () => {
    const b = baris(data);
    const kode = pilihBaris(b, { urut: "hambatan" }).hasil.map((x) => x.hasil.kode);
    expect(kode).toEqual([...kode].sort((x, y) => x - y));
    const pihak = pilihBaris(b, { urut: "pihak" }).hasil.map((x) => x.hasil.pihakPenahan ?? "");
    expect(pihak).toEqual([...pihak].sort((x, y) => x.localeCompare(y, "id")));
    expect(urutanBaris(pilihBaris(b, { urut: "nama", arah: "turun" }).hasil)).toEqual([5, 4, 3, 2, 1]);
  });

  it("kunci atau arah yang tidak dikenal diabaikan", () => {
    const h = pilihBaris(baris(data), { urut: "sembarang", arah: "miring" });
    expect(h.urut).toBe("sisa");
    expect(h.arah).toBe("naik");
  });

  it("pilihan urutan lain tetap bisa dipakai lewat alamat", () => {
    expect(urutanBaris(pilihBaris(baris(data), { urut: "urutan" }).hasil)).toEqual([1, 2, 3, 4, 5]);
    expect(pilihPerhatian(baris(data), { urut: "peringkat" }).urut).toBe("peringkat");
  });
});

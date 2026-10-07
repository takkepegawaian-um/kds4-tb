// Menulis dan membaca Saringan di alamat halaman (URL), mis.
//   /data-tb?sedangTb=1&jenis=Bebas&level=Kritis|Waspada
// Dipakai supaya angka di Dashboard bisa diklik untuk membuka daftar orangnya,
// dan supaya filter Data TB bisa dibagikan / diekspor.

import { LEVEL, type Level } from "./pengaturan";
import type { Saringan } from "./saringan";

type Tipe = "bool" | "teks" | "angka" | "daftar" | "level";

const SKEMA: Record<keyof Saringan, Tipe> = {
  sedangTb: "bool",
  statusAkhir: "teks",
  jenis: "teks",
  fakultas: "teks",
  fakultasBukan: "daftar",
  level: "level",
  kode: "angka",
  tahap: "teks",
  pihak: "teks",
  pihakBukan: "daftar",
  berhambatan: "bool",
  sisaHariMin: "angka",
  sisaHariMax: "angka",
  presensi: "teks",
  presensiTbTerisi: "bool",
  statusSk: "teks",
  adaCekData: "bool",
  q: "teks",
  jenisTerisi: "bool",
  tidakAda: "bool",
};

const PEMISAH = "|";

export function saringanKeUrl(s: Saringan): URLSearchParams {
  const p = new URLSearchParams();
  for (const [kunci, tipe] of Object.entries(SKEMA) as [keyof Saringan, Tipe][]) {
    const v = s[kunci];
    if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
    if (tipe === "bool") p.set(kunci, v ? "1" : "0");
    else if (tipe === "daftar" || tipe === "level") p.set(kunci, (v as string[]).join(PEMISAH));
    else p.set(kunci, String(v));
  }
  return p;
}

type Parameter = Record<string, string | string[] | undefined>;

export function saringanDariUrl(params: Parameter): Saringan {
  const s: Record<string, unknown> = {};
  for (const [kunci, tipe] of Object.entries(SKEMA) as [keyof Saringan, Tipe][]) {
    const mentah = params[kunci];
    const v = Array.isArray(mentah) ? mentah[0] : mentah;
    if (v === undefined || v === "") continue;
    if (tipe === "bool") s[kunci] = v === "1";
    else if (tipe === "angka") {
      const n = Number(v);
      if (Number.isFinite(n)) s[kunci] = n;
    } else if (tipe === "daftar") s[kunci] = v.split(PEMISAH).filter(Boolean);
    else if (tipe === "level") {
      const l = v.split(PEMISAH).filter((x): x is Level => (LEVEL as readonly string[]).includes(x));
      if (l.length) s[kunci] = l;
    } else s[kunci] = v;
  }
  return s as Saringan;
}

/** Alamat daftar Data TB untuk saringan tertentu. */
export function tautanDaftar(s: Saringan, dasar = "/data-tb"): string {
  const q = saringanKeUrl(s).toString();
  return q ? `${dasar}?${q}` : dasar;
}

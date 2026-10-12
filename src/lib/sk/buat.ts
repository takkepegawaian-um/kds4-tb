// Membuat berkas Word (.docx) konsep SK: templat bertanda {isian} diisi dengan data.
// Format, kop surat, dan tata letak mengikuti berkas templat apa adanya.

import fs from "node:fs/promises";
import path from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { ISIAN_KOSONG } from "./format";
import type { JenisSk } from "./jenis";

export const FOLDER_TEMPLAT = path.join(process.cwd(), "src", "lib", "sk", "templat");

export const TIPE_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/** Daftar penanda {isian} yang ada di sebuah templat (untuk pemeriksaan dan tes). */
export function penandaTemplat(isi: Buffer): string[] {
  const zip = new PizZip(isi);
  const teks = zip
    .file(/^word\/(document|header\d*|footer\d*)\.xml$/)
    .map((f) => f.asText().replace(/<[^>]+>/g, ""))
    .join("\n");
  return [...new Set([...teks.matchAll(/\{([#/^]?[A-Za-z_]+)\}/g)].map((m) => m[1]))];
}

export async function bacaTemplat(jenis: JenisSk): Promise<Buffer> {
  return fs.readFile(path.join(FOLDER_TEMPLAT, jenis.templat));
}

/** Mengisi templat dengan isian. Penanda yang tidak ada isiannya ditulis titik-titik. */
export function isiTemplat(templat: Buffer, tag: Record<string, string>): Buffer {
  const doc = new Docxtemplater(new PizZip(templat), {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: () => ISIAN_KOSONG,
  });
  doc.render(tag);
  return doc.getZip().generate({ type: "nodebuffer", compression: "DEFLATE" });
}

export async function buatDokumen(jenis: JenisSk, tag: Record<string, string>): Promise<Buffer> {
  return isiTemplat(await bacaTemplat(jenis), tag);
}

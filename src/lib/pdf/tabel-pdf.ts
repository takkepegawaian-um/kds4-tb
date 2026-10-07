// Membuat PDF berisi tabel (A4 mendatar), mis. untuk Daftar Perhatian.
// Memakai font standar Helvetica sehingga tidak butuh berkas font tambahan.
import "server-only";
import pdfmake from "pdfmake";
import type { Content, TableCell, TDocumentDefinitions } from "pdfmake/interfaces";

const FONT_STANDAR = ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique"];
pdfmake.setFonts({
  Helvetica: { normal: "Helvetica", bold: "Helvetica-Bold", italics: "Helvetica-Oblique", bolditalics: "Helvetica-BoldOblique" },
});
// Keamanan: PDF tidak boleh mengambil berkas lokal atau alamat internet apa pun.
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((p: string) => FONT_STANDAR.includes(p));

export type KolomPdf<T> = {
  judul: string;
  /** Lebar: angka (poin) atau "*" untuk sisa ruang */
  lebar: number | "*" | "auto";
  ambil: (baris: T) => string | number | null;
  rata?: "left" | "right" | "center";
  /** Warna latar dan huruf sel berdasarkan nilainya (mis. Level) */
  warna?: (nilai: string) => { latar: string; huruf: string } | undefined;
};

export async function buatPdfTabel<T>(opsi: {
  judul: string;
  subjudul: string[];
  kolom: KolomPdf<T>[];
  baris: T[];
}): Promise<Buffer> {
  const header: TableCell[] = opsi.kolom.map((k) => ({
    text: k.judul,
    bold: true,
    color: "#ffffff",
    fillColor: "#183630",
    alignment: k.rata ?? "left",
  }));
  const isi: TableCell[][] = opsi.baris.map((b) =>
    opsi.kolom.map((k) => {
      const v = k.ambil(b);
      const teks = v === null || v === undefined ? "" : String(v);
      const w = k.warna?.(teks);
      return {
        text: teks,
        alignment: k.rata ?? "left",
        ...(w ? { fillColor: w.latar, color: w.huruf, bold: true } : {}),
      };
    }),
  );

  const doc: TDocumentDefinitions = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [20, 24, 20, 30],
    defaultStyle: { font: "Helvetica", fontSize: 7, lineHeight: 1.05 },
    info: { title: opsi.judul, creator: "KDS4 — Monitor TB" },
    content: [
      { text: opsi.judul, fontSize: 14, bold: true, color: "#183630" },
      ...opsi.subjudul.map((t): Content => ({ text: t, color: "#555555", margin: [0, 2, 0, 0] })),
      {
        margin: [0, 8, 0, 0],
        table: { headerRows: 1, dontBreakRows: true, widths: opsi.kolom.map((k) => k.lebar), body: [header, ...isi] },
        layout: {
          hLineWidth: () => 0.4,
          vLineWidth: () => 0.4,
          hLineColor: () => "#d3c6ad",
          vLineColor: () => "#d3c6ad",
          fillColor: (i: number) => (i > 0 && i % 2 === 0 ? "#faf8f4" : null),
          paddingTop: () => 2,
          paddingBottom: () => 2,
          paddingLeft: () => 3,
          paddingRight: () => 3,
        },
      },
    ],
    footer: (halaman: number, jumlah: number) => ({
      columns: [
        { text: "KDS4 — Monitor TB", color: "#888888" },
        { text: `Halaman ${halaman} dari ${jumlah}`, alignment: "right", color: "#888888" },
      ],
      margin: [24, 8, 24, 0],
      fontSize: 7,
    }),
  };
  return Buffer.from(await pdfmake.createPdf(doc).getBuffer());
}

export function responsPdf(isi: Buffer, namaBerkas: string): Response {
  return new Response(new Uint8Array(isi), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${namaBerkas}"`,
      "Cache-Control": "no-store",
    },
  });
}

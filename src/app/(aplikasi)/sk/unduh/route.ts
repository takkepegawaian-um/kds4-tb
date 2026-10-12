// Membuat konsep SK (.docx) dari isian formulir dan mengirimkannya sebagai unduhan.
// Isi SK tidak disimpan di database; hanya jenis SK yang dicatat di Log akses.
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { emailPengguna } from "@/lib/sesi";
import { TIPE_DOCX, buatDokumen } from "@/lib/sk/buat";
import { siapkanData } from "@/lib/sk/data";
import { cariJenisSk } from "@/lib/sk/jenis";
import { hariIniJakarta } from "@/lib/tanggal";

export const maxDuration = 30;

export async function POST(request: Request) {
  const email = await emailPengguna();
  const form = await request.formData();
  const jenis = cariJenisSk(String(form.get("jenis") ?? ""));
  if (!jenis) return Response.json({ pesan: "Jenis SK tidak dikenal." }, { status: 400 });

  const mentah = Object.fromEntries(jenis.isian.map((f) => [f.kunci, String(form.get(f.kunci) ?? "")]));
  const hasil = siapkanData(jenis, mentah, hariIniJakarta());
  if (!hasil.ok) return Response.json({ pesan: "Periksa isian yang ditandai merah.", galat: hasil.galat }, { status: 400 });

  const isi = await buatDokumen(jenis, hasil.tag);

  const h = await headers();
  await prisma.logAkses.create({
    data: {
      email,
      peristiwa: "SK_DIBUAT",
      keterangan: jenis.nama,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: h.get("user-agent"),
    },
  });

  // Nama berkas: jenis SK dan nama pegawai (huruf dan angka saja).
  const nama = (mentah.nama ?? "").normalize("NFD").replace(/[^A-Za-z0-9 ]+/g, "").trim().replace(/\s+/g, " ").slice(0, 40);
  const berkas = `Konsep SK ${jenis.nama.replace(/[^A-Za-z0-9 ]+/g, "")}${nama ? ` - ${nama}` : ""}.docx`;

  return new Response(new Uint8Array(isi), {
    headers: {
      "Content-Type": TIPE_DOCX,
      "Content-Disposition": `attachment; filename="${berkas}"`,
      "Cache-Control": "no-store",
    },
  });
}

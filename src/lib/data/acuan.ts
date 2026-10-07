// Tanggal acuan simulasi lewat alamat halaman: ?acuan=dd/mm/yyyy (atau yyyy-mm-dd).
// Bila kosong atau tidak terbaca, dipakai tanggal acuan dari Pengaturan / hari ini.
import { bacaTanggal } from "@/lib/excel/data-tb";

export function acuanDariUrl(p: Record<string, string | string[] | undefined>): string | undefined {
  const v = Array.isArray(p.acuan) ? p.acuan[0] : p.acuan;
  if (!v) return undefined;
  return bacaTanggal(v.trim()) ?? undefined;
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Tombol } from "@/components/ui";
import { hapusPegawai, pulihkanPegawai } from "../aksi";

export function TombolHapus({ id, nama }: { id: number; nama: string }) {
  const router = useRouter();
  const [proses, mulai] = useTransition();
  return (
    <Tombol
      varian="bahaya"
      disabled={proses}
      onClick={() => {
        const alasan = window.prompt(
          `Hapus data ${nama}?\n\nData tidak hilang permanen: masih bisa dipulihkan dari "Data terhapus".\nTulis alasan penghapusan (boleh dikosongkan):`,
        );
        if (alasan === null) return;
        mulai(async () => {
          const h = await hapusPegawai(id, alasan);
          if (!h.ok) return window.alert(h.pesan);
          router.push("/data-tb?terhapus=1");
          router.refresh();
        });
      }}
    >
      {proses ? "Menghapus…" : "Hapus"}
    </Tombol>
  );
}

export function TombolPulihkan({ id }: { id: number }) {
  const router = useRouter();
  const [proses, mulai] = useTransition();
  return (
    <Tombol
      varian="utama"
      disabled={proses}
      onClick={() =>
        mulai(async () => {
          const h = await pulihkanPegawai(id);
          if (!h.ok) return window.alert(h.pesan);
          router.refresh();
        })
      }
    >
      {proses ? "Memulihkan…" : "Pulihkan data ini"}
    </Tombol>
  );
}

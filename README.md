# KDS4 — Monitor Tugas Belajar

Aplikasi web untuk memantau pegawai Tugas Belajar (TB) Universitas Negeri Malang dan
hambatan administrasinya (SK belum terbit, masa TB habis tapi presensi masih bebas, dan
sebagainya). Pengganti berkas `DATA_TB.xlsx`; logika hitungnya diterjemahkan persis dari
rumus Excel tersebut dan **dibuktikan sama** dengan tes otomatis
(lihat [docs/LAPORAN-PENCOCOKAN.md](docs/LAPORAN-PENCOCOKAN.md)).

**Status:** semua fitur Prioritas 1 selesai (9 dari 9 tahap).

## Panduan

| Dokumen | Untuk siapa |
|---|---|
| [docs/PANDUAN-PENGGUNA.md](docs/PANDUAN-PENGGUNA.md) | Admin SDM yang memakai aplikasi sehari-hari |
| [docs/PANDUAN-PEMASANGAN.md](docs/PANDUAN-PEMASANGAN.md) | Memasang di internet (GitHub + Vercel + Neon), langkah demi langkah dari pembuatan akun |
| [docs/PANDUAN-PERAWATAN.md](docs/PANDUAN-PERAWATAN.md) | Cadangan, pemulihan, pembaruan, reset sandi, masalah umum |
| [docs/LAPORAN-PENCOCOKAN.md](docs/LAPORAN-PENCOCOKAN.md) | Bukti hasil aplikasi sama dengan Excel (kriteria penerimaan) |

## Fitur

- **Ringkasan (Dashboard):** kartu per level, grafik hambatan dan per fakultas, posisi per
  status/tahap, pihak penahan, masa TB berakhir, presensi, rekap manual. Filter fakultas,
  jenis, dan tanggal acuan simulasi. Setiap angka bisa diklik untuk membuka daftar orangnya.
- **Daftar Perhatian:** peringkat orang berhambatan + saran tindakan; ekspor Excel dan PDF.
- **Data TB:** cari, saring, urutkan, ekspor; form tambah/ubah dengan pemeriksaan isian;
  halaman detail dengan riwayat perubahan; hapus lunak + pulihkan.
- **Impor dari Excel:** pratinjau (baru/berubah/gagal/peringatan), pilih baris, simpan.
- **Login:** satu akun admin, sesi 8 jam, kunci setelah 5 kali gagal, ganti sandi.
- **Log Aktivitas:** riwayat perubahan dan log akses; tidak bisa diubah atau dihapus.
- **Pengaturan:** parameter, aturan hambatan, Status SK, daftar pilihan, hari libur, rekap.

---

## Menjalankan di komputer sendiri (uji coba)

Yang perlu terpasang: **Node.js 22 atau lebih baru** (<https://nodejs.org>).
PostgreSQL **tidak** perlu dipasang; untuk uji coba dipakai database lokal bawaan Prisma.
Buka terminal di folder proyek, lalu jalankan perintah berikut satu per satu.

1. Pasang paket (sekali saja, dan setelah memperbarui kode):

   ```bash
   npm install
   ```

2. Siapkan file pengaturan rahasia (sekali saja), lalu isi `SESI_RAHASIA` dan
   `ADMIN_SANDI_AWAL` di dalamnya (petunjuk ada di file itu):

   ```bash
   copy .env.example .env
   ```

3. Nyalakan database lokal (setiap kali komputer baru dinyalakan), lalu salin alamat TCP yang
   tampil ke `DATABASE_URL` di `.env` (hanya pertama kali):

   ```bash
   npm run db:lokal
   ```

4. Buat tabel dan isi Pengaturan bawaan (pertama kali, dan setelah ada pembaruan struktur):

   ```bash
   npm run db:terapkan
   ```

   ```bash
   npm run db:seed
   ```

5. Buat akun admin (sekali saja). Setelah masuk, ganti sandi lewat tombol *Kata sandi* di
   bawah sidebar, lalu hapus baris `ADMIN_SANDI_AWAL` dari `.env`.

   ```bash
   npm run admin -- buat
   ```

6. Jalankan aplikasi dan buka alamat yang tampil (mis. <http://localhost:3000>):

   ```bash
   npm run dev
   ```

7. Masukkan data: menu **Impor dari Excel** → pilih `DATA_TB.xlsx` → **Periksa berkas** →
   **Simpan**.

---

## Daftar perintah

| Perintah | Kegunaan |
|---|---|
| `npm run dev` | Menjalankan aplikasi untuk uji coba |
| `npm test` | Menjalankan semua tes |
| `npm run uji:excel` | Laporan pencocokan hasil aplikasi dengan DATA_TB.xlsx |
| `npm run uji:db` | Membandingkan data di database (setelah impor) dengan DATA_TB.xlsx |
| `npm run cadangan` | Mencadangkan seluruh database ke `backup/` |
| `npm run pulihkan -- <berkas>` | Memulihkan cadangan ke database yang masih kosong |
| `npm run admin -- buat` / `reset-sandi` / `buka-kunci` | Akun admin: buat, reset sandi, buka kunci |
| `npm run impor -- DATA_TB.xlsx` | Memeriksa berkas impor lewat terminal (`--simpan` untuk menyimpan) |
| `npm run db:lokal` | Menyalakan database uji coba lokal |
| `npm run db:terapkan` | Menerapkan struktur database terbaru |
| `npm run db:seed` | Mengisi Pengaturan bawaan (aman diulang; tidak menimpa perubahan) |
| `npm run db:studio` | Melihat isi tabel database di browser |
| `npm run build` | Memeriksa bahwa aplikasi siap dipasang di server |

Semua perintah bekerja pada database di `DATABASE_URL`. Untuk database produksi, lihat
[PANDUAN-PERAWATAN.md](docs/PANDUAN-PERAWATAN.md).

## Tes

```bash
npm test
```

- **Mesin aturan:** unit test setiap kode hambatan 1–12 termasuk kasus batas (tepat di hari
  ambang, akhir bulan, hari libur, urutan prioritas, pemecahan peringkat).
- **Pencocokan dengan Excel:** seluruh 491 baris × 13 kolom hasil, 247 sel Dashboard, dan
  274 baris Daftar Perhatian dibandingkan dengan nilai di `DATA_TB.xlsx`; selisih apa pun
  di luar daftar selisih disengaja membuat tes gagal (`npm run uji:excel` untuk laporannya).
- **Lainnya:** impor, pemeriksaan isian form, tautan Dashboard, cookie sesi, log, Pengaturan.

`DATA_TB.xlsx` hanya **dibaca**, tidak pernah diubah. Karena berisi data pribadi, berkas itu
tidak ikut diunggah ke GitHub; tes yang membutuhkannya otomatis dilewati bila berkas tidak ada.
Tes pencocokan memakai tanggal acuan yang tersimpan di Excel (`Pengaturan!C5`); bila Excel
dibuka dan disimpan di hari lain, isi `Pengaturan!C4` = `07/10/2026`.

## Aturan impor

- Orang dicocokkan berdasarkan **NIP**; bila satu NIP dipakai lebih dari satu orang,
  berdasarkan NIP + nama.
- Orang yang ada di aplikasi tetapi tidak ada di berkas **tidak** diubah atau dihapus.
- **Gagal** (tidak disimpan): nama/NIP/status akhir kosong, atau tanggal tidak terbaca.
- **Peringatan** (tetap disimpan): NIP kembar, NIP bukan 18 digit, nilai di luar daftar pilihan.
- Kolom hasil hitung (Akhir efektif s.d. Cek data) tidak diimpor; aplikasi menghitungnya.
- Setiap impor tercatat di Riwayat impor dan Log perubahan.

## Keamanan data

- Wajib login untuk semua halaman, aksi, dan ekspor. Pemeriksaan dua lapis: proxy menolak
  cookie palsu/kedaluwarsa (tanda tangan HMAC), lalu setiap halaman dan aksi memeriksa sesi di
  database (sesi yang sudah keluar/dicabut langsung tidak berlaku).
- Kata sandi disimpan sebagai hash **bcrypt** (biaya 12). Cookie sesi `httpOnly`,
  `SameSite=Lax`, `Secure` di produksi; database hanya menyimpan hash token.
- Pesan login salah sama untuk email tidak dikenal dan sandi salah; akun dikunci 15 menit
  setelah 5 kali gagal.
- **Log tidak bisa diubah atau dihapus**, bahkan langsung di database (trigger PostgreSQL di
  migrasi `log_tidak_bisa_diubah`). Bila log lama perlu dibersihkan sesuai kebijakan retensi,
  pengelola database harus sengaja menonaktifkan trigger tersebut.
- File `.env`, berkas `*.xlsx`/`*.csv`, dan folder `backup/` **tidak pernah** diunggah ke GitHub.
- Header keamanan HTTP aktif di semua halaman; HTTPS otomatis di Vercel.
- Ekspor PDF tidak bisa mengambil berkas lokal atau alamat internet.

## Teknologi

Semua gratis dan sumber terbuka; tidak ada library berbayar.

- **Next.js 16 + TypeScript**: aplikasi web (tampilan dan server)
- **PostgreSQL + Prisma 7**: database (uji coba: `prisma dev`; produksi: Neon, Singapura)
- **Tailwind CSS**: tampilan; palet hijau tua `#183630`, krem `#E3DAC9`, emas `#E5C690`
- **ExcelJS** (impor/ekspor Excel), **pdfmake** (ekspor PDF), **bcryptjs** (sandi)
- **Vitest**: tes otomatis

## Susunan folder

```
docs/                  panduan pengguna, pemasangan, perawatan, laporan pencocokan
prisma/
  schema.prisma        struktur database (tabel dan kolom)
  migrations/          riwayat perubahan struktur database
  seed.ts              pengisian Pengaturan bawaan
scripts/
  admin.ts             akun admin lewat terminal
  impor.ts             impor lewat terminal
  cadangan.ts          cadangan database
  pulihkan.ts          pemulihan database
src/
  proxy.ts             gerbang depan: wajib login
  app/                 halaman-halaman aplikasi
  components/          komponen tampilan (sidebar, tombol, kartu, grafik)
  lib/
    aturan/            MESIN ATURAN (terjemahan rumus Excel)
      hari.ts          tanggal ala Excel: nomor seri, EDATE, WORKDAY
      mesin.ts         kolom Akhir efektif s.d. Cek data, dan Peringkat
      ringkasan.ts     angka-angka Dashboard
      saringan.ts      syarat pemilihan orang (Dashboard, daftar, tautan)
      pengaturan.ts    bentuk Pengaturan untuk mesin aturan
    auth/              login: sesi, cookie bertanda tangan, sandi
    data/              akses data pegawai, form, daftar, log
    excel/             baca sheet "Data TB", buat berkas Excel
    impor/             pencocokan dan penyimpanan impor
    pdf/               buat berkas PDF
    pengaturan/        nilai bawaan, pembacaan, dan pemeriksaan Pengaturan
    db.ts              koneksi database
    tanggal.ts         format tanggal dd/mm/yyyy, zona Asia/Jakarta
tests/                 tes otomatis
vercel.json            wilayah server Singapura dan langkah pemasangan di Vercel
```

## Tahapan pembangunan

1. ✅ Kerangka proyek dan skema database
2. ✅ Mesin aturan hambatan dan tes pencocokan dengan Excel (491 baris)
3. ✅ Impor data dari Excel (dan ekspor)
4. ✅ Data TB, form tambah/ubah, halaman detail
5. ✅ Daftar Perhatian dan Dashboard
6. ✅ Login dan peran
7. ✅ Log perubahan dan log akses
8. ✅ Layar Pengaturan
9. ✅ Dokumentasi, cadangan/pemulihan, persiapan pemasangan

**Prioritas 2 (berikutnya, bila dibutuhkan):** pengingat otomatis (email/WhatsApp), kolom PIC
dan penanda baris yang tidak disentuh > 30 hari, ringkasan satu halaman untuk rapat, riwayat
tren (snapshot berkala), unggah berkas SK.

# Panduan pemasangan KDS4 di internet (Vercel + Neon)

Panduan ini memasang aplikasi supaya bisa dibuka dari mana saja lewat alamat
`https://….vercel.app` (atau alamat kampus sendiri). Ikuti urutannya. Perkiraan waktu: 1 jam.

| Layanan | Untuk apa | Lokasi data |
|---|---|---|
| **GitHub** | Menyimpan kode aplikasi (repositori *private*) | Kode saja, tanpa data pegawai |
| **Neon** | Database PostgreSQL | **Singapura** |
| **Vercel** | Menjalankan aplikasi + HTTPS otomatis | Server di **Singapura** (`sin1`) |

## Sebelum mulai: dua keputusan

1. **Persetujuan lokasi data.** Data NIP dan kepegawaian akan tersimpan di server Singapura
   (di luar Indonesia). Sesuai UU PDP 27/2022, sebaiknya ada persetujuan pimpinan / pejabat
   pelindungan data (DPO) UM sebelum data asli diunggah.
2. **Paket Vercel.** Menurut ketentuan Vercel, paket gratis *Hobby* ditujukan untuk
   pemakaian pribadi non-komersial. Untuk aplikasi kerja institusi, periksa ketentuan
   terbaru di <https://vercel.com/pricing>. Bila tidak sesuai, gunakan paket *Pro*
   (berbayar, per anggota per bulan) atau pasang di server kampus. Kode aplikasi sama saja;
   hanya tempatnya yang berbeda. Paket gratis Neon cukup untuk data sebesar ini (ratusan baris).

Yang dibutuhkan di komputer: Node.js 22, Git, dan folder proyek ini (sudah ada).

---

## Langkah 1. Buat akun (lewati bila sudah punya)

1. **GitHub:** <https://github.com/signup>. Pakai email kantor.
2. **Vercel:** <https://vercel.com/signup> → pilih **Continue with GitHub**.
3. **Neon:** <https://neon.tech> → **Sign up** (boleh lewat GitHub).
4. Di ketiga layanan, aktifkan **verifikasi dua langkah (2FA)** di menu pengaturan akun.
   Akun-akun ini memegang akses ke data pegawai.

## Langkah 2. Unggah kode ke GitHub (repositori private)

1. Buka <https://github.com/new>.
2. Isi **Repository name**: `kds4-tb`. Pilih **Private**. Jangan centang README/.gitignore.
   Tekan **Create repository**.
3. Di terminal, di folder proyek, jalankan (ganti `NAMA-AKUN` dengan nama akun GitHub Anda):

   ```powershell
   git remote add origin https://github.com/NAMA-AKUN/kds4-tb.git
   git push -u origin main
   ```

4. Buka halaman repositori di GitHub dan pastikan **tidak ada** berkas `.env`, `*.xlsx`,
   atau folder `backup/`. (Ketiganya sengaja diabaikan Git.)

## Langkah 3. Buat database di Neon (wilayah Singapura)

1. Di Neon, tekan **New Project**.
2. **Project name**: `kds4`. **Region**: pilih **AWS Asia Pacific (Singapore)**.
   Versi PostgreSQL: biarkan bawaan. Tekan **Create**.
3. Buka **Connect** (atau *Connection details*). Salin **dua** alamat:
   - alamat **Pooled connection** (berisi kata `-pooler`) → nanti menjadi `DATABASE_URL`
   - alamat **langsung** (matikan pilihan *Connection pooling*; tanpa `-pooler`) →
     nanti menjadi `DIRECT_URL`

   Simpan sementara di tempat aman (bukan di chat/email). Alamat ini berisi kata sandi database.

## Langkah 4. Buat rahasia login

Di terminal, jalankan:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Salin hasilnya. Ini menjadi `SESI_RAHASIA`. Jangan pakai nilai yang sama dengan komputer lokal.

## Langkah 5. Pasang di Vercel

1. Di Vercel, tekan **Add New… → Project**, pilih repositori `kds4-tb` → **Import**.
2. **Framework Preset**: Next.js (terdeteksi otomatis). Pengaturan *Build* tidak perlu
   diubah. File `vercel.json` sudah mengatur:
   - wilayah server Singapura (`sin1`),
   - setiap pemasangan: terapkan struktur database → isi Pengaturan bawaan (tanpa menimpa
     perubahan Anda) → bangun aplikasi.
3. Buka **Environment Variables**, isi tiga baris:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | alamat **Pooled** dari Neon |
   | `DIRECT_URL` | alamat **langsung** dari Neon |
   | `SESI_RAHASIA` | hasil Langkah 4 |

4. Tekan **Deploy** dan tunggu sampai selesai (± 2–4 menit). Bila gagal, buka log build
   dan lihat bagian *Masalah umum* di [PANDUAN-PERAWATAN.md](PANDUAN-PERAWATAN.md).

> Alternatif: database Neon bisa juga dibuat dari menu **Storage** di proyek Vercel
> (pilih Neon, wilayah Singapore). Vercel lalu mengisi `DATABASE_URL` dan
> `DATABASE_URL_UNPOOLED` otomatis; aplikasi mengenali keduanya. Tinggal tambahkan
> `SESI_RAHASIA`.

## Langkah 6. Buat akun admin di database Neon

Akun admin dibuat dari komputer Anda, langsung ke database Neon. Buka **terminal baru**
di folder proyek (PowerShell), lalu jalankan baris demi baris (ganti isinya):

```powershell
$env:DATABASE_URL = "alamat LANGSUNG dari Neon (tanpa -pooler)"
$env:ADMIN_SANDI_AWAL = "sandi awal, minimal 10 karakter"
npm run admin -- buat
```

Tutup terminal itu setelah selesai (isian `$env:` hilang saat terminal ditutup).

## Langkah 7. Masuk dan isi data

1. Buka alamat aplikasi dari Vercel (mis. `https://kds4-tb.vercel.app`).
2. Masuk dengan `admin@kds.um.ac.id` dan sandi awal tadi.
3. **Segera ganti kata sandi**: tombol **Kata sandi** di bawah sidebar.
4. Buka **Impor dari Excel**, pilih `DATA_TB.xlsx`, tekan **Periksa berkas**, periksa
   pratinjau (harus 491 orang baru, 0 gagal), lalu **Simpan**.

## Langkah 8. Periksa hasilnya

1. Di **Ringkasan**, isi *Tanggal acuan (simulasi)* `07/10/2026` → **Terapkan**.
2. Angkanya harus sama dengan Excel: Sedang TB **297** (Bebas 160, Tetap 137), Kritis **39**,
   Waspada **91**, Perhatian **144**, Aman **23**.
3. Kosongkan lagi tanggal simulasi untuk kembali ke hari ini.

## Langkah 9 (opsional). Alamat kampus sendiri

Bila ingin alamat seperti `tb.kds.um.ac.id`: di Vercel buka **Settings → Domains**, tambahkan
alamat tersebut, lalu minta pengelola DNS UM (TIK) menambahkan catatan DNS yang ditampilkan
Vercel. HTTPS dipasang otomatis.

---

## Daftar periksa keamanan

- [ ] Repositori GitHub **Private**; tidak ada `.env`, `*.xlsx`, `backup/` di dalamnya.
- [ ] 2FA aktif di GitHub, Vercel, dan Neon.
- [ ] `SESI_RAHASIA` di Vercel berbeda dari komputer lokal.
- [ ] Sandi admin sudah diganti setelah masuk pertama.
- [ ] Ada persetujuan pimpinan/DPO untuk penyimpanan data di Singapura.
- [ ] Jadwal cadangan rutin sudah ditetapkan (lihat [PANDUAN-PERAWATAN.md](PANDUAN-PERAWATAN.md)).

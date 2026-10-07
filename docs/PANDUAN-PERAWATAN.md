# Panduan perawatan KDS4

Untuk pengelola aplikasi. Semua perintah dijalankan di terminal (PowerShell), di folder proyek.

**Bekerja dengan database produksi (Neon) dari komputer:** buka terminal baru, lalu isi
alamat database **langsung** (tanpa `-pooler`) sebelum menjalankan perintah:

```powershell
$env:DATABASE_URL = "alamat LANGSUNG dari Neon"
```

Isian ini hanya berlaku di terminal itu dan hilang saat terminal ditutup. Tanpa baris ini,
perintah bekerja pada database uji coba di komputer Anda (sesuai file `.env`).

---

## 1. Cadangan (backup)

Ada tiga lapis cadangan. Lakukan minimal lapis A dan B.

### A. Cadangan lengkap dari aplikasi (disarankan tiap minggu)

```powershell
$env:DATABASE_URL = "alamat LANGSUNG dari Neon"
npm run cadangan
```

Hasilnya satu berkas `backup/kds4-cadangan-TANGGAL-JAM.json` berisi **semua** tabel: data
pegawai, Pengaturan, akun (sandi tetap ter-hash), riwayat impor, dan seluruh log.

- Berkas ini berisi data pribadi. Simpan di penyimpanan kantor yang aksesnya terbatas;
  jangan kirim lewat email/chat. Folder `backup/` tidak pernah ikut diunggah ke GitHub.
- Simpan beberapa cadangan terakhir (mis. 8 minggu), hapus yang lebih lama.

### B. Ekspor Excel (mudah dibaca manusia)

Di aplikasi: **Data TB → Ekspor Excel**. Berguna sebagai arsip dan bisa diimpor kembali.
Catatan: ekspor Excel **tidak** memuat log dan Pengaturan; untuk itu pakai cadangan A.

### C. Riwayat otomatis Neon

Neon menyimpan riwayat perubahan database untuk jangka waktu tertentu (tergantung paket) dan
bisa dikembalikan ke titik waktu sebelumnya lewat menu **Restore / Branches** di dasbor Neon.
Ini berguna untuk kesalahan yang baru terjadi; untuk jangka panjang tetap andalkan cadangan A.

## 2. Memulihkan dari cadangan

Pemulihan **hanya** bisa ke database yang masih kosong, supaya tidak ada data yang tertimpa
tanpa sengaja.

1. Di Neon, buat database baru yang kosong (mis. *New Project* wilayah Singapura, atau
   *branch* baru tanpa data). Salin alamat langsung dan pooled-nya.
2. Siapkan struktur tabel, lalu pulihkan:

   ```powershell
   $env:DATABASE_URL = "alamat LANGSUNG database BARU"
   npm run db:terapkan
   npm run pulihkan -- backup/kds4-cadangan-2026-10-07-13-01.json
   ```

3. Di Vercel, ganti `DATABASE_URL` dan `DIRECT_URL` (Settings → Environment Variables) ke
   database baru, lalu **Deployments → … → Redeploy**.
4. Masuk ke aplikasi dan periksa Ringkasan.

Pemulihan sudah diuji: cadangan → database kosong → cadangan ulang menghasilkan isi yang
identik di 12 tabel, dan hasil hitungnya tetap sama persis dengan Excel.

## 3. Memperbarui aplikasi

Pembaruan kode (perbaikan atau fitur baru) dipasang dengan mengunggahnya ke GitHub; Vercel
otomatis memasang versi baru dan menerapkan perubahan struktur database.

```powershell
npm install
npm test
git add -A
git commit -m "Uraian singkat perubahan"
git push
```

- `npm test` harus lolos sebelum `git push` (termasuk tes pencocokan dengan Excel bila
  `DATA_TB.xlsx` ada di folder proyek).
- Pantau di Vercel → **Deployments**. Bila versi baru bermasalah, buka versi sebelumnya →
  **… → Promote to Production** (atau *Instant Rollback*) untuk kembali dalam hitungan detik.
  Perubahan struktur database tidak ikut mundur; buat cadangan (bagian 1A) **sebelum**
  memasang pembaruan yang mengubah struktur database (ada folder baru di `prisma/migrations`).

## 4. Akun admin

| Kejadian | Perintah (dengan `$env:DATABASE_URL` Neon bila untuk produksi) |
|---|---|
| Lupa kata sandi | `npm run admin -- reset-sandi` → sandi baru acak tampil **sekali** di terminal; semua sesi lama dicabut |
| Akun terkunci (5× salah) dan tidak mau menunggu 15 menit | `npm run admin -- buka-kunci` |
| Rahasia login (`SESI_RAHASIA`) mungkin bocor | Buat nilai baru (lihat Panduan Pemasangan langkah 4), ganti di Vercel, Redeploy. Semua orang otomatis keluar. |

Ganti kata sandi biasa cukup lewat tombol **Kata sandi** di bawah sidebar.

## 5. Tugas berkala

| Kapan | Tugas |
|---|---|
| Tiap minggu | Cadangan lengkap (1A); lihat **Log Aktivitas → Log akses** untuk gagal masuk yang mencurigakan |
| Tiap awal tahun | Isi **hari libur nasional** tahun itu di Pengaturan (dipakai hitungan hari kerja) |
| Saat aturan berubah (mis. Permendikbud baru) | Ubah parameter / skor / saran di Pengaturan; nama hambatan yang menyebut angka (mis. "14 hari kerja") ikut disesuaikan |
| Tiap 3–6 bulan | Minta pengembang memperbarui paket (`npm outdated`) dan menjalankan seluruh tes |

## 6. Masalah umum

| Gejala | Penyebab dan solusi |
|---|---|
| Build di Vercel gagal: `DATABASE_URL belum diisi` / tidak bisa terhubung | Periksa ketiga *Environment Variables* di Vercel (nama persis, tanpa spasi/tanda kutip). |
| Build gagal saat `prisma migrate deploy` | `DIRECT_URL` harus alamat **tanpa** `-pooler`. |
| Halaman selalu kembali ke Masuk | `SESI_RAHASIA` kosong/kurang dari 32 karakter, atau berganti. Isi dengan benar lalu Redeploy. |
| "Terlalu banyak percobaan gagal" | Tunggu 15 menit atau jalankan `npm run admin -- buka-kunci`. |
| Impor gagal: berkas lebih dari 4 MB | Simpan salinan Excel yang hanya berisi sheet "Data TB". |
| Angka Ringkasan berbeda dengan Excel | Periksa tanggal acuan (hari ini vs. simulasi) dan Pengaturan (bandingkan dengan nilai bawaan / Log Aktivitas). Jalankan `npm run uji:excel` di komputer. |
| Hari kerja tidak memperhitungkan libur | Hari libur belum diisi di Pengaturan. |

## 7. Uji coba di komputer sendiri

Lihat README bagian *Menjalankan di komputer sendiri*. Database uji coba lokal dinyalakan
dengan `npm run db:lokal` dan terpisah sepenuhnya dari database produksi.

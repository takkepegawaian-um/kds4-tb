# Laporan pencocokan hasil aplikasi dengan DATA_TB.xlsx

Kriteria penerimaan: dengan data dari `DATA_TB.xlsx` dan **tanggal acuan 07/10/2026**, hasil
aplikasi harus sama persis dengan Excel. Laporan ini bisa diulang kapan saja:

```bash
npm run uji:excel
```

dan, setelah data diimpor ke database:

```bash
npm run uji:db
```

## Ringkasan hasil

| Yang dibandingkan | Jumlah | Hasil |
|---|---|---|
| Kolom hasil per orang (Akhir efektif, Sisa hari, Tahap, SK terbit?, Hari kuliah tanpa SK, Hari tertahan, Pihak penahan, Kode, Hambatan utama, Level, Skor, Peringkat, Cek data) | 491 baris × 13 kolom = 6.383 sel | Sama, kecuali 3 sel disengaja |
| Sheet Dashboard | 247 sel | Semua sama |
| Sheet Daftar Perhatian (urutan dan 13 kolom) | 274 baris | Sama, kecuali 5 sel disengaja |
| Data setelah diimpor ke database (23 kolom input + 6 kolom hasil) | 491 orang | 0 selisih |
| Tautan angka Dashboard (jumlah daftar = angka), tanpa filter dan dengan filter | semua angka | Semua sama |

## Kriteria penerimaan

| Kriteria | Excel | Aplikasi |
|---|---|---|
| Total orang | 491 | 491 ✅ |
| Sedang TB (Bebas / Tetap) | 297 (160 / 137) | 297 (160 / 137) ✅ |
| Sudah PK / Lulus / Rencana studi / Expired | 145 / 27 / 22 / 0 | 145 / 27 / 22 / 0 ✅ |
| Kritis (Bebas / Tetap) | 39 (39 / 0) | 39 (39 / 0) ✅ |
| Waspada (Bebas / Tetap) | 91 (91 / 0) | 91 (91 / 0) ✅ |
| Perhatian (Bebas / Tetap) | 144 (22 / 122) | 144 (22 / 122) ✅ |
| Aman (Bebas / Tetap) | 23 (8 / 15) | 23 (8 / 15) ✅ |
| Kode 0 / 1 / 2 / 3 / 4 / 5 / 6 | 23 / 9 / 0 / 116 / 28 / 79 / 0 | sama ✅ |
| Kode 7 / 8 / 9 / 10 / 11 / 12 | 18 / 0 / 0 / 2 / 21 / 1 | sama ✅ |
| Per fakultas, total kolom Arsip | 194 | 194 ✅ |
| Peringkat dan Hambatan utama per orang | 491 baris | semua sama ✅ |

## Selisih yang disengaja (sudah disetujui)

**1. Kolom "Cek data", 3 baris (36, 37, 48): Excel "NIP kembar.", aplikasi kosong.**
Rumus Excel memakai `COUNTIF`, yang mengubah NIP 18 digit menjadi angka dan hanya
membandingkan 15 digit pertama. Ketiga NIP itu hanya mirip di 15 digit pertama dengan NIP
orang lain, jadi sebenarnya bukan kembar. Aplikasi membandingkan NIP utuh. NIP yang benar-benar
kembar (4 pasang: baris 183/184, 257/258, 262/276, 295/296) tetap ditandai.

**2. Sheet Daftar Perhatian, 5 sel (baris 32, 38, 44 kolom Catatan; baris 227, 228 kolom
Fakultas): Excel "0", aplikasi kosong.**
Rumus `INDEX` di Excel yang merujuk sel kosong menghasilkan angka 0. Sel sumbernya memang
kosong; aplikasi menampilkannya kosong.

**3. Istilah absensi (08/10/2026): kolom "Cek data" baris 50 dan pilihan "MISTERY??".**
Isian "MISTERY??" dihapus dari pilihan Status absensi atas permintaan pengguna. Satu-satunya
orang yang memakainya (baris 50) diubah menjadi AKTIF lewat migrasi database, dan tercatat di Log
perubahan. Akibatnya catatan "Status presensi tidak jelas." di Cek data baris 50 tidak muncul lagi,
dan baris "Presensi tidak jelas (MISTERY??)" (Excel: 1) tidak ada lagi di Ringkasan. Kode, skor,
level, dan peringkat tidak berubah.

**4. Istilah absensi: nama dan saran hambatan kode 1, 2, dan 5.**
Kode, skor, dan syaratnya sama dengan Excel; hanya kalimatnya yang diganti supaya tidak membingungkan:
"Presensi masih bebas…" → "Masa TB berakhir, tetapi absensi masih ditandai TB"; "Presensi NON AKTIF
padahal SK TB masih berlaku" → "SK TB berlaku, tetapi absensi tidak ditandai TB"; "Presensi ditandai TB
lebih pendek…" → "Penandaan TB di absensi lebih pendek dari masa TB". Tes pencocokan memakai
kalimat asli Excel untuk logika, dan satu tes khusus memeriksa kalimat barunya.

## Perbedaan cara hitung yang tidak mengubah hasil saat ini

- **Angka Bebas/Tetap di Dashboard hanya menghitung orang "Sedang TB".** Excel menghitung
  semua baris yang kolom Jenis-nya terisi. Karena kolom Jenis hanya terisi untuk Sedang TB,
  hasilnya sama untuk data sekarang.
- **Perbandingan teks tidak membedakan huruf besar/kecil**, sama seperti Excel.

## Catatan data yang perlu ditindaklanjuti (bukan kesalahan aplikasi)

- 4 pasang NIP kembar (lihat di atas). Pasangan 262/276 tampaknya orang yang sama tercatat dua kali.
- 6 NIP tidak 18 digit: baris 367, 398, 444, 488, 491, 496.
- Jenjang "III/c" di baris 341 (tampaknya golongan, bukan jenjang).
- Kolom "Tanggal masuk tahap" belum pernah diisi, sehingga hambatan kode 9 (tertahan terlalu
  lama) belum bisa muncul. Di aplikasi, kolom ini terisi otomatis saat Status SK berganti tahap.

## Bukti tes dapat mendeteksi kesalahan

Skor dasar kode 5 sengaja diubah sementara dari 70 menjadi 71: tes langsung gagal di 79 baris
yang terdampak, lalu lolos kembali setelah nilainya dipulihkan.

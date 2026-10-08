# Panduan pengguna KDS4 — Monitor Tugas Belajar

Untuk admin SDM yang memakai aplikasi sehari-hari.

## Masuk dan keluar

- Buka alamat aplikasi, masuk dengan email dan kata sandi.
- Sesi berlaku 8 jam. Tombol **Keluar** ada di bawah sidebar (di HP: tombol menu ☰ di kiri atas).
- Salah kata sandi 5 kali → akun dikunci 15 menit.

## Pekerjaan rutin

### 1. Melihat kondisi terkini — menu **Ringkasan**

- Kartu atas: jumlah Sedang TB dan jumlah per level (Kritis merah, Waspada kuning,
  Perhatian biru, Aman hijau), dipisah Bebas dan Tetap TriDharma.
- **Klik angka atau batang grafik mana pun** untuk melihat daftar orang di baliknya.
- Saring per **fakultas** atau **jenis**, atau isi **tanggal acuan (simulasi)** untuk melihat
  kondisi pada tanggal tertentu (mis. tanggal rapat).

Urutan bawaan daftar (Data TB dan Daftar Perhatian) adalah **sisa hari, tersedikit dulu**: yang masa TB-nya
sudah lewat paling atas. Judul kolom tetap terlihat saat tabel digulir. Urutan lain bisa dipilih lewat
kotak **Urutkan**.

### 2. Menyiapkan rapat — menu **Daftar Perhatian**

1. Isi **Tanggal acuan (simulasi)** dengan tanggal rapat (bila perlu), saring fakultas/level.
2. Tekan **Ekspor PDF** untuk dicetak/dibagikan, atau **Ekspor Excel** untuk diolah.
3. Bahas dari peringkat teratas: hambatan utama, pihak penahan, dan **saran tindakan**.

### 3. Memperbarui data seseorang — menu **Data TB**

1. Cari nama atau NIP (kotak cari di atas juga bisa dipakai dari halaman mana saja).
2. Klik nama → halaman detail (hambatan, saran, semua data, riwayat perubahan).
3. Tekan **Ubah data**, perbarui, tekan **Simpan perubahan**. Hambatan langsung dihitung ulang.

Tips pengisian:
- Tanggal ditulis **dd/mm/yyyy**; boleh diketik 8 angka saja (mis. `31082026`).
- Saat **Status SK** berganti tahap (mis. dari *Usul TB* ke *TB Aktif*), *Tanggal masuk tahap*
  otomatis diisi hari ini. Ubah bila tanggal sebenarnya berbeda. Tanggal ini dipakai untuk
  menghitung berapa lama sebuah usulan tertahan.
- Peringatan kuning (mis. NIP kembar) tidak menghalangi penyimpanan; kotak merah harus
  dibetulkan dulu.
- **Hapus** tidak menghilangkan data selamanya; data bisa dipulihkan dari **Data terhapus**.

### 4. Menambah banyak data sekaligus — menu **Impor dari Excel**

1. Pilih berkas Excel (format sama dengan DATA_TB.xlsx), tekan **Periksa berkas**.
2. Periksa pratinjau: orang baru, data berubah (lama → baru), baris gagal, peringatan.
   Hilangkan centang baris yang tidak ingin disimpan.
3. Tekan **Simpan**. Orang yang ada di aplikasi tetapi tidak ada di berkas **tidak** dihapus.

### 5. Melihat siapa mengubah apa — menu **Log Aktivitas**

- **Riwayat perubahan data**: semua tambah/ubah/hapus/impor, nilai lama → baru.
- **Log akses**: masuk, gagal masuk, keluar, ekspor. Periksa berkala.

### 6. Mengubah aturan — menu **Pengaturan**

Ambang hari, skor, batas level, Status SK, daftar pilihan, hari libur, dan rekap manual.
Setelah menyimpan, aplikasi menunjukkan dampaknya (mis. "Waspada 91 → 112"). Bila ragu, tekan
**Kembalikan ke bawaan Excel**. Semua perubahan tercatat di Log Aktivitas.

## Status absensi (khusus Bebas TriDharma)

Pegawai Bebas TriDharma tidak absen selama TB, karena absensinya **ditandai TB oleh Admin**.

| Tulisan di layar | Artinya |
|---|---|
| **Ditandai TB** | Absensi pegawai ditandai TB (bebas absen). Ini keadaan normal selama TB berjalan. |
| **Tidak ditandai TB (absen sendiri)** | Tidak ada tanda TB, jadi pegawai harus absen sendiri. Bila SK TB masih berlaku, tunjangan dan kinerja bisa terpotong. |

Tanggal "Ditandai TB s.d." menunjukkan sampai kapan penandaan berlaku. Setelah masa TB berakhir,
tanda TB harus dicabut. Hambatan terkait: kode 1 (masa TB berakhir, absensi masih ditandai TB),
kode 2 (SK TB berlaku, absensi tidak ditandai TB), dan kode 5 (penandaan lebih pendek dari masa TB).

## Arti level dan kode hambatan

| Level | Skor | Artinya |
|---|---|---|
| Kritis | ≥ 80 | Bahas lebih dulu |
| Waspada | 55–79 | Perlu tindakan segera |
| Perhatian | 1–54 | Pantau |
| Aman | 0 | Tidak ada hambatan |

Setiap orang Sedang TB mendapat **satu** hambatan utama: kode dengan nomor terkecil di antara
syarat yang terpenuhi (kode 1 paling mendesak). Skor Tetap TriDharma dikurangi 40 (bisa diubah
di Pengaturan) supaya tidak menutupi Bebas TriDharma. Daftar kode, skor, dan saran tindakan
lengkap ada di **Pengaturan → Aturan hambatan**.

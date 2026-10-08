-- Istilah absensi dirapikan (permintaan pengguna, 08/10/2026).
-- Semua perubahan bersyarat: hanya menimpa teks yang MASIH sama dengan bawaan lama,
-- sehingga teks yang sudah diubah admin lewat layar Pengaturan tidak tertimpa.

-- 1. Isian "MISTERY??" dihapus dari daftar pilihan Status absensi.
DELETE FROM "PilihanNilai" WHERE "kategori" = 'PRESENSI' AND "nilai" = 'MISTERY??';

-- 2. Pegawai yang berisi "MISTERY??" diubah menjadi AKTIF (ditandai TB), dengan catatan di Log perubahan.
INSERT INTO "LogPerubahan" ("waktu", "email", "entitas", "entitasId", "aksi", "kolom", "nilaiLama", "nilaiBaru")
SELECT NOW(), 'sistem (migrasi 08/10/2026)', 'PegawaiTB', "id"::text, 'UBAH', 'presensi', 'MISTERY??', 'AKTIF'
FROM "PegawaiTB" WHERE "presensi" = 'MISTERY??';

UPDATE "PegawaiTB" SET "presensi" = 'AKTIF', "diubahOleh" = 'sistem (migrasi 08/10/2026)' WHERE "presensi" = 'MISTERY??';

-- 3. Nama dan saran hambatan kode 1, 2, dan 5.
UPDATE "AturanHambatan" SET "nama" = 'Masa TB berakhir, tetapi absensi masih ditandai TB'
  WHERE "kode" = 1 AND "nama" = 'Presensi masih bebas padahal masa TB sudah berakhir';
UPDATE "AturanHambatan" SET "saran" = 'Cek dasar SK. Bila tidak ada SK yang berlaku, cabut tanda TB di absensi dan proses pengaktifan kembali.'
  WHERE "kode" = 1 AND "saran" = 'Cek dasar SK. Bila tidak ada SK yang berlaku, koreksi penandaan presensi dan proses pengaktifan kembali.';

UPDATE "AturanHambatan" SET "nama" = 'SK TB berlaku, tetapi absensi tidak ditandai TB'
  WHERE "kode" = 2 AND "nama" = 'Presensi NON AKTIF padahal SK TB masih berlaku';
UPDATE "AturanHambatan" SET "saran" = 'Tandai absensi sebagai TB supaya tunjangan dan kinerja tidak terpotong.'
  WHERE "kode" = 2 AND "saran" = 'Tandai ulang presensi sebagai TB supaya tunjangan dan kinerja tidak terpotong.';

UPDATE "AturanHambatan" SET "nama" = 'Penandaan TB di absensi lebih pendek dari masa TB'
  WHERE "kode" = 5 AND "nama" = 'Presensi ditandai TB lebih pendek dari masa TB';
UPDATE "AturanHambatan" SET "saran" = 'Tandai absensi periode berikutnya sebelum penandaan habis.'
  WHERE "kode" = 5 AND "saran" = 'Tandai presensi periode berikutnya sebelum penandaan habis.';

-- 4. Label parameter.
UPDATE "Parameter" SET "label" = 'Ambang peringatan penandaan TB di absensi hampir habis (hari)'
  WHERE "kunci" = 'ambangPresensiHari' AND "label" = 'Ambang peringatan presensi ditandai TB hampir habis (hari)';
UPDATE "Parameter" SET "keterangan" = 'Pilihan unit. Dipakai untuk "Ditandai TB s.d.".'
  WHERE "kunci" = 'ambangPresensiHari' AND "keterangan" = 'Pilihan unit. Dipakai untuk catatan "Presensi ditandai TB s.d.".';

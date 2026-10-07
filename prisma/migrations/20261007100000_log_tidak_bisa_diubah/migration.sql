-- Log perubahan dan log akses hanya boleh DITAMBAH, tidak boleh diubah atau dihapus.
-- Penguncian di tingkat database ini berlaku untuk semua program, bukan hanya aplikasi.
-- (Bila suatu saat log lama perlu dibersihkan sesuai kebijakan retensi, pengelola database
--  harus menonaktifkan trigger ini secara sengaja; lihat README bagian "Log".)

CREATE OR REPLACE FUNCTION kds4_tolak_ubah_log() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Tabel % hanya boleh ditambah; log tidak boleh diubah atau dihapus.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "LogPerubahan_kunci"
  BEFORE UPDATE OR DELETE ON "LogPerubahan"
  FOR EACH ROW EXECUTE FUNCTION kds4_tolak_ubah_log();

CREATE TRIGGER "LogPerubahan_kunci_truncate"
  BEFORE TRUNCATE ON "LogPerubahan"
  FOR EACH STATEMENT EXECUTE FUNCTION kds4_tolak_ubah_log();

CREATE TRIGGER "LogAkses_kunci"
  BEFORE UPDATE OR DELETE ON "LogAkses"
  FOR EACH ROW EXECUTE FUNCTION kds4_tolak_ubah_log();

CREATE TRIGGER "LogAkses_kunci_truncate"
  BEFORE TRUNCATE ON "LogAkses"
  FOR EACH STATEMENT EXECUTE FUNCTION kds4_tolak_ubah_log();

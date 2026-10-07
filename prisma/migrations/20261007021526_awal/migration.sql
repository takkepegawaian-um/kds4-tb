-- CreateEnum
CREATE TYPE "Peran" AS ENUM ('ADMIN', 'PENGAMAT');

-- CreateTable
CREATE TABLE "Pengguna" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "hashSandi" TEXT NOT NULL,
    "peran" "Peran" NOT NULL DEFAULT 'ADMIN',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "gagalLogin" INTEGER NOT NULL DEFAULT 0,
    "terkunciSampai" TIMESTAMP(3),
    "loginTerakhir" TIMESTAMP(3),
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pengguna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesi" (
    "id" TEXT NOT NULL,
    "penggunaId" INTEGER NOT NULL,
    "kedaluwarsa" TIMESTAMP(3) NOT NULL,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Sesi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PegawaiTB" (
    "id" SERIAL NOT NULL,
    "urutan" INTEGER NOT NULL,
    "no" INTEGER,
    "nama" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "statusAkhir" TEXT NOT NULL,
    "fakultas" TEXT,
    "departemen" TEXT,
    "jabatan" TEXT,
    "jenjang" TEXT,
    "jenisPelaksanaan" TEXT,
    "lokasi" TEXT,
    "sumberBiaya" TEXT,
    "tempatStudi" TEXT,
    "tmtTb" DATE,
    "masaStudiSd" DATE,
    "perpanjanganSd" DATE,
    "statusSk" TEXT,
    "kondisiKuliah" TEXT,
    "noSk" TEXT,
    "linkSk" TEXT,
    "presensi" TEXT,
    "presensiTbSd" DATE,
    "catatan" TEXT,
    "tanggalMasukTahap" DATE,
    "dibuatPada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diubahPada" TIMESTAMP(3) NOT NULL,
    "dibuatOleh" TEXT,
    "diubahOleh" TEXT,
    "dihapusPada" TIMESTAMP(3),
    "dihapusOleh" TEXT,

    CONSTRAINT "PegawaiTB_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parameter" (
    "kunci" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "keterangan" TEXT,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "Parameter_pkey" PRIMARY KEY ("kunci")
);

-- CreateTable
CREATE TABLE "HariLibur" (
    "tanggal" DATE NOT NULL,
    "keterangan" TEXT,

    CONSTRAINT "HariLibur_pkey" PRIMARY KEY ("tanggal")
);

-- CreateTable
CREATE TABLE "PilihanNilai" (
    "id" SERIAL NOT NULL,
    "kategori" TEXT NOT NULL,
    "nilai" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "sistem" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PilihanNilai_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PemetaanStatusSk" (
    "statusSk" TEXT NOT NULL,
    "tahap" TEXT NOT NULL,
    "pihakPenahan" TEXT NOT NULL,
    "skTerbit" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL,

    CONSTRAINT "PemetaanStatusSk_pkey" PRIMARY KEY ("statusSk")
);

-- CreateTable
CREATE TABLE "AturanHambatan" (
    "kode" INTEGER NOT NULL,
    "nama" TEXT NOT NULL,
    "skorDasar" INTEGER NOT NULL,
    "saran" TEXT NOT NULL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AturanHambatan_pkey" PRIMARY KEY ("kode")
);

-- CreateTable
CREATE TABLE "RekapResmiFakultas" (
    "fakultas" TEXT NOT NULL,
    "tugasBelajar" INTEGER NOT NULL DEFAULT 0,
    "biayaMandiri" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RekapResmiFakultas_pkey" PRIMARY KEY ("fakultas")
);

-- CreateTable
CREATE TABLE "RekapPenerbitanSk" (
    "id" SERIAL NOT NULL,
    "urutan" INTEGER NOT NULL,
    "uraian" TEXT NOT NULL,
    "jumlah" INTEGER NOT NULL DEFAULT 0,
    "kelompok" TEXT,

    CONSTRAINT "RekapPenerbitanSk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogPerubahan" (
    "id" SERIAL NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "kolom" TEXT,
    "nilaiLama" TEXT,
    "nilaiBaru" TEXT,
    "imporId" INTEGER,

    CONSTRAINT "LogPerubahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogAkses" (
    "id" SERIAL NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "peristiwa" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "keterangan" TEXT,

    CONSTRAINT "LogAkses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiwayatImpor" (
    "id" SERIAL NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "namaBerkas" TEXT NOT NULL,
    "jumlahBaris" INTEGER NOT NULL,
    "ditambah" INTEGER NOT NULL,
    "diubah" INTEGER NOT NULL,
    "dilewati" INTEGER NOT NULL,
    "gagal" INTEGER NOT NULL,
    "laporan" JSONB NOT NULL,

    CONSTRAINT "RiwayatImpor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pengguna_email_key" ON "Pengguna"("email");

-- CreateIndex
CREATE INDEX "Sesi_penggunaId_idx" ON "Sesi"("penggunaId");

-- CreateIndex
CREATE INDEX "PegawaiTB_nip_idx" ON "PegawaiTB"("nip");

-- CreateIndex
CREATE INDEX "PegawaiTB_statusAkhir_idx" ON "PegawaiTB"("statusAkhir");

-- CreateIndex
CREATE INDEX "PegawaiTB_urutan_idx" ON "PegawaiTB"("urutan");

-- CreateIndex
CREATE INDEX "PegawaiTB_dihapusPada_idx" ON "PegawaiTB"("dihapusPada");

-- CreateIndex
CREATE UNIQUE INDEX "PilihanNilai_kategori_nilai_key" ON "PilihanNilai"("kategori", "nilai");

-- CreateIndex
CREATE INDEX "LogPerubahan_entitas_entitasId_idx" ON "LogPerubahan"("entitas", "entitasId");

-- CreateIndex
CREATE INDEX "LogPerubahan_waktu_idx" ON "LogPerubahan"("waktu");

-- CreateIndex
CREATE INDEX "LogAkses_waktu_idx" ON "LogAkses"("waktu");

-- CreateIndex
CREATE INDEX "LogAkses_email_idx" ON "LogAkses"("email");

-- AddForeignKey
ALTER TABLE "Sesi" ADD CONSTRAINT "Sesi_penggunaId_fkey" FOREIGN KEY ("penggunaId") REFERENCES "Pengguna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

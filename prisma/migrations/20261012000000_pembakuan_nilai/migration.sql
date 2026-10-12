-- CreateTable
CREATE TABLE "PembakuanNilai" (
    "id" SERIAL NOT NULL,
    "jenis" TEXT NOT NULL,
    "asli" TEXT NOT NULL,
    "baku" TEXT NOT NULL,
    "negara" TEXT,

    CONSTRAINT "PembakuanNilai_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PembakuanNilai_jenis_asli_key" ON "PembakuanNilai"("jenis", "asli");

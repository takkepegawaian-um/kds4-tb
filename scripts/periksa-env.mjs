// Pemeriksaan awal sebelum build di Vercel: variabel lingkungan wajib sudah diisi.
// Dijalankan oleh "buildCommand" di vercel.json. Tanpa ini, galatnya berupa pesan Prisma
// yang sulit dipahami.

const masalah = [];

const alamatDb = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!process.env.DATABASE_URL) masalah.push('DATABASE_URL belum diisi (alamat database Neon yang "pooled", mengandung kata -pooler).');
if (!alamatDb) masalah.push("Alamat database untuk migrasi tidak ada (isi DIRECT_URL).");
if (process.env.DATABASE_URL && !/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL)) {
  masalah.push('DATABASE_URL harus diawali "postgresql://". Salin ulang dari Neon, tanpa tanda kutip.');
}
if (process.env.DIRECT_URL && /-pooler/.test(process.env.DIRECT_URL)) {
  masalah.push('DIRECT_URL berisi "-pooler". Untuk DIRECT_URL pakai alamat langsung (tanpa -pooler) dari Neon.');
}
if (!process.env.SESI_RAHASIA || process.env.SESI_RAHASIA.length < 32) {
  masalah.push("SESI_RAHASIA belum diisi atau kurang dari 32 karakter (lihat Panduan Pemasangan, Langkah 4).");
}

if (masalah.length) {
  console.error("\nPEMASANGAN DIHENTIKAN: pengaturan di Vercel belum lengkap.\n");
  for (const m of masalah) console.error(`  - ${m}`);
  console.error("\nCara memperbaiki: Vercel > proyek > Settings > Environment Variables, isi yang kurang,");
  console.error("lalu Deployments > deployment terakhir > ... > Redeploy.");
  console.error("Panduan lengkap: docs/PANDUAN-PEMASANGAN.md (Langkah 3 sampai 5).\n");
  process.exit(1);
}
console.log("Pemeriksaan pengaturan: lengkap.");

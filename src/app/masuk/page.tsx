import Image from "next/image";
import { Suspense } from "react";
import { FormMasuk } from "./form-masuk";

export default function HalamanMasuk() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-hijau-900 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="Logo KDS4" width={64} height={75} priority style={{ width: 64, height: "auto" }} />
          <h1 className="mt-4 text-2xl font-bold text-white">KDS4</h1>
          <p className="text-krem-200">Monitor TB</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-xl font-semibold text-hijau-900">Masuk</h2>
          <p className="mt-1 mb-6 text-sm text-gray-600">Khusus admin SDM. Data berisi NIP dan data kepegawaian.</p>
          <Suspense>
            <FormMasuk />
          </Suspense>
        </div>
        <p className="mt-6 text-center text-xs text-krem-200/70">Lupa kata sandi? Hubungi pengelola aplikasi untuk reset.</p>
      </div>
    </main>
  );
}

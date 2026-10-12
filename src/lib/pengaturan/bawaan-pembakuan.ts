// Isi awal tabel pembakuan (Pengaturan > Pembakuan data), disusun dari tulisan yang ada di
// DATA_TB.xlsx per 12/10/2026. Hanya berisi nama program beasiswa dan nama kampus (bukan data pribadi).
// Diisikan ke database hanya bila tabelnya masih kosong (prisma/seed.ts); setelah itu admin
// mengubahnya lewat layar Pengaturan, bukan di berkas ini.
//
// Dasar pengelompokan sumber biaya:
//   Mandiri  = "Mandiri" dan "Sendiri" (keduanya biaya sendiri)
//   Beasiswa = semua program beasiswa, termasuk "UM" (beasiswa dari UM) dan beasiswa yang sedang berjalan
//   Belum jelas = isian ganda atau masih dalam pengajuan

import type { BarisPembakuan } from "@/lib/aturan/sebaran";

/** [tulisan di Data TB, kelompok] */
const BIAYA: [string, "Beasiswa" | "Mandiri" | "Belum jelas"][] = [
  ["Mandiri", "Mandiri"],
  ["Sendiri", "Mandiri"],

  ["LPDP", "Beasiswa"],
  ["UM", "Beasiswa"],
  ["BPI", "Beasiswa"],
  ["PDDI", "Beasiswa"],
  ["PPDI", "Beasiswa"],
  ["BPDDI", "Beasiswa"],
  ["IDB", "Beasiswa"],
  ["ITS", "Beasiswa"],
  ["BPI per 18 Agustus 2025", "Beasiswa"],
  ["awal Mandiri , per 25 Agt 2025 BPI on Going", "Beasiswa"],
  ["Beasiswa Pendidikan Indonesia (LPTK/PPG Pathway Program), Kemendikbudristek", "Beasiswa"],
  ["UM + Jepang", "Beasiswa"],
  ["UM dan UTM", "Beasiswa"],
  ["CYCU International Student Scholarship dan UM", "Beasiswa"],
  ["NTNU Scholarship dan UM", "Beasiswa"],
  ["Russian Goverment Scholarship", "Beasiswa"],
  ["Max Planck", "Beasiswa"],
  ["Fullbright", "Beasiswa"],
  ["Graduate Scholarship", "Beasiswa"],
  ["Australian Goverment", "Beasiswa"],
  ["ANU reseach Scholarship", "Beasiswa"],
  ["Stipendium Hungaricum Scholarship", "Beasiswa"],
  ["Taiwan Scholarship", "Beasiswa"],
  ["NYMCTU Scholarship", "Beasiswa"],
  ["MEXT", "Beasiswa"],
  ["MOE Elite Scholarship", "Beasiswa"],
  ["Indonesia-Austria Scholarship", "Beasiswa"],
  ["Chinese Goverment Scholarship", "Beasiswa"],
  ["China Scolarship Council", "Beasiswa"],
  ["Japan Science and Technology - Spring", "Beasiswa"],
  ["Japanese Government Scholarship", "Beasiswa"],
  ["Saudi Arabia Scholarship", "Beasiswa"],
  ["NSTC Doctoral Fellowship", "Beasiswa"],

  ["menunggu SK BPDDI", "Belum jelas"],
  ["UM/mandiri", "Belum jelas"],
  ["Mandiri/mengajukan beasiswa UM", "Belum jelas"],
  ["PDDI dlm pengajuan /mandiri", "Belum jelas"],
  ["blm ada jawaban dr FIP", "Belum jelas"],
  ["DN", "Belum jelas"],
];

/** [tulisan di Data TB, nama kampus baku, negara] */
const KAMPUS: [string, string, string | null][] = [
  // Indonesia
  ["Universitas Negeri Malang", "Universitas Negeri Malang", "Indonesia"],
  ["Universitas Negri Malang", "Universitas Negeri Malang", "Indonesia"],
  ["Universitas Brawijaya Malang", "Universitas Brawijaya", "Indonesia"],
  ["Universtas Brawijaya Malang", "Universitas Brawijaya", "Indonesia"],
  ["Universitas Sebelas Maret", "Universitas Sebelas Maret", "Indonesia"],
  ["Universitas Airlangga", "Universitas Airlangga", "Indonesia"],
  ["Universitas Airlangga Surabaya", "Universitas Airlangga", "Indonesia"],
  ["Universitas Airlangga, Surabaya", "Universitas Airlangga", "Indonesia"],
  ["Universitas Airlangga dan Ghent University", "Universitas Airlangga", "Indonesia"],
  ["Universitas Negeri Surabaya", "Universitas Negeri Surabaya", "Indonesia"],
  ["Universitas Gadjah Mada", "Universitas Gadjah Mada", "Indonesia"],
  ["UGM", "Universitas Gadjah Mada", "Indonesia"],
  ["Universita Gadjah Mada Yogyakarta", "Universitas Gadjah Mada", "Indonesia"],
  ["Universitas Gadjah Mada Yogyakarta", "Universitas Gadjah Mada", "Indonesia"],
  ["Institut Teknologi Sepuluh Nopember Surabaya", "Institut Teknologi Sepuluh Nopember", "Indonesia"],
  ["Institut Teknologi Sepuluh Nopember", "Institut Teknologi Sepuluh Nopember", "Indonesia"],
  ["Universitas Negeri Semarang", "Universitas Negeri Semarang", "Indonesia"],
  ["Universitas Negeri Yogyakarta", "Universitas Negeri Yogyakarta", "Indonesia"],
  ["Universitas Pendidikan Indonesia", "Universitas Pendidikan Indonesia", "Indonesia"],
  ["UPI", "Universitas Pendidikan Indonesia", "Indonesia"],
  ["Universitas Pendidikan Indonesia, Bandung", "Universitas Pendidikan Indonesia", "Indonesia"],
  ["Universitas Pendidikan Indonesia Bandung", "Universitas Pendidikan Indonesia", "Indonesia"],
  ["Institut Seni Indonesia Bali", "Institut Seni Indonesia Denpasar", "Indonesia"],
  ["Institut Seni Indonesia Denpasar", "Institut Seni Indonesia Denpasar", "Indonesia"],
  ["ISI Denpasar", "Institut Seni Indonesia Denpasar", "Indonesia"],
  ["ISI Yogyakarta", "Institut Seni Indonesia Yogyakarta", "Indonesia"],
  ["Institut Seni Indonesia Yogyakarta", "Institut Seni Indonesia Yogyakarta", "Indonesia"],
  ["Universitas Indonesia", "Universitas Indonesia", "Indonesia"],
  ["Universitas Diponegoro Semarang", "Universitas Diponegoro", "Indonesia"],
  ["Universitas Udayana", "Universitas Udayana", "Indonesia"],
  ["Institut Pertanian Bogor", "Institut Pertanian Bogor", "Indonesia"],
  ["Universitas Negeri Jakarta", "Universitas Negeri Jakarta", "Indonesia"],
  ["Institut Teknologi Bandung", "Institut Teknologi Bandung", "Indonesia"],
  ["Universitas Padjajaran", "Universitas Padjadjaran", "Indonesia"],

  // Malaysia, Singapura, Thailand
  ["University Sains Malaysia", "Universiti Sains Malaysia", "Malaysia"],
  ["Universiti Sains Malaysia", "Universiti Sains Malaysia", "Malaysia"],
  ["Universiti Kebangsaan Malaysia", "Universiti Kebangsaan Malaysia", "Malaysia"],
  ["Universiti Teknikal Malaysia Melaka", "Universiti Teknikal Malaysia Melaka", "Malaysia"],
  ["Universiti Malaya", "Universiti Malaya", "Malaysia"],
  ["Universiti Teknologi Malaysia (UTM)", "Universiti Teknologi Malaysia", "Malaysia"],
  ["Nanyang Tecnological University, Singapore", "Nanyang Technological University", "Singapura"],
  ["Mahidol University, Thailand", "Mahidol University", "Thailand"],

  // Taiwan
  ["National Taiwan Normal University (NTNU)", "National Taiwan Normal University", "Taiwan"],
  ["National Taiwan University of Science and Technology (NTUST) Taiwan", "National Taiwan University of Science and Technology", "Taiwan"],
  ["Chung Yuan Christian University, Taiwan", "Chung Yuan Christian University", "Taiwan"],
  ["National Yang Ming Chiao Tung University, Taiwan", "National Yang Ming Chiao Tung University", "Taiwan"],
  ["National Tsing Hua University (NTHU)", "National Tsing Hua University", "Taiwan"],
  ["Yuan Ze University", "Yuan Ze University", "Taiwan"],

  // Jepang
  ["Osaka University, Japan", "Osaka University", "Jepang"],
  ["Osaka University", "Osaka University", "Jepang"],
  ["Graduate School of Engineering, Osaka University, Japan", "Osaka University", "Jepang"],
  ["Tohoku University, Japan", "Tohoku University", "Jepang"],
  ["Hiroshima University", "Hiroshima University", "Jepang"],
  ["University of Tsukuba", "University of Tsukuba", "Jepang"],

  // Tiongkok
  ["Sun Yat Sen University", "Sun Yat Sen University", "Tiongkok"],
  ["Guangxi Normal University", "Guangxi Normal University", "Tiongkok"],
  ["Yunnan Normal University", "Yunnan Normal University", "Tiongkok"],
  ["Shaanxi Normal University", "Shaanxi Normal University", "Tiongkok"],

  // Australia dan Selandia Baru
  ["The University of Auckland, New Zealand", "University of Auckland", "Selandia Baru"],
  ["University of Sydney, Australia", "University of Sydney", "Australia"],
  ["University of Adelaide, Australia", "University of Adelaide", "Australia"],
  ["Queensland University of Technology (QUT), Australia", "Queensland University of Technology", "Australia"],
  ["The University of Queensland", "University of Queensland", "Australia"],
  ["University of Queensland, Australia", "University of Queensland", "Australia"],
  ["The Australian national University", "Australian National University", "Australia"],

  // Britania Raya dan Irlandia
  ["University of Sheffield, Inggris", "University of Sheffield", "Britania Raya"],
  ["University of Leeds, United Kingdom", "University of Leeds", "Britania Raya"],
  ["University of Leeds", "University of Leeds", "Britania Raya"],
  ["The University of Edinburgh", "University of Edinburgh", "Britania Raya"],
  ["Universityu of Glasglow, Skotlandia", "University of Glasgow", "Britania Raya"],
  ["University of Warwick, United Kingdom", "University of Warwick", "Britania Raya"],
  ["Goldsmith College, University of London", "Goldsmiths, University of London", "Britania Raya"],
  ["Queen's University Belfast", "Queen's University Belfast", "Britania Raya"],
  ["University College Dublin", "University College Dublin", "Irlandia"],
  ["University of Galway, Ireland", "University of Galway", "Irlandia"],

  // Eropa daratan
  ["Katholieke Universiteit Leuven, Belgia", "KU Leuven", "Belgia"],
  ["KU Leuven", "KU Leuven", "Belgia"],
  ["Ghent University, Belgium", "Ghent University", "Belgia"],
  ["TU Dresden", "TU Dresden", "Jerman"],
  ["Technische Universitat Dresden", "TU Dresden", "Jerman"],
  ["Uttrech University, Netherland", "Utrecht University", "Belanda"],
  ["Utrecht University", "Utrecht University", "Belanda"],
  ["University of Groningen, Netherlands", "University of Groningen", "Belanda"],
  ["Wageningen University & Research, Netherlands", "Wageningen University & Research", "Belanda"],
  ["Universitat Fur Bodenkultur Wien (BOKU), Austria", "Universitat fur Bodenkultur Wien (BOKU)", "Austria"],
  ["Medical University of Vienna", "Medical University of Vienna", "Austria"],
  ["University of Pecs Hungaria", "University of Pecs", "Hungaria"],
  ["University of Helsinki, Finlandia", "University of Helsinki", "Finlandia"],
  ["University of Montpellier", "University of Montpellier", "Prancis"],
  ["Marmara University, Turkey", "Marmara University", "Turki"],
  ["National Research Tomsk State University, Russia", "National Research Tomsk State University", "Rusia"],

  // Amerika dan Timur Tengah
  ["Purdue University Graduate School, USA", "Purdue University", "Amerika Serikat"],
  ["The Ohio State University, USA", "Ohio State University", "Amerika Serikat"],
  ["Indian University Bloomington, US", "Indiana University Bloomington", "Amerika Serikat"],
  ["Pennsylvania State University, USA", "Pennsylvania State University", "Amerika Serikat"],
  ["Ummul Al Qura UniversityMakkah", "Umm Al-Qura University", "Arab Saudi"],

  // Negara belum diketahui dari tulisannya; isi lewat Pengaturan.
  ["University of Science and Technologi (UST)", "University of Science and Technology (UST)", null],
];

export const PEMBAKUAN_BAWAAN: BarisPembakuan[] = [
  ...BIAYA.map(([asli, baku]) => ({ jenis: "BIAYA", asli, baku, negara: null })),
  ...KAMPUS.map(([asli, baku, negara]) => ({ jenis: "KAMPUS", asli, baku, negara })),
];

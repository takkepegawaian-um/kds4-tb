import {
  AlertTriangle,
  FileUp,
  History,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type ItemMenu = { href: string; label: string; ikon: LucideIcon };
export type KelompokMenu = { judul: string; item: ItemMenu[] };

export const MENU: KelompokMenu[] = [
  {
    judul: "Pemantauan",
    item: [
      { href: "/", label: "Ringkasan", ikon: LayoutDashboard },
      { href: "/daftar-perhatian", label: "Daftar Perhatian", ikon: AlertTriangle },
    ],
  },
  {
    judul: "Data",
    item: [
      { href: "/data-tb", label: "Data TB", ikon: Users },
      { href: "/impor", label: "Impor dari Excel", ikon: FileUp },
    ],
  },
  {
    judul: "Admin",
    item: [
      { href: "/pengaturan", label: "Pengaturan", ikon: Settings },
      { href: "/log", label: "Log Aktivitas", ikon: History },
    ],
  },
];

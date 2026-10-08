import { describe, expect, it } from "vitest";
import { labelKolom, rentangWib, ringkasPerangkat } from "@/lib/data/log-label";

describe("log aktivitas", () => {
  it("rentang tanggal mengikuti WIB (UTC+7)", () => {
    const r = rentangWib("07/10/2026", "07/10/2026");
    expect(r.gte?.toISOString()).toBe("2026-10-06T17:00:00.000Z"); // 07/10/2026 00:00 WIB
    expect(r.lt?.toISOString()).toBe("2026-10-07T17:00:00.000Z"); // 08/10/2026 00:00 WIB
    expect(rentangWib("", "")).toEqual({});
    expect(rentangWib("bukan tanggal")).toEqual({});
    expect(rentangWib("2026-10-01").gte?.toISOString()).toBe("2026-09-30T17:00:00.000Z");
  });

  it("perangkat diringkas", () => {
    expect(ringkasPerangkat("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0")).toBe("Edge · Windows");
    expect(ringkasPerangkat("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36")).toBe("Chrome · Android");
    expect(ringkasPerangkat("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("Safari · iPhone/iPad");
    expect(ringkasPerangkat("terminal (scripts/admin.ts)")).toBe("Terminal server");
    expect(ringkasPerangkat(null)).toBe("–");
  });

  it("nama kolom Data TB memakai label form", () => {
    expect(labelKolom("statusSk")).toBe("Status SK");
    expect(labelKolom("presensiTbSd")).toBe("Ditandai TB s.d.");
    expect(labelKolom("kolomLain")).toBe("kolomLain");
  });
});

// Tes tanda tangan cookie sesi.
import { describe, expect, it } from "vitest";
import { bacaCookie, buatToken, hashToken, nilaiCookie } from "@/lib/auth/token";

const RAHASIA = "rahasia-uji-coba-yang-panjangnya-lebih-dari-32-karakter";

describe("cookie sesi", () => {
  const token = buatToken();
  const nanti = Date.now() + 60_000;

  it("cookie sah terbaca kembali", () => {
    expect(bacaCookie(nilaiCookie(token, nanti, RAHASIA), RAHASIA)).toEqual({ token, kedaluwarsa: nanti });
  });

  it("cookie yang diubah sedikit saja ditolak", () => {
    const c = nilaiCookie(token, nanti, RAHASIA);
    expect(bacaCookie(c.slice(0, -1) + (c.endsWith("A") ? "B" : "A"), RAHASIA)).toBeNull();
    // memperpanjang masa berlaku sendiri tidak bisa
    const [t, , ttd] = c.split(".");
    expect(bacaCookie(`${t}.${nanti + 999_999}.${ttd}`, RAHASIA)).toBeNull();
  });

  it("cookie dengan rahasia lain ditolak", () => {
    expect(bacaCookie(nilaiCookie(token, nanti, RAHASIA), RAHASIA + "x")).toBeNull();
  });

  it("cookie kedaluwarsa ditolak", () => {
    expect(bacaCookie(nilaiCookie(token, Date.now() - 1, RAHASIA), RAHASIA)).toBeNull();
  });

  it("isian kosong atau rusak ditolak", () => {
    for (const x of [undefined, "", "abc", "a.b", "a.b.c.d"]) expect(bacaCookie(x, RAHASIA)).toBeNull();
  });

  it("token acak dan yang disimpan di database hanya hash-nya", () => {
    expect(buatToken()).not.toBe(buatToken());
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(token)).not.toContain(token);
  });
});

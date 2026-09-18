import { describe, expect, it } from "vitest";
import { securityHeaders } from "@/lib/security/headers";
import robots from "@/app/robots";
import { GET as healthGET } from "@/app/api/health/route";

describe("Vercel production hardening", () => {
  it("sets the baseline anti-clickjacking and MIME headers", () => {
    const headers = new Map(securityHeaders.map((item) => [item.key, item.value]));
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("keeps the application out of search indexes", () => {
    const result = robots();
    expect(result.rules).toEqual({
      userAgent: "*",
      disallow: "/",
    });
  });

  it("exposes a non-cacheable health response", async () => {
    const response = await healthGET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "pallet-recovery-control",
    });
  });
});

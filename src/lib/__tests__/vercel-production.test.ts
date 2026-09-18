import { describe, expect, it } from "vitest";
import { securityHeaders } from "@/lib/security/headers";
import robots from "@/app/robots";
import { GET as healthGET } from "@/app/api/health/route";

describe("Vercel production hardening", () => {
  it("sets baseline browser and indexing protection headers", () => {
    const headers = new Map(securityHeaders.map((item) => [item.key, item.value]));
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Robots-Tag")).toContain("noindex");
  });

  it("keeps the application out of search indexes", () => {
    const result = robots();
    expect(result.rules).toEqual({
      userAgent: "*",
      disallow: "/",
    });
  });

  it("exposes a non-cacheable health response", async () => {
    const previousRegion = process.env.VERCEL_REGION;
    process.env.VERCEL_REGION = "cdg1";

    const response = await healthGET();

    if (previousRegion === undefined) delete process.env.VERCEL_REGION;
    else process.env.VERCEL_REGION = previousRegion;

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "pallet-recovery-control",
      region: "cdg1",
    });
  });
});

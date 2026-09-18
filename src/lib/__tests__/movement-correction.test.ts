import { describe, expect, it } from "vitest";
import { oppositeDirection } from "@/lib/movements/correction";

describe("oppositeDirection", () => {
  it("flips inbound to outbound", () => {
    expect(oppositeDirection("inbound")).toBe("outbound");
  });

  it("flips outbound to inbound", () => {
    expect(oppositeDirection("outbound")).toBe("inbound");
  });
});

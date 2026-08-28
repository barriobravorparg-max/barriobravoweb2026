import { describe, expect, it } from "vitest";
import { getActiveVipTier, type PurchaseRow } from "./active-tier";

const future = new Date(Date.now() + 10_000).toISOString();
const past = new Date(Date.now() - 10_000).toISOString();

describe("getActiveVipTier", () => {
  it("returns null when there are no VIP purchases", () => {
    expect(getActiveVipTier([])).toBeNull();
  });

  it("returns null when the only VIP purchase is expired", () => {
    const purchases: PurchaseRow[] = [{ item_type: "vip", item_key: "oro", expires_at: past }];
    expect(getActiveVipTier(purchases)).toBeNull();
  });

  it("ignores vehicle purchases", () => {
    const purchases: PurchaseRow[] = [{ item_type: "vehicle", item_key: "moto", expires_at: null }];
    expect(getActiveVipTier(purchases)).toBeNull();
  });

  it("returns the tier of a single active VIP purchase", () => {
    const purchases: PurchaseRow[] = [{ item_type: "vip", item_key: "plata", expires_at: future }];
    expect(getActiveVipTier(purchases)).toBe("plata");
  });

  it("returns the highest tier among multiple active VIP purchases", () => {
    const purchases: PurchaseRow[] = [
      { item_type: "vip", item_key: "bronce", expires_at: future },
      { item_type: "vip", item_key: "oro", expires_at: future },
      { item_type: "vip", item_key: "plata", expires_at: past },
    ];
    expect(getActiveVipTier(purchases)).toBe("oro");
  });
});

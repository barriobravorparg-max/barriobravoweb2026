import { describe, expect, it } from "vitest";
import { findCatalogItem } from "./catalog";

describe("findCatalogItem", () => {
  it("finds a VIP tier by key", () => {
    expect(findCatalogItem("vip", "plata")).toEqual({ label: "VIP Plata", priceArs: 7000 });
  });

  it("finds a vehicle by key", () => {
    expect(findCatalogItem("vehicle", "auto")).toEqual({ label: "Auto de lujo vanilla", priceArs: 8000 });
  });

  it("returns null for an unknown VIP key", () => {
    expect(findCatalogItem("vip", "platino")).toBeNull();
  });

  it("returns null for an unknown vehicle key", () => {
    expect(findCatalogItem("vehicle", "avion")).toBeNull();
  });
});

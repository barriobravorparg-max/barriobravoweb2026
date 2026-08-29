import { describe, expect, it } from "vitest";
import { findLeaseSlot, getLeasePrice, PERIOD_DAYS } from "./catalog";

describe("findLeaseSlot", () => {
  it("finds a banda by key", () => {
    expect(findLeaseSlot("families")?.label).toBe("Families");
  });

  it("finds a negocio by key", () => {
    const slot = findLeaseSlot("casino");
    expect(slot?.label).toBe("Casino");
    expect(slot?.jobName).toBe("casino");
    expect(slot?.jobBossGrade).toBe(4);
  });

  it("finds a propiedad by key", () => {
    expect(findLeaseSlot("casa_premium")?.label).toBe("Casa premium");
  });

  it("returns null for an unknown slot key", () => {
    expect(findLeaseSlot("no-existe")).toBeNull();
  });
});

describe("getLeasePrice", () => {
  it("returns the monthly price for a banda", () => {
    const slot = findLeaseSlot("ballas")!;
    expect(getLeasePrice(slot, "mensual")).toBe(30000);
  });

  it("returns the semestral price for a negocio", () => {
    const slot = findLeaseSlot("vanilla_unicorn")!;
    expect(getLeasePrice(slot, "semestral")).toBe(170000);
  });

  it("returns null for semestral on a propiedad (not offered)", () => {
    const slot = findLeaseSlot("casa_chica")!;
    expect(getLeasePrice(slot, "semestral")).toBeNull();
  });
});

describe("PERIOD_DAYS", () => {
  it("maps mensual to 30 days and semestral to 180", () => {
    expect(PERIOD_DAYS.mensual).toBe(30);
    expect(PERIOD_DAYS.semestral).toBe(180);
  });
});

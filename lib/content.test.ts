import { describe, expect, it } from "vitest";
import { facciones, faq, navLinks, reglas } from "./content";

describe("content.ts", () => {
  it("has exactly the four facción categories from the brief", () => {
    const categories = facciones.map((f) => f.category);
    expect(categories).toEqual(["Servicios de Emergencia", "Civil", "Criminal", "Negocios"]);
  });

  it("every facción has at least one job", () => {
    for (const f of facciones) expect(f.jobs.length).toBeGreaterThan(0);
  });

  it("has at least 5 FAQ entries", () => {
    expect(faq.length).toBeGreaterThanOrEqual(5);
  });

  it("nav links point to in-page anchors", () => {
    for (const link of navLinks) expect(link.href.startsWith("#")).toBe(true);
  });

  it("every regla has a valid severity level", () => {
    for (const r of reglas) expect(["Leve", "Grave", "Muy grave"]).toContain(r.severity);
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const selectResult: { data: unknown[]; error: { message: string } | null } = { data: [], error: null };

const eqMock = vi.fn(() => Promise.resolve(selectResult));
const selectMock = vi.fn(() => ({ eq: eqMock }));

const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

import { GET } from "./route";

function makeRequest(discordId: string | null, secret: string | null) {
  const url = discordId
    ? `http://localhost/api/fivem/negocio-status?discordId=${discordId}`
    : "http://localhost/api/fivem/negocio-status";
  const headers = new Headers();
  if (secret) headers.set("x-fivem-secret", secret);
  return new NextRequest(url, { headers });
}

describe("GET /api/fivem/negocio-status", () => {
  beforeEach(() => {
    process.env.FIVEM_BRIDGE_SECRET = "bridge-secret";
    selectResult.data = [];
    selectResult.error = null;
  });

  it("rejects requests without the correct shared secret", async () => {
    const res = await GET(makeRequest("d1", "wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("requires a discordId query param", async () => {
    const res = await GET(makeRequest(null, "bridge-secret"));
    expect(res.status).toBe(400);
  });

  it("returns an empty activeNegocioJobs when there are no active negocio leases", async () => {
    selectResult.data = [];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([]);
  });

  it("returns the job name and boss grade for an active negocio lease", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    selectResult.data = [{ id: "l1", slot_key: "casino", expires_at: future, slots: { current_lease_id: "l1" } }];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([{ jobName: "casino", bossGrade: 4 }]);
  });

  it("ignores an expired negocio lease", async () => {
    const past = new Date(Date.now() - 10_000).toISOString();
    selectResult.data = [{ id: "l1", slot_key: "casino", expires_at: past, slots: { current_lease_id: "l1" } }];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([]);
  });

  it("ignores banda/propiedad leases entirely", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    selectResult.data = [{ id: "l1", slot_key: "families", expires_at: future, slots: { current_lease_id: "l1" } }];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([]);
  });

  it("returns one entry per active negocio lease when a discord_id holds more than one", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    selectResult.data = [
      { id: "l1", slot_key: "casino", expires_at: future, slots: { current_lease_id: "l1" } },
      { id: "l2", slot_key: "taller_bennys", expires_at: future, slots: { current_lease_id: "l2" } },
    ];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([
      { jobName: "casino", bossGrade: 4 },
      { jobName: "bennys", bossGrade: 4 },
    ]);
  });

  it("ignores a race-condition loser's lease — a future expires_at that does not actually hold the slot", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    // Este lease (l1) perdió la condición de carrera: claim_slot igual le
    // inserta una fila con expires_at futuro (para auditoría/reembolso),
    // pero el slot lo tiene otro lease (l2) — current_lease_id no es l1.
    selectResult.data = [{ id: "l1", slot_key: "casino", expires_at: future, slots: { current_lease_id: "l2" } }];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([]);
  });

  it("handles the embedded slots relationship coming back as a one-element array", async () => {
    const future = new Date(Date.now() + 10_000).toISOString();
    selectResult.data = [{ id: "l1", slot_key: "casino", expires_at: future, slots: [{ current_lease_id: "l1" }] }];
    const res = await GET(makeRequest("d1", "bridge-secret"));
    const json = await res.json();
    expect(json.activeNegocioJobs).toEqual([{ jobName: "casino", bossGrade: 4 }]);
  });
});

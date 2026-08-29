import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const selectResult: { data: unknown[]; error: { message: string } | null } = { data: [], error: null };
const slotSelectResult: { data: { current_lease_id: string } | null; error: { message: string } | null } = {
  data: null,
  error: null,
};

const leasesLtMock = vi.fn(() => Promise.resolve(selectResult));
const leasesIsMock = vi.fn(() => ({ lt: leasesLtMock }));
const leasesSelectMock = vi.fn(() => ({ is: leasesIsMock }));

const leasesUpdateEqMock = vi.fn(() => Promise.resolve({ error: null }));
const leasesUpdateMock = vi.fn(() => ({ eq: leasesUpdateEqMock }));

const slotMaybeSingleMock = vi.fn(() => Promise.resolve(slotSelectResult));
const slotEqForSelectMock = vi.fn(() => ({ maybeSingle: slotMaybeSingleMock }));
const slotSelectMock = vi.fn(() => ({ eq: slotEqForSelectMock }));

const slotUpdateEqMock = vi.fn(() => Promise.resolve({ error: null }));
const slotUpdateMock = vi.fn(() => ({ eq: slotUpdateEqMock }));

const fromMock = vi.fn((table: string) => {
  if (table === "leases") return { select: leasesSelectMock, update: leasesUpdateMock };
  return { select: slotSelectMock, update: slotUpdateMock };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));

const notifyStaffChannelMock = vi.fn();
vi.mock("@/lib/discord/notify", () => ({
  notifyStaffChannel: (content: string) => notifyStaffChannelMock(content),
}));

import { GET } from "./route";

function makeRequest(authHeader: string | null) {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new NextRequest("http://localhost/api/cron/expire-leases", { headers });
}

describe("GET /api/cron/expire-leases", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "cron-secret";
    selectResult.data = [];
    selectResult.error = null;
    slotSelectResult.data = null;
    slotSelectResult.error = null;
    notifyStaffChannelMock.mockReset();
    notifyStaffChannelMock.mockResolvedValue(undefined);
    leasesUpdateMock.mockClear();
    leasesUpdateEqMock.mockClear();
    slotUpdateMock.mockClear();
    slotUpdateEqMock.mockClear();
  });

  it("rejects requests without the correct bearer token", async () => {
    const res = await GET(makeRequest("Bearer wrong"));
    expect(res.status).toBe(401);
  });

  it("does nothing when there are no expired leases", async () => {
    selectResult.data = [];
    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();
    expect(json).toEqual({ released: 0 });
  });

  it("frees the slot and notifies staff for an expired banda lease that is still the current lease", async () => {
    selectResult.data = [{ id: "lease-1", slot_key: "families", discord_id: "d1" }];
    slotSelectResult.data = { current_lease_id: "lease-1" };

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(slotUpdateMock).toHaveBeenCalledWith({ occupied_until: null, current_lease_id: null });
    expect(notifyStaffChannelMock).toHaveBeenCalledWith(expect.stringContaining("Families"));
    expect(leasesUpdateMock).toHaveBeenCalledWith({ job_or_property_revoked_at: expect.any(String) });
    expect(json).toEqual({ released: 1 });
  });

  it("does not free the slot when a newer lease already replaced it (renewal already claimed the slot)", async () => {
    selectResult.data = [{ id: "lease-1", slot_key: "families", discord_id: "d1" }];
    slotSelectResult.data = { current_lease_id: "lease-2" };

    const res = await GET(makeRequest("Bearer cron-secret"));
    const json = await res.json();

    expect(slotUpdateMock).not.toHaveBeenCalled();
    expect(json).toEqual({ released: 1 });
  });

  it("does not notify staff for an expired negocio lease (automatic delivery handles it)", async () => {
    selectResult.data = [{ id: "lease-1", slot_key: "casino", discord_id: "d1" }];
    slotSelectResult.data = { current_lease_id: "lease-1" };

    await GET(makeRequest("Bearer cron-secret"));

    expect(notifyStaffChannelMock).not.toHaveBeenCalled();
  });
});

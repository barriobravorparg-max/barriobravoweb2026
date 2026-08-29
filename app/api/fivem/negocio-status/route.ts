import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { negocios } from "@/lib/content";

// PostgREST embeds a to-one relationship (the FK column, leases.slot_key,
// lives on the table we're selecting FROM here) as a single object — but
// the exact shape can vary by client/config, so handle both a bare object
// and a one-element array defensively rather than assuming one.
type SlotEmbed = { current_lease_id: string | null } | { current_lease_id: string | null }[] | null;

function currentLeaseIdOfSlot(slots: SlotEmbed): string | null {
  if (!slots) return null;
  const slot = Array.isArray(slots) ? slots[0] : slots;
  return slot?.current_lease_id ?? null;
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-fivem-secret");
  if (!secret || secret !== process.env.FIVEM_BRIDGE_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const discordId = request.nextUrl.searchParams.get("discordId");
  if (!discordId) {
    return NextResponse.json({ error: "Falta discordId" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: leases, error } = await admin
    .from("leases")
    .select("id, slot_key, expires_at, slots(current_lease_id)")
    .eq("discord_id", discordId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = leases ?? [];
  const now = Date.now();
  const negocioBySlotKey = new Map(negocios.map((n) => [n.slotKey, n]));

  const activeNegocioJobs = rows
    .filter((l) => negocioBySlotKey.has(l.slot_key) && l.expires_at !== null && new Date(l.expires_at).getTime() > now)
    .filter((l) => currentLeaseIdOfSlot(l.slots) === l.id)
    .map((l) => negocioBySlotKey.get(l.slot_key)!)
    .map((n) => ({ jobName: n.jobName as string, bossGrade: n.jobBossGrade as number }));

  return NextResponse.json({ activeNegocioJobs });
}

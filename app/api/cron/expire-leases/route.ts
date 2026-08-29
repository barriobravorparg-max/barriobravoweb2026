import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findLeaseSlot } from "@/lib/leases/catalog";
import { notifyStaffChannel } from "@/lib/discord/notify";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: expired, error } = await admin
    .from("leases")
    .select("id, slot_key, discord_id")
    .is("job_or_property_revoked_at", null)
    .lt("expires_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let released = 0;
  for (const lease of expired ?? []) {
    try {
      const slot = findLeaseSlot(lease.slot_key);

      const { data: slotRow, error: slotError } = await admin
        .from("slots")
        .select("current_lease_id")
        .eq("slot_key", lease.slot_key)
        .maybeSingle();

      if (slotError) {
        console.error("[cron/expire-leases] Error leyendo el slot", { leaseId: lease.id, error: slotError });
        continue;
      }

      if (slotRow?.current_lease_id === lease.id) {
        const { error: freeError } = await admin
          .from("slots")
          .update({ occupied_until: null, current_lease_id: null })
          .eq("slot_key", lease.slot_key);

        if (freeError) {
          console.error("[cron/expire-leases] Error liberando el slot", { leaseId: lease.id, error: freeError });
          continue;
        }
      }

      if (slot && (slot.slotType === "banda" || slot.slotType === "propiedad")) {
        const action = slot.slotType === "banda" ? "sacarle el liderazgo en /crimeadmin" : "revocar el acceso a la propiedad";
        try {
          await notifyStaffChannel(`⏰ Venció el arrendamiento de "${slot.label}" — hay que ${action}. Discord: <@${lease.discord_id}>.`);
        } catch (notifyError) {
          console.error("[cron/expire-leases] Falló notifyStaffChannel", { leaseId: lease.id, error: notifyError });
        }
      }

      const { error: updateError } = await admin
        .from("leases")
        .update({ job_or_property_revoked_at: new Date().toISOString() })
        .eq("id", lease.id);

      if (updateError) {
        console.error("[cron/expire-leases] Error marcando el lease como procesado", { leaseId: lease.id, error: updateError });
        continue;
      }

      released += 1;
    } catch (err) {
      console.error("[cron/expire-leases] Error procesando un lease vencido", { leaseId: lease.id, error: err });
    }
  }

  return NextResponse.json({ released });
}

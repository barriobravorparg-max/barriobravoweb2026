import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revokeDiscordRole } from "@/lib/discord/roles";
import { getVipRoleId } from "@/lib/discord/role-map";
import type { VipTier } from "@/lib/content";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: expired, error } = await admin
    .from("purchases")
    .select("id, discord_id, item_key")
    .eq("item_type", "vip")
    .is("discord_role_revoked_at", null)
    .lt("expires_at", new Date().toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let revoked = 0;
  for (const purchase of expired ?? []) {
    try {
      const roleId = getVipRoleId(purchase.item_key as VipTier);
      if (!roleId) {
        // Sin rol configurado para este tier: no hay nada que revocar todavía.
        // No marcamos discord_role_revoked_at para que, una vez que se configure
        // la variable DISCORD_ROLE_VIP_* correspondiente, la próxima corrida del
        // cron encuentre esta fila de nuevo y sí revoque el rol.
        console.warn("[cron/expire-vips] No hay rol de Discord configurado para el tier", {
          purchaseId: purchase.id,
          discordId: purchase.discord_id,
          itemKey: purchase.item_key,
        });
        continue;
      }

      // Si el mismo discord_id ya renovó este mismo tier (otra fila del mismo
      // item_key todavía activa), no hay que revocar el rol: solo cerramos esta
      // fila vencida como procesada.
      const { data: activeRenewal, error: renewalError } = await admin
        .from("purchases")
        .select("id")
        .eq("discord_id", purchase.discord_id)
        .eq("item_type", "vip")
        .eq("item_key", purchase.item_key)
        .neq("id", purchase.id)
        .gt("expires_at", new Date().toISOString())
        .limit(1);

      if (renewalError) {
        console.error("Error checking for an active renewal of the same VIP tier", {
          purchaseId: purchase.id,
          discordId: purchase.discord_id,
          itemKey: purchase.item_key,
          error: renewalError,
        });
        continue;
      }

      const hasActiveRenewal = (activeRenewal ?? []).length > 0;
      if (!hasActiveRenewal) {
        await revokeDiscordRole(purchase.discord_id, roleId);
      }

      const { error: updateError } = await admin
        .from("purchases")
        .update({ discord_role_revoked_at: new Date().toISOString() })
        .eq("id", purchase.id);

      if (updateError) {
        console.error("Error marking VIP purchase as processed", {
          purchaseId: purchase.id,
          discordId: purchase.discord_id,
          itemKey: purchase.item_key,
          error: updateError,
        });
        continue;
      }

      revoked += 1;
    } catch (err) {
      console.error("Error revoking expired VIP Discord role", {
        purchaseId: purchase.id,
        discordId: purchase.discord_id,
        itemKey: purchase.item_key,
        error: err,
      });
    }
  }

  return NextResponse.json({ revoked });
}

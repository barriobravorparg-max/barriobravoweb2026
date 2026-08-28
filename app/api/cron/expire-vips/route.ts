import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revokeDiscordRole } from "@/lib/discord/roles";
import { getVipRoleId } from "@/lib/discord/role-map";
import type { VipTier } from "@/lib/content";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
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
      if (roleId) {
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

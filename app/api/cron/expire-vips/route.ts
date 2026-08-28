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
    const roleId = getVipRoleId(purchase.item_key as VipTier);
    if (roleId) {
      await revokeDiscordRole(purchase.discord_id, roleId);
    }
    await admin.from("purchases").update({ discord_role_revoked_at: new Date().toISOString() }).eq("id", purchase.id);
    revoked += 1;
  }

  return NextResponse.json({ revoked });
}

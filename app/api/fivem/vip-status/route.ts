import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { VipTier } from "@/lib/content";

const TIER_RANK: Record<VipTier, number> = { bronce: 1, plata: 2, oro: 3 };

function isVipTier(key: string): key is VipTier {
  return key in TIER_RANK;
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
  const { data: purchases, error } = await admin
    .from("purchases")
    .select("id, item_type, item_key, expires_at, delivered_at")
    .eq("discord_id", discordId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = purchases ?? [];
  const now = Date.now();

  const activeTiers = rows
    .filter((p) => p.item_type === "vip" && p.expires_at !== null && new Date(p.expires_at).getTime() > now)
    .map((p) => p.item_key)
    .filter(isVipTier);

  const tier = activeTiers.length > 0 ? activeTiers.reduce((best, key) => (TIER_RANK[key] > TIER_RANK[best] ? key : best)) : null;

  const expiresAt = tier
    ? rows
        .filter((p) => p.item_type === "vip" && p.item_key === tier)
        .map((p) => p.expires_at as string)
        .sort()
        .reverse()[0] ?? null
    : null;

  const pendingIds = rows.filter((p) => !p.delivered_at).map((p) => p.id);

  let pendingDeliveries: { id: string; itemType: string; itemKey: string }[] = [];
  if (pendingIds.length > 0) {
    const { data: delivered } = await admin
      .from("purchases")
      .update({ delivered_at: new Date().toISOString() })
      .in("id", pendingIds)
      .is("delivered_at", null)
      .select("id, item_type, item_key");

    pendingDeliveries = (delivered ?? []).map((p) => ({ id: p.id, itemType: p.item_type, itemKey: p.item_key }));
  }

  return NextResponse.json({ tier, expiresAt, pendingDeliveries });
}

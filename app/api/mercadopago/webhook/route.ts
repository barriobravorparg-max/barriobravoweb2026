import { NextResponse, type NextRequest } from "next/server";
import { getPayment } from "@/lib/mercadopago/payment";
import { findCatalogItem } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantDiscordRole } from "@/lib/discord/roles";
import { getVipRoleId } from "@/lib/discord/role-map";
import type { ItemType, VipTier } from "@/lib/content";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const paymentId = body?.data?.id as string | undefined;

  if (!paymentId) {
    return NextResponse.json({ ok: true });
  }

  const payment = await getPayment(paymentId);
  if (payment.status !== "approved") {
    return NextResponse.json({ ok: true });
  }

  const metadata = payment.metadata;
  const userId = metadata.user_id as string | undefined;
  const discordId = metadata.discord_id as string | undefined;
  const itemType = metadata.item_type as ItemType | undefined;
  const itemKey = metadata.item_key as string | undefined;

  if (!userId || !discordId || !itemType || !itemKey) {
    return NextResponse.json({ ok: true });
  }

  const item = findCatalogItem(itemType, itemKey);
  if (!item) {
    return NextResponse.json({ ok: true });
  }

  const expiresAt = itemType === "vip" ? new Date(Date.now() + THIRTY_DAYS_MS).toISOString() : null;

  const admin = createAdminClient();
  const { error } = await admin.from("purchases").insert({
    user_id: userId,
    discord_id: discordId,
    item_type: itemType,
    item_key: itemKey,
    mp_payment_id: String(payment.id),
    amount_ars: item.priceArs,
    expires_at: expiresAt,
  });

  if (error) {
    if (error.code === "23505") {
      // mp_payment_id repetido: ya lo procesamos antes, no hacer nada más.
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (itemType === "vip") {
    const roleId = getVipRoleId(itemKey as VipTier);
    if (roleId) {
      await grantDiscordRole(discordId, roleId);
    }
  }

  return NextResponse.json({ ok: true });
}

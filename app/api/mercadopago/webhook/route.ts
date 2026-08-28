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

  if (body?.type && body.type !== "payment") {
    // Mercado Pago manda otros tipos de notificación (merchant_order, etc.) al
    // mismo notification_url. getPayment solo sabe resolver IDs de pago, así
    // que tirar cualquier otro tipo ahí rompería con un 500 sin capturar y MP
    // reintentaría para siempre.
    return NextResponse.json({ ok: true });
  }

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
      try {
        await grantDiscordRole(discordId, roleId);
      } catch (grantError) {
        // La compra ya quedó registrada (fila válida en `purchases`); un fallo acá
        // no debe tirar abajo el webhook ni gatillar un reintento de Mercado Pago,
        // porque el reintento pegaría contra el 23505 de arriba y jamás volvería
        // a intentar otorgar el rol. Queda como intervención manual del operador.
        console.error("[mercadopago/webhook] Falló grantDiscordRole", {
          discordId,
          roleId,
          itemKey,
          mpPaymentId: String(payment.id),
          error: grantError,
        });
      }
    } else {
      console.warn("[mercadopago/webhook] No hay rol de Discord configurado para el tier", {
        discordId,
        itemKey,
        mpPaymentId: String(payment.id),
      });
    }
  }

  return NextResponse.json({ ok: true });
}

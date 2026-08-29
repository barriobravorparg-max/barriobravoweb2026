import { NextResponse, type NextRequest } from "next/server";
import { getPayment } from "@/lib/mercadopago/payment";
import { findLeaseSlot, getLeasePrice, PERIOD_DAYS } from "@/lib/leases/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaffChannel } from "@/lib/discord/notify";
import type { Period } from "@/lib/content";

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
  const slotKey = metadata.slot_key as string | undefined;
  const period = metadata.period as Period | undefined;

  if (!userId || !discordId || !slotKey || !period) {
    return NextResponse.json({ ok: true });
  }

  const slot = findLeaseSlot(slotKey);
  if (!slot) {
    return NextResponse.json({ ok: true });
  }

  const price = getLeasePrice(slot, period);
  if (price === null) {
    return NextResponse.json({ ok: true });
  }

  const expiresAt = new Date(Date.now() + PERIOD_DAYS[period] * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("claim_slot", {
    p_slot_key: slotKey,
    p_user_id: userId,
    p_discord_id: discordId,
    p_period: period,
    p_mp_payment_id: String(payment.id),
    p_amount_ars: price,
    p_expires_at: expiresAt,
  });

  if (error) {
    if (error.code === "23505") {
      // mp_payment_id repetido: ya lo procesamos antes, no hacer nada más.
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const result = (data ?? [])[0] as { claimed: boolean; lease_id: string } | undefined;

  if (!result?.claimed) {
    // Condición de carrera: dos pagos casi simultáneos por el mismo slot y
    // este llegó segundo. El pago ya está aprobado en Mercado Pago, así que
    // acá no hay nada que "reintentar" — hace falta que un humano lo revise
    // y, probablemente, reembolse.
    console.error("[webhook-leases] Slot ya ocupado al confirmar el pago — revisar a mano", {
      slotKey,
      discordId,
      mpPaymentId: String(payment.id),
    });
    try {
      await notifyStaffChannel(
        `⚠️ Pago de "${slot.label}" confirmado pero el slot ya estaba ocupado (condición de carrera). Revisar manualmente — posible reembolso. Discord: <@${discordId}>, pago: ${payment.id}.`
      );
    } catch (notifyError) {
      console.error("[webhook-leases] Falló notifyStaffChannel (condición de carrera)", notifyError);
    }
    return NextResponse.json({ ok: true });
  }

  if (slot.slotType === "banda" || slot.slotType === "propiedad") {
    // Los negocios se entregan solos (job de FiveM); bandas y propiedades
    // necesitan que un staffer haga algo a mano en el juego.
    const action = slot.slotType === "banda" ? "asignarle el liderazgo en /crimeadmin" : "crear/transferir la propiedad en el juego";
    try {
      await notifyStaffChannel(
        `✅ Nueva compra de "${slot.label}" — hay que ${action}. Discord: <@${discordId}>, vence: ${expiresAt}.`
      );
    } catch (notifyError) {
      console.error("[webhook-leases] Falló notifyStaffChannel", notifyError);
    }
  }

  return NextResponse.json({ ok: true });
}

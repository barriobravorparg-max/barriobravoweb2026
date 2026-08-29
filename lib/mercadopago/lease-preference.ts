import { Preference } from "mercadopago";
import { getMercadoPagoClient } from "./client";
import { SITE_URL } from "@/lib/site";
import type { Period } from "@/lib/content";

export interface CreateLeasePreferenceInput {
  userId: string;
  discordId: string;
  slotKey: string;
  period: Period;
  label: string;
  priceArs: number;
}

export async function createLeasePreference(input: CreateLeasePreferenceInput): Promise<string> {
  const preference = new Preference(getMercadoPagoClient());

  const result = await preference.create({
    body: {
      items: [
        {
          id: input.slotKey,
          title: `${input.label} (${input.period})`,
          quantity: 1,
          unit_price: input.priceArs,
          currency_id: "ARS",
        },
      ],
      metadata: {
        user_id: input.userId,
        discord_id: input.discordId,
        slot_key: input.slotKey,
        period: input.period,
      },
      back_urls: {
        success: `${SITE_URL}/mi-cuenta?lease=success`,
        failure: `${SITE_URL}/mi-cuenta?lease=failure`,
        pending: `${SITE_URL}/mi-cuenta?lease=pending`,
      },
      notification_url: `${SITE_URL}/api/mercadopago/webhook-leases`,
    },
  });

  if (!result.init_point) {
    throw new Error("Mercado Pago no devolvió una URL de checkout");
  }

  return result.init_point;
}

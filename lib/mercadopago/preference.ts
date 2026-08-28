import { Preference } from "mercadopago";
import { getMercadoPagoClient } from "./client";
import { SITE_URL } from "@/lib/site";
import type { ItemType } from "@/lib/content";

export interface CreatePreferenceInput {
  userId: string;
  discordId: string;
  itemType: ItemType;
  itemKey: string;
  label: string;
  priceArs: number;
}

export async function createPreference(input: CreatePreferenceInput): Promise<string> {
  const preference = new Preference(getMercadoPagoClient());

  const result = await preference.create({
    body: {
      items: [
        {
          id: input.itemKey,
          title: input.label,
          quantity: 1,
          unit_price: input.priceArs,
          currency_id: "ARS",
        },
      ],
      metadata: {
        user_id: input.userId,
        discord_id: input.discordId,
        item_type: input.itemType,
        item_key: input.itemKey,
      },
      back_urls: {
        success: `${SITE_URL}/mi-cuenta?purchase=success`,
        failure: `${SITE_URL}/mi-cuenta?purchase=failure`,
        pending: `${SITE_URL}/mi-cuenta?purchase=pending`,
      },
      notification_url: `${SITE_URL}/api/mercadopago/webhook`,
    },
  });

  if (!result.init_point) {
    throw new Error("Mercado Pago no devolvió una URL de checkout");
  }

  return result.init_point;
}

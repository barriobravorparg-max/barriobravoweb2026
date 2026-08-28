import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDiscordId } from "@/lib/supabase/user";
import { findCatalogItem } from "@/lib/catalog";
import { createPreference } from "@/lib/mercadopago/preference";
import type { ItemType } from "@/lib/content";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const discordId = getDiscordId(user);
  if (!discordId) {
    return NextResponse.json({ error: "No se encontró el Discord ID de la cuenta" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const itemType = body?.itemType as ItemType | undefined;
  const itemKey = body?.itemKey as string | undefined;

  if ((itemType !== "vip" && itemType !== "vehicle") || !itemKey) {
    return NextResponse.json({ error: "itemType o itemKey inválido" }, { status: 400 });
  }

  const item = findCatalogItem(itemType, itemKey);
  if (!item) {
    return NextResponse.json({ error: "Ítem no encontrado en el catálogo" }, { status: 404 });
  }

  const checkoutUrl = await createPreference({
    userId: user.id,
    discordId,
    itemType,
    itemKey,
    label: item.label,
    priceArs: item.priceArs,
  });

  return NextResponse.json({ checkoutUrl });
}

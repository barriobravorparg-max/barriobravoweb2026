import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDiscordId } from "@/lib/supabase/user";
import { findLeaseSlot, getLeasePrice } from "@/lib/leases/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLeasePreference } from "@/lib/mercadopago/lease-preference";
import type { Period } from "@/lib/content";

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
  const slotKey = body?.slotKey as string | undefined;
  const period = body?.period as Period | undefined;

  if (!slotKey || (period !== "mensual" && period !== "semestral")) {
    return NextResponse.json({ error: "slotKey o period inválido" }, { status: 400 });
  }

  const slot = findLeaseSlot(slotKey);
  if (!slot) {
    return NextResponse.json({ error: "Slot no encontrado" }, { status: 404 });
  }

  const price = getLeasePrice(slot, period);
  if (price === null) {
    return NextResponse.json({ error: "Ese período no está disponible para este ítem" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: slotRow, error } = await admin.from("slots").select("occupied_until").eq("slot_key", slotKey).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const occupiedUntilMs = slotRow?.occupied_until ? new Date(slotRow.occupied_until).getTime() : 0;
  if (occupiedUntilMs > Date.now()) {
    return NextResponse.json({ error: "Ese slot ya está ocupado" }, { status: 409 });
  }

  const checkoutUrl = await createLeasePreference({
    userId: user.id,
    discordId,
    slotKey,
    period,
    label: slot.label,
    priceArs: price,
  });

  return NextResponse.json({ checkoutUrl });
}

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDiscordId } from "@/lib/supabase/user";
import { findLeaseSlot, getLeasePrice } from "@/lib/leases/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLeasePreference } from "@/lib/mercadopago/lease-preference";
import { negocios, type Period } from "@/lib/content";

const negocioSlotKeys = new Set(negocios.map((n) => n.slotKey));

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

  if ((slot.slotType === "banda" || slot.slotType === "propiedad") && !process.env.DISCORD_STAFF_CHANNEL_ID) {
    // Bandas y propiedades se entregan a mano por staff vía notificación de
    // Discord — sin ese canal configurado no hay forma de que la entrega
    // suceda nunca, así que no podemos cobrar por algo que no se puede
    // entregar.
    return NextResponse.json({ error: "Este tipo de arrendamiento no está disponible todavía" }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: slotRow, error } = await admin.from("slots").select("occupied_until").eq("slot_key", slotKey).maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!slotRow) {
    // No hay fila en `slots` para este slot_key (drift catálogo/seed). Tratarlo
    // igual que un slotKey inválido en vez de asumir "disponible" — de lo
    // contrario claim_slot fallaría con una violación de FK al insertar el
    // lease y Mercado Pago reintentaría el webhook para siempre.
    return NextResponse.json({ error: "Slot no encontrado" }, { status: 404 });
  }

  const occupiedUntilMs = slotRow.occupied_until ? new Date(slotRow.occupied_until).getTime() : 0;
  if (occupiedUntilMs > Date.now()) {
    return NextResponse.json({ error: "Ese slot ya está ocupado" }, { status: 409 });
  }

  if (slot.slotType === "negocio") {
    // QBCore solo soporta un job por jugador: si ya tiene un negocio activo
    // y compra uno distinto, reconcileNegocioJobs (bb_vip) le asigna el que
    // le toque en una iteración sin orden garantizado, pisando el anterior
    // sin ningún aviso.
    const { data: existingLeases, error: existingError } = await admin
      .from("leases")
      .select("slot_key, expires_at")
      .eq("discord_id", discordId);

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 });
    }

    const now = Date.now();
    const hasOtherActiveNegocio = (existingLeases ?? []).some(
      (l) => l.slot_key !== slotKey && negocioSlotKeys.has(l.slot_key) && l.expires_at !== null && new Date(l.expires_at).getTime() > now
    );

    if (hasOtherActiveNegocio) {
      return NextResponse.json({ error: "Ya tenés un negocio arrendado — no podés tener dos al mismo tiempo" }, { status: 409 });
    }
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

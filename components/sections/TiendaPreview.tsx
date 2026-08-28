"use client";

import { useState } from "react";
import { vipTiers, vehicles, type ItemType } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/supabase/user";

interface TiendaPreviewProps {
  user: AppUser | null;
}

export function TiendaPreview({ user }: TiendaPreviewProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  async function handleBuy(itemType: ItemType, itemKey: string) {
    if (!user) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      return;
    }

    setLoadingKey(itemKey);
    try {
      const res = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemKey }),
      });
      const json = await res.json();
      if (res.ok && json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      }
    } finally {
      setLoadingKey(null);
    }
  }

  return (
    <section id="tienda" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Tienda</h2>
        <p className="mt-2 text-gray-400">VIP y vehículos, con entrega automática al conectarte al servidor.</p>
      </div>

      <div className="mt-10">
        <h3 className="font-display text-2xl uppercase text-white">VIP</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {vipTiers.map((tier) => (
            <div key={tier.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h4 className="font-display text-2xl uppercase text-white">{tier.label}</h4>
              <p className="mt-1 font-display text-xl text-peach">${tier.priceArs.toLocaleString("es-AR")} ARS</p>
              <p className="mt-3 text-sm text-gray-400">{tier.discordPerk}</p>
              <Button
                variant="primary"
                className="mt-4 w-full"
                disabled={loadingKey === tier.key}
                onClick={() => handleBuy("vip", tier.key)}
              >
                {loadingKey === tier.key ? "Redirigiendo…" : "Comprar"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16">
        <h3 className="font-display text-2xl uppercase text-white">Vehículos</h3>
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {vehicles.map((vehicle) => (
            <div key={vehicle.key} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h4 className="font-display text-xl uppercase text-white">{vehicle.label}</h4>
              <p className="mt-1 font-display text-lg text-peach">${vehicle.priceArs.toLocaleString("es-AR")} ARS</p>
              <Button
                variant="primary"
                className="mt-4 w-full"
                disabled={loadingKey === vehicle.key}
                onClick={() => handleBuy("vehicle", vehicle.key)}
              >
                {loadingKey === vehicle.key ? "Redirigiendo…" : "Comprar"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

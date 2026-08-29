"use client";

import { useEffect, useState } from "react";
import { bandas, negocios, propiedades, type Period } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { Tabs, tabPanelLabelledBy } from "@/components/ui/Tabs";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/supabase/user";

interface SlotAvailability {
  slot_key: string;
  occupied_until: string | null;
}

interface ArrendamientosCatalogProps {
  user: AppUser | null;
}

const CATEGORIES = [
  { label: "Bandas", items: bandas },
  { label: "Negocios", items: negocios },
  { label: "Propiedades", items: propiedades },
];

export function ArrendamientosCatalog({ user }: ArrendamientosCatalogProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [availability, setAvailability] = useState<Record<string, string | null>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("slots")
      .select("slot_key, occupied_until")
      .then(({ data }: { data: SlotAvailability[] | null }) => {
        const map: Record<string, string | null> = {};
        for (const row of data ?? []) {
          map[row.slot_key] = row.occupied_until;
        }
        setAvailability(map);
      });
  }, []);

  async function handleLease(slotKey: string, period: Period) {
    setError(null);

    if (!user) {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "discord",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      return;
    }

    setLoadingKey(slotKey);
    try {
      const res = await fetch("/api/mercadopago/create-lease-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotKey, period }),
      });
      const json = await res.json();
      if (res.ok && json.checkoutUrl) {
        window.location.href = json.checkoutUrl;
      } else {
        setError(json.error ?? "No pudimos iniciar el arrendamiento. Probá de nuevo en un momento.");
      }
    } catch {
      setError("No pudimos iniciar el arrendamiento. Probá de nuevo en un momento.");
    } finally {
      setLoadingKey(null);
    }
  }

  const active = CATEGORIES[activeIndex];

  return (
    <section id="arrendamientos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h1 className="font-display text-4xl uppercase text-white sm:text-5xl">Arrendamientos</h1>
        <p className="mt-2 text-gray-400">
          Tomá el control de una banda, un negocio o una propiedad — por tiempo limitado, un solo dueño a la vez.
        </p>
      </div>

      <div className="mt-10">
        <Tabs
          items={CATEGORIES.map((c) => ({ label: c.label }))}
          activeIndex={activeIndex}
          onChange={setActiveIndex}
          panelId="arrendamientos-panel"
          tablistLabel="Categorías de arrendamientos"
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-coral">
          {error}
        </p>
      )}

      <div
        id="arrendamientos-panel"
        role="tabpanel"
        aria-labelledby={tabPanelLabelledBy("arrendamientos-panel", activeIndex)}
        tabIndex={0}
        className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {active.items.map((item) => {
          const occupiedUntil = availability[item.slotKey];
          const isOccupied = Boolean(occupiedUntil && new Date(occupiedUntil).getTime() > Date.now());

          return (
            <div key={item.slotKey} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="font-display text-xl uppercase text-white">{item.label}</h3>
              <p className="mt-1 text-sm text-gray-400">
                {isOccupied ? `Ocupada hasta ${new Date(occupiedUntil as string).toLocaleDateString("es-AR")}` : "Disponible"}
              </p>
              <p className="mt-2 font-display text-lg text-peach">${item.priceMensual.toLocaleString("es-AR")} ARS / mes</p>
              {item.priceSemestral !== null && (
                <p className="text-sm text-gray-400">${item.priceSemestral.toLocaleString("es-AR")} ARS / semestre</p>
              )}
              <div className="mt-4 flex flex-col gap-2">
                <Button
                  variant="primary"
                  disabled={isOccupied || loadingKey === item.slotKey}
                  onClick={() => handleLease(item.slotKey, "mensual")}
                >
                  {loadingKey === item.slotKey ? "Redirigiendo…" : "Arrendar mensual"}
                </Button>
                {item.priceSemestral !== null && (
                  <Button
                    variant="outline-cyan"
                    disabled={isOccupied || loadingKey === item.slotKey}
                    onClick={() => handleLease(item.slotKey, "semestral")}
                  >
                    Arrendar semestral
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { Tabs, tabPanelLabelledBy } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { AccountDetails } from "./AccountDetails";
import type { AppUser } from "@/lib/supabase/user";

const TAB_LABELS = ["Datos de cuenta", "Perfil de Personaje", "Historial de compras", "VIP activo"];

interface AccountTabsProps {
  user: AppUser;
}

export function AccountTabs({ user }: AccountTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div>
      <Tabs
        items={TAB_LABELS.map((label) => ({ label }))}
        activeIndex={activeIndex}
        onChange={setActiveIndex}
        panelId="account-panel"
        tablistLabel="Secciones de tu cuenta"
      />
      <div
        id="account-panel"
        role="tabpanel"
        aria-labelledby={tabPanelLabelledBy("account-panel", activeIndex)}
        tabIndex={0}
        className="mt-8"
      >
        {activeIndex === 0 && <AccountDetails user={user} />}
        {activeIndex === 1 && (
          <EmptyState
            title="Perfil de Personaje"
            description="Acá vas a ver tus personajes, vehículos y propiedades una vez que te conectes al servidor."
          />
        )}
        {activeIndex === 2 && (
          <EmptyState title="Historial de compras" description="Todavía no hiciste ninguna compra en la tienda." />
        )}
        {activeIndex === 3 && (
          <EmptyState title="VIP activo" description="No tenés un plan VIP activo por el momento." />
        )}
      </div>
    </div>
  );
}

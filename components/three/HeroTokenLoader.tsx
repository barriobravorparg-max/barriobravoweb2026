"use client";

import dynamic from "next/dynamic";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

const HeroToken = dynamic(() => import("./HeroToken"), {
  ssr: false,
  loading: () => (
    <ImagePlaceholder
      aspectClassName="aspect-square"
      label="Token 3D BB (cargando)"
      todo="fallback mientras carga el bundle de three.js"
    />
  ),
});

export function HeroTokenLoader() {
  return (
    <div className="mx-auto aspect-square w-64 sm:w-80">
      <HeroToken />
    </div>
  );
}

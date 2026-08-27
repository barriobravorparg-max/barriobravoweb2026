import type { Metadata } from "next";
import { bebasNeue, manrope, jetbrainsMono } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Barrio Bravo RP",
  description:
    "Barrio Bravo RP — servidor de roleplay FiveM/QBCore latinoamericano. Whitelist, tienda y comunidad en un solo lugar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bebasNeue.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}

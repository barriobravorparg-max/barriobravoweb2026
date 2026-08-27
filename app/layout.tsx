import type { Metadata } from "next";
import { bebasNeue, manrope, jetbrainsMono } from "@/lib/fonts";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const TITLE = "Barrio Bravo RP";
const DESCRIPTION =
  "Barrio Bravo RP — servidor de roleplay FiveM/QBCore latinoamericano. Whitelist, tienda y comunidad en un solo lugar.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: TITLE,
    images: ["/opengraph-image"],
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bebasNeue.variable} ${manrope.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}

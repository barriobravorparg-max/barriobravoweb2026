import type { NextConfig } from "next";

// El optimizador de imágenes (/_next/image) es público: un remotePattern con
// `*.supabase.co` y sin pathname deja que cualquiera le pase objetos públicos de
// CUALQUIER proyecto Supabase y nos coma la cuota del plan Hobby. Lo acotamos al
// host de este proyecto y al prefijo del bucket `gallery`.
function supabaseHostname(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "*.supabase.co"; // fallback si la env var falta en build
  try {
    return new URL(url).hostname;
  } catch {
    return "*.supabase.co";
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
      {
        protocol: "https",
        hostname: supabaseHostname(),
        pathname: "/storage/v1/object/public/gallery/**",
      },
    ],
  },
};

export default nextConfig;

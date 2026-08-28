"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { navLinks } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import type { AppUser } from "@/lib/supabase/user";

interface NavbarProps {
  user: AppUser | null;
}

export function Navbar({ user }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-base/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="font-display text-2xl tracking-widest text-white">BB</span>

        <ul className="hidden gap-8 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm uppercase tracking-wide text-gray-300 hover:text-peach">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <div className="flex items-center gap-2">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt="" width={32} height={32} className="rounded-full" data-testid="avatar" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-purple/10" data-testid="avatar" />
                )}
                <span className="text-sm text-gray-300">{user.displayName}</span>
              </div>
              <a href="/mi-cuenta" className="text-sm uppercase tracking-wide text-gray-300 hover:text-peach">
                Mi Cuenta
              </a>
              <Button variant="outline-purple" onClick={handleLogout}>
                Salir
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline-purple" onClick={handleLogin}>
                Ingresar
              </Button>
              <Button variant="primary" disabled>
                Conectar
              </Button>
            </>
          )}
        </div>

        <button
          aria-label="Abrir menú"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="text-white md:hidden"
        >
          {open ? "✕" : "☰"}
        </button>
      </nav>

      {open && (
        <ul className="flex flex-col gap-4 border-t border-white/10 px-4 py-4 md:hidden">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm uppercase tracking-wide text-gray-300" onClick={() => setOpen(false)}>
                {link.label}
              </a>
            </li>
          ))}
          <li>
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt="" width={32} height={32} className="rounded-full" data-testid="avatar" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-purple/10" data-testid="avatar" />
                  )}
                  <span className="text-sm text-gray-300">{user.displayName}</span>
                </div>
                <a
                  href="/mi-cuenta"
                  className="text-sm uppercase tracking-wide text-gray-300"
                  onClick={() => setOpen(false)}
                >
                  Mi Cuenta
                </a>
                <Button variant="outline-purple" className="w-full" onClick={handleLogout}>
                  Salir
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button variant="outline-purple" className="w-full" onClick={handleLogin}>
                  Discord
                </Button>
                <Button variant="primary" className="w-full" disabled>
                  Conectar
                </Button>
              </div>
            )}
          </li>
        </ul>
      )}
    </header>
  );
}

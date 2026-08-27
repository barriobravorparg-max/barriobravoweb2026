# Landing Pública (Barrio Bravo RP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete single-page public landing site for Barrio Bravo RP — loading screen, navbar, hero with 3D token, all content sections, footer — as a working, deployable Next.js app with no backend dependencies.

**Architecture:** Next.js 15 App Router + TypeScript + Tailwind CSS, client-side only. A centralized `lib/content.ts` holds all placeholder copy. Presentational sections are built bottom-up (UI primitives → content data → interactive components → sections → page composition), each task leaving the app in a buildable, working state.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS 3, Framer Motion, `@react-three/fiber` + `@react-three/drei` + `three`, Vitest + React Testing Library for component logic tests.

**Spec:** [docs/superpowers/specs/2026-08-27-landing-publica-design.md](../specs/2026-08-27-landing-publica-design.md)

## Global Constraints

- Package manager: **npm** (not pnpm as originally drafted in the spec — `corepack`/pnpm could not be activated in this environment due to a filesystem permission error; npm is functionally equivalent for this project and ships with Node, so this is a pragmatic substitution, not a design change).
- Fonts via `next/font/google`: Bebas Neue (`--font-bebas`, headlines), Manrope (`--font-manrope`, body), JetBrains Mono (`--font-jetbrains-mono`, IP/technical data).
- Colors — exact hex, defined once in `tailwind.config.ts`: base `#0A0B0D`, peach `#FF9B7A`, coral `#FF6B8A`, purple `#9B5FC0`, cyan `#7BE8E8`.
- No calls to Supabase, Mercado Pago, or QBCore's MySQL anywhere in this sub-project. No countdown section. Community stats and IP/Discord data are static placeholders, never fetched.
- All variable copy (features, facciones, staff, reglas, FAQ, nav links, hero text) lives in `lib/content.ts`, typed, nowhere else.
- Every image slot uses the shared `ImagePlaceholder` component with a fixed `aspect-ratio` and a `{/* TODO: imagen — ... */}` comment naming the asset and exact measurements from spec §3.7.
- Logo: text wordmark ("BB" / "BARRIO BRAVO") in Bebas Neue — no PNG asset exists yet.
- Keyboard accessibility required on the Facciones tabs and the FAQ accordion.
- Git is already initialized at the repo root with `origin` set to `https://github.com/barriobravorparg-max/barriobravoweb2026.git`; commit after every task, but do **not** attempt `git push` — this environment cannot complete GitHub's interactive OAuth prompt, so pushing is left to the user.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `.gitignore`, `postcss.config.js`, `tailwind.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `lib/fonts.ts`

**Interfaces:**
- Produces: `lib/fonts.ts` exports `bebasNeue`, `manrope`, `jetbrainsMono` (each a `next/font/google` result object with `.variable` and `.className`). Tailwind color tokens `base`, `peach`, `coral`, `purple`, `cyan` and font families `font-display`, `font-body`, `font-mono`, and background utility `bg-brand-gradient`, available to every later task.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "barriobravoweb",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "framer-motion": "^11.15.0",
    "three": "^0.171.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.2",
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@types/three": "^0.171.0",
    "tailwindcss": "^3.4.17",
    "postcss": "^8.4.49",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.17.0",
    "eslint-config-next": "^15.1.0",
    "vitest": "^2.1.8",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "@testing-library/react": "^16.1.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 4: Write `.gitignore`**

```
node_modules
.next
out
*.log
.env*.local
.DS_Store
```

- [ ] **Step 5: Write `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 6: Write `postcss.config.js`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Write `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0A0B0D",
        peach: "#FF9B7A",
        coral: "#FF6B8A",
        purple: "#9B5FC0",
        cyan: "#7BE8E8",
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        body: ["var(--font-manrope)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(90deg, #FF9B7A 0%, #FF6B8A 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 8: Write `lib/fonts.ts`**

```ts
import { Bebas_Neue, Manrope, JetBrains_Mono } from "next/font/google";

export const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
```

- [ ] **Step 9: Write `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #0a0b0d;
  color: #f5f5f5;
}
```

- [ ] **Step 10: Write `app/layout.tsx`**

```tsx
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
```

- [ ] **Step 11: Write a placeholder `app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="font-display text-6xl text-peach">BARRIO BRAVO RP</h1>
    </main>
  );
}
```

- [ ] **Step 12: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

- [ ] **Step 13: Write `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 14: Install dependencies**

Run: `npm install`
Expected: installs without errors, creates `package-lock.json`.

- [ ] **Step 15: Verify the app builds**

Run: `npm run build`
Expected: build succeeds, prints the `/` route as static.

- [ ] **Step 16: Commit**

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts .gitignore next.config.ts postcss.config.js tailwind.config.ts vitest.config.ts vitest.setup.ts lib/fonts.ts app/globals.css app/layout.tsx app/page.tsx
git commit -m "chore: scaffold Next.js project with Tailwind, fonts, and Vitest"
```

---

### Task 2: UI primitives — Button, Card, ImagePlaceholder

**Files:**
- Create: `components/ui/Button.tsx`, `components/ui/Card.tsx`, `components/ui/ImagePlaceholder.tsx`
- Test: `components/ui/Button.test.tsx`, `components/ui/ImagePlaceholder.test.tsx`

**Interfaces:**
- Consumes: Tailwind tokens from Task 1 (`bg-brand-gradient`, `purple`, `cyan`, `base`).
- Produces:
  - `Button({ variant?: "primary" | "outline-purple" | "outline-cyan", ...ButtonHTMLAttributes })`
  - `Card({ icon?: React.ReactNode, title: string, description: string, className?: string })`
  - `ImagePlaceholder({ aspectClassName: string, label: string, todo: string, className?: string })`

- [ ] **Step 1: Write the failing test for Button**

```tsx
// components/ui/Button.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("applies the primary gradient class by default", () => {
    render(<Button>Conectar</Button>);
    expect(screen.getByRole("button", { name: "Conectar" })).toHaveClass("bg-brand-gradient");
  });

  it("applies the outline-purple variant class", () => {
    render(<Button variant="outline-purple">Discord</Button>);
    expect(screen.getByRole("button", { name: "Discord" })).toHaveClass("border-purple");
  });

  it("applies the outline-cyan variant class", () => {
    render(<Button variant="outline-cyan">Whitelist</Button>);
    expect(screen.getByRole("button", { name: "Whitelist" })).toHaveClass("border-cyan");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Button.test.tsx`
Expected: FAIL — cannot find module `./Button`.

- [ ] **Step 3: Write `components/ui/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "outline-purple" | "outline-cyan";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-brand-gradient text-base font-semibold hover:brightness-110",
  "outline-purple": "border border-purple text-purple hover:bg-purple/10",
  "outline-cyan": "border border-cyan text-cyan hover:bg-cyan/10",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full px-6 py-3 text-sm uppercase tracking-wide transition-all duration-200 hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Button.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write `components/ui/Card.tsx`**

```tsx
import type { ReactNode } from "react";

interface CardProps {
  icon?: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function Card({ icon, title, description, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-200 hover:border-purple/50 ${className}`}
    >
      {icon && <div className="mb-4 text-cyan">{icon}</div>}
      <h3 className="font-display text-2xl uppercase tracking-wide text-white">{title}</h3>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  );
}
```

- [ ] **Step 6: Write the failing test for ImagePlaceholder**

```tsx
// components/ui/ImagePlaceholder.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ImagePlaceholder } from "./ImagePlaceholder";

describe("ImagePlaceholder", () => {
  it("renders with the given aspect-ratio class and accessible label", () => {
    render(
      <ImagePlaceholder aspectClassName="aspect-[3/2]" label="Card de facción" todo="faccion-civil.jpg, 800x533px" />
    );
    const el = screen.getByRole("img", { name: "Card de facción" });
    expect(el).toHaveClass("aspect-[3/2]");
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npm test -- ImagePlaceholder.test.tsx`
Expected: FAIL — cannot find module `./ImagePlaceholder`.

- [ ] **Step 8: Write `components/ui/ImagePlaceholder.tsx`**

```tsx
interface ImagePlaceholderProps {
  aspectClassName: string;
  label: string;
  todo: string;
  className?: string;
}

export function ImagePlaceholder({ aspectClassName, label, todo, className = "" }: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`relative w-full overflow-hidden rounded-xl bg-purple/10 ${aspectClassName} ${className}`}
    >
      {/* TODO: imagen — {todo} */}
    </div>
  );
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npm test -- ImagePlaceholder.test.tsx`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add components/ui/Button.tsx components/ui/Button.test.tsx components/ui/Card.tsx components/ui/ImagePlaceholder.tsx components/ui/ImagePlaceholder.test.tsx
git commit -m "feat: add Button, Card, and ImagePlaceholder UI primitives"
```

---

### Task 3: Centralized content data

**Files:**
- Create: `lib/content.ts`
- Test: `lib/content.test.ts`

**Interfaces:**
- Produces: types `Feature`, `StaffMember`, `Faccion`, `Regla`, `FaqItem`, `NavLink`, `Testimonio`; data `navLinks`, `hero`, `features`, `facciones`, `staff`, `reglas`, `faq`, `testimonios`, `comunidadStats`, `tiendaTiers`. All consumed by Tasks 5–11.

- [ ] **Step 1: Write the failing test**

```ts
// lib/content.test.ts
import { describe, expect, it } from "vitest";
import { facciones, faq, navLinks, reglas } from "./content";

describe("content.ts", () => {
  it("has exactly the four facción categories from the brief", () => {
    const categories = facciones.map((f) => f.category);
    expect(categories).toEqual(["Servicios de Emergencia", "Civil", "Criminal", "Negocios"]);
  });

  it("every facción has at least one job", () => {
    for (const f of facciones) expect(f.jobs.length).toBeGreaterThan(0);
  });

  it("has at least 5 FAQ entries", () => {
    expect(faq.length).toBeGreaterThanOrEqual(5);
  });

  it("nav links point to in-page anchors", () => {
    for (const link of navLinks) expect(link.href.startsWith("#")).toBe(true);
  });

  it("every regla has a valid severity level", () => {
    for (const r of reglas) expect(["Leve", "Grave", "Muy grave"]).toContain(r.severity);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- content.test.ts`
Expected: FAIL — cannot find module `./content`.

- [ ] **Step 3: Write `lib/content.ts`**

```ts
export interface NavLink {
  href: string;
  label: string;
}

export interface Feature {
  title: string;
  description: string;
}

export interface StaffMember {
  alias: string;
  role: string;
}

export interface Faccion {
  category: "Servicios de Emergencia" | "Civil" | "Criminal" | "Negocios";
  jobs: { name: string; description: string }[];
}

export interface Regla {
  severity: "Leve" | "Grave" | "Muy grave";
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Testimonio {
  name: string;
  quote: string;
}

export const navLinks: NavLink[] = [
  { href: "#inicio", label: "Inicio" },
  { href: "#tienda", label: "Tienda" },
  { href: "#reglas", label: "Reglas" },
  { href: "#faq", label: "FAQ" },
  { href: "#comunidad", label: "Comunidad" },
];

export const hero = {
  headline: "BARRIO BRAVO RP",
  tagline: "Tu barrio, tus reglas, tu historia.",
  description:
    "Un servidor de roleplay FiveM/QBCore hecho por y para la comunidad latinoamericana. Economía propia, facciones, vivienda y eventos en vivo — sumate a la whitelist.",
};

export const features: Feature[] = [
  { title: "Framework a medida", description: "QBCore adaptado con scripts propios pensados para nuestra comunidad, sin copiar y pegar de otros servers." },
  { title: "Economía viva", description: "Trabajos, negocios y un mercado que reacciona a lo que hace la comunidad, no números fijos." },
  { title: "Vivienda y vehículos", description: "Sistema de propiedades y garages propio, con personalización real." },
  { title: "Eventos en vivo", description: "Staff activo organizando eventos IC y OOC de forma regular." },
  { title: "Voz por proximidad", description: "Comunicación inmersiva dentro y fuera de los vehículos." },
  { title: "Comunidad activa", description: "Discord y TikTok con contenido y soporte constante." },
];

export const facciones: Faccion[] = [
  {
    category: "Servicios de Emergencia",
    jobs: [
      { name: "Policía", description: "Mantené el orden en las calles del barrio." },
      { name: "Paramédico", description: "Atención de emergencias y RP médico." },
    ],
  },
  {
    category: "Civil",
    jobs: [
      { name: "Taxista", description: "Movete por la ciudad y generá ingresos." },
      { name: "Mecánico", description: "Reparación y tuning de vehículos." },
    ],
  },
  {
    category: "Criminal",
    jobs: [
      { name: "Banda independiente", description: "Organizá tu propia facción criminal." },
      { name: "Contrabando", description: "Rutas y negocios al margen de la ley." },
    ],
  },
  {
    category: "Negocios",
    jobs: [
      { name: "Dueño de local", description: "Montá y administrá tu propio negocio." },
      { name: "Repartidor", description: "Logística y entregas dentro de la ciudad." },
    ],
  },
];

export const staff: StaffMember[] = [
  { alias: "Fundador", role: "Dirección del proyecto" },
  { alias: "Co-fundador", role: "Desarrollo" },
  { alias: "Admin", role: "Moderación y soporte" },
];

export const reglas: Regla[] = [
  { severity: "Leve", title: "Metagaming", description: "Usar información fuera de personaje dentro del rol." },
  { severity: "Grave", title: "Powergaming", description: "Forzar acciones sobre otro jugador sin darle chance de reaccionar." },
  { severity: "Muy grave", title: "RDM/VDM", description: "Matar o atropellar sin motivo de rol válido." },
];

export const faq: FaqItem[] = [
  { question: "¿Cómo consigo la whitelist?", answer: "Vas a poder postularte desde Discord apenas abramos las postulaciones." },
  { question: "¿Cómo pago en la tienda?", answer: "La tienda va a aceptar Mercado Pago con entrega automática al conectarte al server." },
  { question: "¿La entrega es automática?", answer: "Sí, tu compra se entrega sola al detectar tu Discord conectado al servidor." },
  { question: "¿Hay reembolsos?", answer: "Sí, escribinos por Discord dentro de las 48hs de la compra." },
  { question: "¿Qué necesito para jugar?", answer: "FiveM instalado y una copia legítima de GTA V." },
];

export const testimonios: Testimonio[] = [
  { name: "Comunidad", quote: "Espacio reservado para testimonios reales una vez que abramos al público." },
];

export const comunidadStats = {
  jugadoresOnline: "Próximamente",
  miembrosDiscord: "Próximamente",
};

export const tiendaTiers = [
  { name: "VIP Bronce", price: "Próximamente" },
  { name: "VIP Plata", price: "Próximamente", popular: true },
  { name: "VIP Oro", price: "Próximamente" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- content.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/content.ts lib/content.test.ts
git commit -m "feat: add centralized placeholder content for landing sections"
```

---

### Task 4: Loading screen

**Files:**
- Create: `components/loading/LoadingScreen.tsx`
- Test: `components/loading/LoadingScreen.test.tsx`

**Interfaces:**
- Produces: `LoadingScreen({ onFinish: () => void, minDurationMs?: number, autoAdvanceMs?: number })`. Consumed by Task 12's page composition.

- [ ] **Step 1: Write the failing test**

```tsx
// components/loading/LoadingScreen.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoadingScreen } from "./LoadingScreen";

describe("LoadingScreen", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not finish before the minimum duration even if a key is pressed", async () => {
    const onFinish = vi.fn();
    render(<LoadingScreen onFinish={onFinish} minDurationMs={1500} autoAdvanceMs={4000} />);

    await vi.advanceTimersByTimeAsync(500);
    screen.getByText("Cargando...", { exact: false }).ownerDocument.dispatchEvent(new KeyboardEvent("keydown"));
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("shows the skip prompt and finishes on keypress once the minimum duration has passed", async () => {
    const onFinish = vi.fn();
    render(<LoadingScreen onFinish={onFinish} minDurationMs={1500} autoAdvanceMs={4000} />);

    await vi.advanceTimersByTimeAsync(1500);
    expect(screen.getByText(/Presion/i)).toBeInTheDocument();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("finishes automatically after autoAdvanceMs with no input", async () => {
    const onFinish = vi.fn();
    render(<LoadingScreen onFinish={onFinish} minDurationMs={1500} autoAdvanceMs={4000} />);

    await vi.advanceTimersByTimeAsync(1500 + 4000);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- LoadingScreen.test.tsx`
Expected: FAIL — cannot find module `./LoadingScreen`.

- [ ] **Step 3: Write `components/loading/LoadingScreen.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";

interface LoadingScreenProps {
  onFinish: () => void;
  minDurationMs?: number;
  autoAdvanceMs?: number;
}

export function LoadingScreen({ onFinish, minDurationMs = 1500, autoAdvanceMs = 4000 }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min(100, Math.round((elapsed / minDurationMs) * 100)));
    }, 50);

    const readyTimer = setTimeout(() => {
      setProgress(100);
      setReady(true);
    }, minDurationMs);

    return () => {
      clearInterval(interval);
      clearTimeout(readyTimer);
    };
  }, [minDurationMs]);

  useEffect(() => {
    if (!ready) return;

    const autoTimer = setTimeout(onFinish, autoAdvanceMs);
    const skip = () => onFinish();

    document.addEventListener("keydown", skip);
    document.addEventListener("click", skip);

    return () => {
      clearTimeout(autoTimer);
      document.removeEventListener("keydown", skip);
      document.removeEventListener("click", skip);
    };
  }, [ready, autoAdvanceMs, onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-base">
      <h1 className="font-display text-5xl tracking-widest text-white sm:text-7xl">BARRIO BRAVO RP</h1>
      <div className="h-1 w-64 overflow-hidden rounded-full bg-white/10 sm:w-96">
        <div className="h-full bg-brand-gradient transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-sm text-gray-400">
        {ready ? "Presioná cualquier tecla para continuar" : `Cargando... ${progress}%`}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- LoadingScreen.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/loading/LoadingScreen.tsx components/loading/LoadingScreen.test.tsx
git commit -m "feat: add game-style loading screen with skip and auto-advance"
```

---

### Task 5: Navbar and Footer

**Files:**
- Create: `components/layout/Navbar.tsx`, `components/layout/Footer.tsx`
- Test: `components/layout/Navbar.test.tsx`

**Interfaces:**
- Consumes: `navLinks` from `lib/content.ts` (Task 3), `Button` from `components/ui/Button.tsx` (Task 2).
- Produces: `Navbar()` (no props — reads `navLinks` directly), `Footer()`. Consumed by Task 12.

- [ ] **Step 1: Write the failing test**

```tsx
// components/layout/Navbar.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Navbar } from "./Navbar";

describe("Navbar", () => {
  it("toggles the mobile menu open and closed", async () => {
    const user = userEvent.setup();
    render(<Navbar />);

    const toggle = screen.getByRole("button", { name: /menú/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Navbar.test.tsx`
Expected: FAIL — cannot find module `./Navbar`.

- [ ] **Step 3: Write `components/layout/Navbar.tsx`**

```tsx
"use client";

import { useState } from "react";
import { navLinks } from "@/lib/content";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const [open, setOpen] = useState(false);

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
          <Button variant="outline-purple">Discord</Button>
          <Button variant="primary">Conectar</Button>
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
            <Button variant="primary" className="w-full">
              Conectar
            </Button>
          </li>
        </ul>
      )}
    </header>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Navbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write `components/layout/Footer.tsx`** (no test — static markup, verified visually in Task 12)

```tsx
import { navLinks } from "@/lib/content";

export function Footer() {
  return (
    <footer className="border-t border-white/10 px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <span className="font-display text-2xl tracking-widest text-white">BARRIO BRAVO RP</span>
          <p className="mt-2 max-w-sm text-sm text-gray-500">
            IP del servidor: <span className="font-mono text-cyan">Próximamente</span>
          </p>
        </div>

        <ul className="flex flex-wrap gap-6">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm text-gray-400 hover:text-peach">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex gap-4 text-sm text-gray-400">
          <a href="https://www.tiktok.com/@barriobravo.arg" target="_blank" rel="noopener noreferrer" className="hover:text-peach">
            TikTok
          </a>
          <span>Discord: Próximamente</span>
        </div>
      </div>

      <p className="mx-auto mt-8 max-w-7xl text-xs text-gray-600">
        Barrio Bravo RP no está afiliado a Rockstar Games ni a Take-Two Interactive.
      </p>
    </footer>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/layout/Navbar.tsx components/layout/Navbar.test.tsx components/layout/Footer.tsx
git commit -m "feat: add navbar with mobile menu and footer"
```

---

### Task 6: Hero section

**Files:**
- Create: `components/sections/Hero.tsx`
- Test: `components/sections/Hero.test.tsx`

**Interfaces:**
- Consumes: `hero` from `lib/content.ts`, `Button` and `ImagePlaceholder` from Task 2.
- Produces: `Hero()`. Task 7 will modify this file to swap the token placeholder for the real 3D component.

- [ ] **Step 1: Write the failing test**

```tsx
// components/sections/Hero.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hero } from "./Hero";

describe("Hero", () => {
  it("renders the headline and a disabled copy-IP button while the IP is a placeholder", () => {
    render(<Hero />);
    expect(screen.getByText("BARRIO BRAVO RP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar ip/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Hero.test.tsx`
Expected: FAIL — cannot find module `./Hero`.

- [ ] **Step 3: Write `components/sections/Hero.tsx`**

```tsx
"use client";

import { useState } from "react";
import { hero } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

const SERVER_IP = "Próximamente";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const ipAvailable = SERVER_IP !== "Próximamente";

  async function handleCopy() {
    if (!ipAvailable) return;
    await navigator.clipboard.writeText(SERVER_IP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section id="inicio" className="mx-auto flex max-w-7xl flex-col items-center gap-10 px-4 pb-20 pt-16 sm:px-6 lg:flex-row lg:pt-24">
      <div className="flex-1 text-center lg:text-left">
        <h1 className="font-display text-5xl uppercase leading-none text-white sm:text-6xl lg:text-7xl">{hero.headline}</h1>
        <p className="mt-4 font-display text-2xl text-transparent bg-brand-gradient bg-clip-text sm:text-3xl">{hero.tagline}</p>
        <p className="mx-auto mt-4 max-w-lg text-gray-400 lg:mx-0">{hero.description}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
          <Button variant="primary">Conectar al servidor</Button>
          <Button variant="outline-purple">Unirse a Discord</Button>
          <Button variant="outline-cyan">Postularte a whitelist</Button>
        </div>

        <div className="mx-auto mt-8 flex max-w-sm items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 lg:mx-0">
          <span className="font-mono text-sm text-cyan">{SERVER_IP}</span>
          <Button variant="outline-cyan" onClick={handleCopy} disabled={!ipAvailable} className="px-4 py-2 text-xs">
            {copied ? "¡Copiado!" : "Copiar IP"}
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <ImagePlaceholder
          aspectClassName="aspect-square"
          label="Token 3D BB"
          todo="hero-token, se reemplaza por el modelo 3D interactivo en la siguiente tarea"
          className="mx-auto w-64 sm:w-80"
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Hero.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/Hero.tsx components/sections/Hero.test.tsx
git commit -m "feat: add hero section with IP card and CTA buttons"
```

---

### Task 7: 3D hero token

**Files:**
- Create: `components/three/HeroToken.tsx`, `components/three/HeroTokenLoader.tsx`
- Modify: `components/sections/Hero.tsx` (swap the `ImagePlaceholder` token block for `HeroTokenLoader`)

**Interfaces:**
- Produces: `HeroTokenLoader()` — a client component that dynamically imports `HeroToken` with `ssr: false` and shows a static fallback while loading.
- No automated test: a WebGL canvas cannot be meaningfully exercised in jsdom. Verified manually in the browser in Task 12's final check.

- [ ] **Step 1: Write `components/three/HeroToken.tsx`**

```tsx
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Canvas } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { Mesh } from "three";

function Token() {
  const meshRef = useRef<Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.4;
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <cylinderGeometry args={[1.4, 1.4, 0.3, 64]} />
        <meshStandardMaterial color="#FF6B8A" emissive="#9B5FC0" emissiveIntensity={0.2} metalness={0.6} roughness={0.3} />
      </mesh>
      <Text position={[0, 0, 0.16]} fontSize={0.9} color="#0A0B0D">
        BB
      </Text>
    </group>
  );
}

export function HeroToken() {
  return (
    <Canvas camera={{ position: [0, 0, 4] }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 3, 3]} intensity={1} color="#7BE8E8" />
      <pointLight position={[-3, -2, 2]} intensity={0.8} color="#FF9B7A" />
      <Token />
    </Canvas>
  );
}

export default HeroToken;
```

- [ ] **Step 2: Write `components/three/HeroTokenLoader.tsx`**

```tsx
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
```

- [ ] **Step 3: Modify `components/sections/Hero.tsx`**

Replace the `import { ImagePlaceholder } ...` block's usage in the JSX and its import:

```tsx
import { HeroTokenLoader } from "@/components/three/HeroTokenLoader";
```

Replace the closing `<div className="flex-1">...</div>` block with:

```tsx
      <div className="flex-1">
        <HeroTokenLoader />
      </div>
```

Remove the now-unused `ImagePlaceholder` import from `Hero.tsx` if nothing else in the file uses it.

- [ ] **Step 4: Run the existing Hero test to confirm nothing broke**

Run: `npm test -- Hero.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify the app still builds**

Run: `npm run build`
Expected: build succeeds (the three.js chunk is only loaded client-side).

- [ ] **Step 6: Commit**

```bash
git add components/three/HeroToken.tsx components/three/HeroTokenLoader.tsx components/sections/Hero.tsx
git commit -m "feat: add interactive 3D hero token with lazy client-only loading"
```

---

### Task 8: Features and Staff sections

**Files:**
- Create: `components/sections/Features.tsx`, `components/sections/Staff.tsx`
- Test: `components/sections/Features.test.tsx`

**Interfaces:**
- Consumes: `features`, `staff` from `lib/content.ts`; `Card`, `ImagePlaceholder` from Task 2.
- Produces: `Features()`, `Staff()`. Consumed by Task 12.

- [ ] **Step 1: Write the failing test**

```tsx
// components/sections/Features.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { features } from "@/lib/content";
import { Features } from "./Features";

describe("Features", () => {
  it("renders one card per feature in content.ts", () => {
    render(<Features />);
    for (const f of features) {
      expect(screen.getByText(f.title)).toBeInTheDocument();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Features.test.tsx`
Expected: FAIL — cannot find module `./Features`.

- [ ] **Step 3: Write `components/sections/Features.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import { features } from "@/lib/content";
import { Card } from "@/components/ui/Card";

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Qué te espera</h2>
        <p className="mt-2 text-gray-400">Todo lo que hace a Barrio Bravo un server distinto.</p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
          >
            <Card title={feature.title} description={feature.description} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Features.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write `components/sections/Staff.tsx`** (same pattern, no additional test — covered by the Features pattern already verified)

```tsx
"use client";

import { motion } from "framer-motion";
import { staff } from "@/lib/content";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

export function Staff() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">El equipo</h2>
        <p className="mt-2 text-gray-400">La gente detrás de Barrio Bravo RP.</p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {staff.map((member, i) => (
          <motion.div
            key={member.alias}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="text-center"
          >
            <ImagePlaceholder
              aspectClassName="aspect-square"
              label={`Avatar de ${member.alias}`}
              todo={`staff-${member.alias.toLowerCase()}.jpg, 400x400px`}
              className="rounded-full"
            />
            <p className="mt-3 font-display text-lg uppercase text-white">{member.alias}</p>
            <p className="text-sm text-gray-500">{member.role}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/sections/Features.tsx components/sections/Features.test.tsx components/sections/Staff.tsx
git commit -m "feat: add features and staff sections"
```

---

### Task 9: Facciones tabs section

**Files:**
- Create: `components/sections/Facciones.tsx`
- Test: `components/sections/Facciones.test.tsx`

**Interfaces:**
- Consumes: `facciones` from `lib/content.ts`.
- Produces: `Facciones()`. Consumed by Task 12.

- [ ] **Step 1: Write the failing test**

```tsx
// components/sections/Facciones.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Facciones } from "./Facciones";

describe("Facciones", () => {
  it("shows the first category's jobs by default and switches on tab click", async () => {
    const user = userEvent.setup();
    render(<Facciones />);

    expect(screen.getByText("Policía")).toBeInTheDocument();
    expect(screen.queryByText("Taxista")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Civil" }));
    expect(screen.getByText("Taxista")).toBeInTheDocument();
    expect(screen.queryByText("Policía")).not.toBeInTheDocument();
  });

  it("moves the active tab with the right arrow key", async () => {
    const user = userEvent.setup();
    render(<Facciones />);

    screen.getByRole("tab", { name: "Servicios de Emergencia" }).focus();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Civil" })).toHaveFocus();
    expect(screen.getByText("Taxista")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Facciones.test.tsx`
Expected: FAIL — cannot find module `./Facciones`.

- [ ] **Step 3: Write `components/sections/Facciones.tsx`**

```tsx
"use client";

import { useRef, useState } from "react";
import { facciones } from "@/lib/content";

export function Facciones() {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = facciones[activeIndex];

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (activeIndex + dir + facciones.length) % facciones.length;
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Facciones y trabajos</h2>
        <p className="mt-2 text-gray-400">Elegí tu camino dentro del barrio.</p>
      </div>

      <div role="tablist" aria-label="Categorías de facciones" className="mt-10 flex gap-2 overflow-x-auto pb-2 sm:justify-center">
        {facciones.map((f, i) => (
          <button
            key={f.category}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            aria-selected={i === activeIndex}
            tabIndex={i === activeIndex ? 0 : -1}
            onClick={() => setActiveIndex(i)}
            onKeyDown={handleKeyDown}
            className={`shrink-0 rounded-full border px-5 py-2 text-sm uppercase tracking-wide transition-colors ${
              i === activeIndex ? "border-peach text-peach" : "border-white/10 text-gray-400 hover:text-white"
            }`}
          >
            {f.category}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {active.jobs.map((job) => (
          <div key={job.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-display text-xl uppercase text-white">{job.name}</h3>
            <p className="mt-1 text-sm text-gray-400">{job.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Facciones.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/sections/Facciones.tsx components/sections/Facciones.test.tsx
git commit -m "feat: add keyboard-navigable facciones tabs section"
```

---

### Task 10: Reglas timeline and FAQ accordion

**Files:**
- Create: `components/sections/Reglas.tsx`, `components/sections/Faq.tsx`
- Test: `components/sections/Faq.test.tsx`

**Interfaces:**
- Consumes: `reglas`, `faq` from `lib/content.ts`.
- Produces: `Reglas()`, `Faq()`. Consumed by Task 12.

- [ ] **Step 1: Write `components/sections/Reglas.tsx`** (static timeline, no interactive logic to test)

```tsx
import { reglas } from "@/lib/content";

const severityClasses: Record<string, string> = {
  Leve: "border-cyan text-cyan",
  Grave: "border-purple text-purple",
  "Muy grave": "border-coral text-coral",
};

export function Reglas() {
  return (
    <section id="reglas" className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Reglas del servidor</h2>
        <p className="mt-2 text-gray-400">Lo mínimo para que el rol funcione para todos.</p>
      </div>

      <ol className="mt-12 space-y-6">
        {reglas.map((regla, i) => (
          <li key={regla.title} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <span className="font-display text-2xl text-gray-600">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <span className={`inline-block rounded-full border px-3 py-1 text-xs uppercase ${severityClasses[regla.severity]}`}>
                {regla.severity}
              </span>
              <h3 className="mt-2 font-display text-xl uppercase text-white">{regla.title}</h3>
              <p className="mt-1 text-sm text-gray-400">{regla.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
```

- [ ] **Step 2: Write the failing test for Faq**

```tsx
// components/sections/Faq.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { faq } from "@/lib/content";
import { Faq } from "./Faq";

describe("Faq", () => {
  it("starts collapsed and expands the clicked question independently", async () => {
    const user = userEvent.setup();
    render(<Faq />);

    const firstButton = screen.getByRole("button", { name: faq[0].question });
    expect(firstButton).toHaveAttribute("aria-expanded", "false");

    await user.click(firstButton);
    expect(firstButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(faq[0].answer)).toBeVisible();

    const secondButton = screen.getByRole("button", { name: faq[1].question });
    expect(secondButton).toHaveAttribute("aria-expanded", "false");

    await user.click(firstButton);
    expect(firstButton).toHaveAttribute("aria-expanded", "false");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- Faq.test.tsx`
Expected: FAIL — cannot find module `./Faq`.

- [ ] **Step 4: Write `components/sections/Faq.tsx`**

```tsx
"use client";

import { useState } from "react";
import { faq } from "@/lib/content";

export function Faq() {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Preguntas frecuentes</h2>
      </div>

      <div className="mt-10 space-y-3">
        {faq.map((item, i) => {
          const isOpen = openIndices.has(i);
          return (
            <div key={item.question} className="rounded-xl border border-white/10 bg-white/[0.03]">
              <button
                aria-expanded={isOpen}
                onClick={() => toggle(i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-white"
              >
                <span>{item.question}</span>
                <span className="text-cyan">{isOpen ? "−" : "+"}</span>
              </button>
              {isOpen && <p className="px-5 pb-4 text-sm text-gray-400">{item.answer}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- Faq.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/sections/Reglas.tsx components/sections/Faq.tsx components/sections/Faq.test.tsx
git commit -m "feat: add reglas timeline and accessible FAQ accordion"
```

---

### Task 11: Testimonios, Galería, Comunidad, Newsletter, TiendaPreview

**Files:**
- Create: `components/sections/Testimonios.tsx`, `components/sections/Galeria.tsx`, `components/sections/Comunidad.tsx`, `components/sections/Newsletter.tsx`, `components/sections/TiendaPreview.tsx`
- Test: `components/sections/Newsletter.test.tsx`

**Interfaces:**
- Consumes: `testimonios`, `comunidadStats`, `tiendaTiers` from `lib/content.ts`; `Button`, `ImagePlaceholder` from Task 2.
- Produces: `Testimonios()`, `Galeria()`, `Comunidad()`, `Newsletter()`, `TiendaPreview()`. Consumed by Task 12.

- [ ] **Step 1: Write `components/sections/Testimonios.tsx`** (static, no test)

```tsx
import { testimonios } from "@/lib/content";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

export function Testimonios() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Lo que dice la comunidad</h2>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {testimonios.map((t) => (
          <div key={t.name} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <ImagePlaceholder aspectClassName="aspect-square" label={`Avatar de ${t.name}`} todo="avatar-testimonio.jpg, 200x200px" className="w-16 shrink-0 rounded-full" />
            <div>
              <p className="text-sm italic text-gray-300">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-2 text-xs uppercase tracking-wide text-gray-500">{t.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Write `components/sections/Galeria.tsx`** (static, no test)

```tsx
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

const SLOTS = Array.from({ length: 8 }, (_, i) => i + 1);

export function Galeria() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Galería</h2>
        <p className="mt-2 text-gray-400">Capturas y clips de la comunidad, muy pronto.</p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {SLOTS.map((n) => (
          <ImagePlaceholder key={n} aspectClassName="aspect-[4/3]" label={`Galería ${n}`} todo={`galeria-${n}.jpg, 1200x900px`} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Write `components/sections/Comunidad.tsx`** (static placeholder stats, no fetch, no test)

```tsx
import { comunidadStats } from "@/lib/content";

export function Comunidad() {
  return (
    <section id="comunidad" className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
      <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Comunidad</h2>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
          <p className="font-display text-4xl text-peach">{comunidadStats.jugadoresOnline}</p>
          <p className="mt-1 text-sm text-gray-400">Jugadores online</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
          <p className="font-display text-4xl text-peach">{comunidadStats.miembrosDiscord}</p>
          <p className="mt-1 text-sm text-gray-400">Miembros en Discord</p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Write `components/sections/TiendaPreview.tsx`** (static teaser, links out to nothing real yet — buttons disabled, no test)

```tsx
import { tiendaTiers } from "@/lib/content";
import { Button } from "@/components/ui/Button";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

export function TiendaPreview() {
  return (
    <section id="tienda" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Tienda</h2>
        <p className="mt-2 text-gray-400">Founder packs y VIP, disponibles apenas abramos la pre-venta.</p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {tiendaTiers.map((tier) => (
          <div key={tier.name} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            {"popular" in tier && tier.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold uppercase text-base">
                Más popular
              </span>
            )}
            <ImagePlaceholder aspectClassName="aspect-[3/2]" label={`Imagen ${tier.name}`} todo={`tienda-${tier.name.toLowerCase().replace(/\s+/g, "-")}.jpg, 900x600px`} />
            <h3 className="mt-4 font-display text-2xl uppercase text-white">{tier.name}</h3>
            <p className="mt-1 font-display text-xl text-peach">{tier.price}</p>
            <Button variant="primary" disabled className="mt-4 w-full">
              Muy pronto
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Write the failing test for Newsletter**

```tsx
// components/sections/Newsletter.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Newsletter } from "./Newsletter";

describe("Newsletter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows a confirmation message on submit without calling the network", async () => {
    const user = userEvent.setup();
    render(<Newsletter />);

    await user.type(screen.getByLabelText(/email/i), "jugador@example.com");
    await user.click(screen.getByRole("button", { name: /avisenme/i }));

    expect(await screen.findByText(/te avisamos/i)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- Newsletter.test.tsx`
Expected: FAIL — cannot find module `./Newsletter`.

- [ ] **Step 7: Write `components/sections/Newsletter.tsx`**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";

export function Newsletter() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // No-op: sin backend en este sub-proyecto. Se conecta a Supabase en el
    // sub-proyecto de auth + cuenta.
    setSubmitted(true);
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">No te lo pierdas</h2>
      <p className="mt-2 text-gray-400">Enterate apenas abramos la whitelist.</p>

      {submitted ? (
        <p className="mt-6 text-cyan">¡Gracias! Te avisamos apenas abramos inscripciones.</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="newsletter-email" className="sr-only">
            Email
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder="tu@email.com"
            className="flex-1 rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-white outline-none focus:border-purple"
          />
          <Button type="submit" variant="primary">
            Avisenme
          </Button>
        </form>
      )}
    </section>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- Newsletter.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add components/sections/Testimonios.tsx components/sections/Galeria.tsx components/sections/Comunidad.tsx components/sections/Newsletter.tsx components/sections/Newsletter.test.tsx components/sections/TiendaPreview.tsx
git commit -m "feat: add testimonios, galeria, comunidad, newsletter, and tienda preview sections"
```

---

### Task 12: Page composition, SEO, and final verification

**Files:**
- Create: `components/ui/AnimatedSection.tsx`, `app/opengraph-image.tsx`, `app/sitemap.ts`, `app/robots.ts`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: every section component from Tasks 4–11, `LoadingScreen` from Task 4, `Navbar`/`Footer` from Task 5.
- Produces: `AnimatedSection({ children: React.ReactNode })` — a fade/slide-in-on-scroll wrapper applied to every section below the hero, per spec §8.

- [ ] **Step 1: Write `components/ui/AnimatedSection.tsx`**

```tsx
"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function AnimatedSection({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Rewrite `app/page.tsx` to compose the full page with the loading screen**

```tsx
"use client";

import { useState } from "react";
import { LoadingScreen } from "@/components/loading/LoadingScreen";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Facciones } from "@/components/sections/Facciones";
import { Staff } from "@/components/sections/Staff";
import { TiendaPreview } from "@/components/sections/TiendaPreview";
import { Reglas } from "@/components/sections/Reglas";
import { Faq } from "@/components/sections/Faq";
import { Testimonios } from "@/components/sections/Testimonios";
import { Galeria } from "@/components/sections/Galeria";
import { Comunidad } from "@/components/sections/Comunidad";
import { Newsletter } from "@/components/sections/Newsletter";

export default function Home() {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return <LoadingScreen onFinish={() => setLoaded(true)} />;
  }

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <AnimatedSection>
          <Features />
        </AnimatedSection>
        <AnimatedSection>
          <Facciones />
        </AnimatedSection>
        <AnimatedSection>
          <Staff />
        </AnimatedSection>
        <AnimatedSection>
          <TiendaPreview />
        </AnimatedSection>
        <AnimatedSection>
          <Reglas />
        </AnimatedSection>
        <AnimatedSection>
          <Faq />
        </AnimatedSection>
        <AnimatedSection>
          <Testimonios />
        </AnimatedSection>
        <AnimatedSection>
          <Galeria />
        </AnimatedSection>
        <AnimatedSection>
          <Comunidad />
        </AnimatedSection>
        <AnimatedSection>
          <Newsletter />
        </AnimatedSection>
      </main>
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Write `app/opengraph-image.tsx`**

```tsx
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0B0D",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            backgroundImage: "linear-gradient(90deg, #FF9B7A 0%, #FF6B8A 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          BARRIO BRAVO RP
        </div>
        <div style={{ fontSize: 32, color: "#9B5FC0", marginTop: 16 }}>Roleplay FiveM/QBCore latinoamericano</div>
      </div>
    ),
    size
  );
}
```

- [ ] **Step 4: Write `app/sitemap.ts`**

```ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://barriobravorp.com",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
```

- [ ] **Step 5: Write `app/robots.ts`**

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://barriobravorp.com/sitemap.xml",
  };
}
```

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: all tests pass (Button, ImagePlaceholder, content, LoadingScreen, Navbar, Hero, Features, Facciones, Faq, Newsletter).

- [ ] **Step 7: Run typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: both succeed with no errors.

- [ ] **Step 8: Manual verification in the browser**

Start the dev server and check, at each of the six Tailwind breakpoints (base <640px, sm ≥640px, md ≥768px, lg ≥1024px, xl ≥1280px, 2xl ≥1536px):
- Loading screen shows, animates, and can be skipped with a keypress or click after the minimum duration.
- Every section renders without overlapping or clipped text, especially long Spanish headings.
- Hero stacks token-above-text on mobile, side-by-side on `lg`+.
- Navbar collapses to the hamburger menu below `md` and the mobile panel opens/closes.
- Facciones tabs scroll horizontally on mobile and are operable with arrow keys on desktop.
- FAQ accordion items expand/collapse independently and are reachable via Tab key.
- The 3D hero token renders and rotates; if WebGL is unavailable, the static fallback shows instead of a broken canvas.
- All `ImagePlaceholder` blocks keep their aspect ratio at every breakpoint with no layout shift.

Fix anything found during this pass before proceeding.

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx components/ui/AnimatedSection.tsx app/opengraph-image.tsx app/sitemap.ts app/robots.ts
git commit -m "feat: compose full landing page and add OG image, sitemap, robots"
```

**Do not run `git push`** — authentication in this environment cannot complete GitHub's OAuth flow. Tell the user the branch is ready locally and to run `git push -u origin main` themselves (or ask them to re-trigger the push once they've authenticated once, since Git will remember the credential after that).

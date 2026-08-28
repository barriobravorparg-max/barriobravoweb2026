# Auth + Shell de Cuenta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire real Discord login (via Supabase Auth) into the existing landing page's Navbar, and add a protected `/mi-cuenta` shell with four tabs — one showing real account data, three as clean empty states for future sub-projects to fill in.

**Architecture:** `@supabase/ssr` handles session cookies across Server and Client Components. The landing's Navbar becomes session-aware (fed by a Server Component that reads the session cheaply via `getSession()`); the new `/mi-cuenta` route is gated by a stronger, network-verified `getUser()` check. No new database tables — Discord OAuth via Supabase already populates `user_metadata` with everything this sub-project needs.

**Tech Stack:** Next.js 15 App Router, `@supabase/supabase-js` + `@supabase/ssr`, existing Tailwind/Vitest/Testing Library setup from sub-project 1.

**Spec:** [docs/superpowers/specs/2026-08-27-auth-cuenta-design.md](../specs/2026-08-27-auth-cuenta-design.md)

## Global Constraints

- Package manager: npm (established in sub-project 1).
- `.env.local` already exists locally with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` populated — gitignored, do not print its contents or commit it, and do not create a `.env.example` unless asked.
- Only the anon key is used anywhere in this sub-project. Never reference a `service_role` key or `SUPABASE_SERVICE_ROLE_KEY` env var.
- No new Postgres tables, no RLS policies — Discord OAuth via Supabase already stores avatar/username/email in `auth.users`/`user_metadata`. RLS starts in the Tienda sub-project when real user-data tables first appear.
- Session reads split by purpose: `getSession()` (cheap, local JWT read, no network round-trip) for the ambient Navbar display used on every page; `getUser()` (verified against the Supabase Auth server) only for the actual `/mi-cuenta` access gate. Never use `getUser()` in the Navbar path — it would add a network round-trip to every page load of the public marketing site.
- The only button that triggers Discord OAuth login in this sub-project is the Navbar's "Discord" button (desktop and mobile). The Hero's three CTAs ("Conectar al servidor", "Unirse a Discord", "Postularte a whitelist") and the Navbar's "Conectar" button are explicitly out of scope — they stay disabled exactly as sub-project 1 left them. Do not touch `components/sections/Hero.tsx`.
- Discord avatar images are served from `cdn.discordapp.com` — must be declared in `next.config.ts`'s `images.remotePatterns` before any `next/image` usage of an avatar URL will work.
- Do not run `git push` — this environment cannot complete GitHub's interactive OAuth flow; commit locally only.
- Creating the actual Discord application (Client ID/Secret) and enabling the Discord provider in the Supabase dashboard are manual steps for the human, guided in Task 9 — do not attempt to automate or skip around them.

---

### Task 1: Supabase client/server helpers, middleware, and user mapping

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/user.ts`, `lib/supabase/user.test.ts`, `middleware.ts`
- Modify: `next.config.ts`, `package.json`

**Interfaces:**
- Produces: `createClient()` (browser, from `lib/supabase/client.ts`, sync, no args) — used by Task 6 and Task 8. `createClient()` (server, from `lib/supabase/server.ts`, **async**, no args, returns `Promise<SupabaseClient>`) — used by Task 2, 7, 9. `AppUser` type and `toAppUser(user: User): AppUser` (from `lib/supabase/user.ts`) — used by Task 6, 7, 8, 9. `AppUser` shape: `{ avatarUrl: string | null; displayName: string; email: string | null }`.

- [ ] **Step 1: Install dependencies**

Run: `npm install @supabase/supabase-js @supabase/ssr`

- [ ] **Step 2: Write the failing test for `toAppUser`**

```ts
// lib/supabase/user.test.ts
import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { toAppUser } from "./user";

function makeUser(metadata: Record<string, unknown> = {}, email: string | null = "fundador@example.com"): User {
  return {
    id: "u1",
    app_metadata: {},
    user_metadata: metadata,
    aud: "authenticated",
    created_at: "",
    email: email ?? undefined,
  } as User;
}

describe("toAppUser", () => {
  it("prefers full_name for the display name", () => {
    const user = makeUser({ full_name: "Fundador", user_name: "fundador123", avatar_url: "https://cdn.discordapp.com/a.png" });
    expect(toAppUser(user)).toEqual({
      avatarUrl: "https://cdn.discordapp.com/a.png",
      displayName: "Fundador",
      email: "fundador@example.com",
    });
  });

  it("falls back to user_name when full_name is missing", () => {
    const user = makeUser({ user_name: "fundador123" });
    expect(toAppUser(user).displayName).toBe("fundador123");
  });

  it("falls back to email when no name metadata is present", () => {
    const user = makeUser({});
    expect(toAppUser(user).displayName).toBe("fundador@example.com");
  });

  it("falls back to a generic label when nothing is available", () => {
    const user = makeUser({}, null);
    expect(toAppUser(user).displayName).toBe("Usuario");
  });

  it("returns a null avatarUrl when metadata has none", () => {
    const user = makeUser({});
    expect(toAppUser(user).avatarUrl).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- user.test.ts`
Expected: FAIL — cannot find module `./user`.

- [ ] **Step 4: Write `lib/supabase/user.ts`**

```ts
import type { User } from "@supabase/supabase-js";

export interface AppUser {
  avatarUrl: string | null;
  displayName: string;
  email: string | null;
}

export function toAppUser(user: User): AppUser {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName = typeof meta.full_name === "string" ? meta.full_name : null;
  const userName = typeof meta.user_name === "string" ? meta.user_name : null;
  const avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : null;

  return {
    avatarUrl,
    displayName: fullName || userName || user.email || "Usuario",
    email: user.email ?? null,
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- user.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Write `lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 7: Write `lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render — the middleware is
            // responsible for refreshing the session cookie in that case.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 8: Write `middleware.ts`** (project root, sibling to `app/`)

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 9: Modify `next.config.ts`** to allow Discord's avatar CDN

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
      },
    ],
  },
};

export default nextConfig;
```

- [ ] **Step 10: Verify the app still builds**

Run: `npm run build`
Expected: succeeds. The `/` route may still show as static (○) at this point — it only becomes dynamic once Task 9 wires session reads into it.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json lib/supabase/client.ts lib/supabase/server.ts lib/supabase/user.ts lib/supabase/user.test.ts middleware.ts next.config.ts
git commit -m "feat: add Supabase client/server helpers, session middleware, and user mapping"
```

---

### Task 2: Discord OAuth callback route

**Files:**
- Create: `app/auth/callback/route.ts`, `app/auth/callback/route.test.ts`

**Interfaces:**
- Consumes: `createClient()` from `lib/supabase/server.ts` (Task 1).
- Produces: `GET(request: NextRequest): Promise<NextResponse>` — a Next.js Route Handler at `/auth/callback`, the `redirectTo` target used by Task 8's login button.

- [ ] **Step 1: Write the failing test**

```ts
// app/auth/callback/route.test.ts
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const exchangeCodeForSession = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession },
  }),
}));

describe("GET /auth/callback", () => {
  it("redirects to /mi-cuenta when the code exchange succeeds", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: null });
    const request = new NextRequest("http://localhost:3000/auth/callback?code=abc123");

    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/mi-cuenta");
  });

  it("redirects to /?auth_error=1 when the code exchange fails", async () => {
    exchangeCodeForSession.mockResolvedValueOnce({ error: new Error("invalid code") });
    const request = new NextRequest("http://localhost:3000/auth/callback?code=bad");

    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth_error=1");
  });

  it("redirects to /?auth_error=1 when there is no code in the URL", async () => {
    const request = new NextRequest("http://localhost:3000/auth/callback");

    const response = await GET(request);

    expect(response.headers.get("location")).toBe("http://localhost:3000/?auth_error=1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- route.test.ts`
Expected: FAIL — cannot find module `./route`.

- [ ] **Step 3: Write `app/auth/callback/route.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/mi-cuenta`);
    }
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- route.test.ts`
Expected: PASS (3 tests).

If `NextRequest`/`NextResponse` behave unexpectedly under Vitest's jsdom environment (e.g. `Request`/`Response` globals conflict), that's a legitimate environment snag — report BLOCKED with the exact failure rather than guessing repeatedly.

- [ ] **Step 5: Commit**

```bash
git add app/auth/callback/route.ts app/auth/callback/route.test.ts
git commit -m "feat: add Discord OAuth callback route handler"
```

---

### Task 3: Shared accessible Tabs primitive

**Files:**
- Create: `components/ui/Tabs.tsx`, `components/ui/Tabs.test.tsx`

**Interfaces:**
- Produces: `Tabs({ items: {label: string}[], activeIndex: number, onChange: (index: number) => void, panelId: string, tablistLabel: string })` and `tabPanelLabelledBy(panelId: string, activeIndex: number): string`. Consumed by Task 4 (retrofitting `Facciones.tsx`) and Task 6 (`AccountTabs.tsx`). The tab buttons get `id={`${panelId}-tab-${i}`}` and `aria-controls={panelId}`; the CONSUMER is responsible for rendering the actual `role="tabpanel"` element with `id={panelId}` and `aria-labelledby={tabPanelLabelledBy(panelId, activeIndex)}`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/Tabs.test.tsx
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tabs, tabPanelLabelledBy } from "./Tabs";

const ITEMS = [{ label: "Uno" }, { label: "Dos" }, { label: "Tres" }];

function StatefulTabs() {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <>
      <Tabs items={ITEMS} activeIndex={activeIndex} onChange={setActiveIndex} panelId="test-panel" tablistLabel="Test tabs" />
      <div id="test-panel" role="tabpanel" aria-labelledby={tabPanelLabelledBy("test-panel", activeIndex)}>
        {ITEMS[activeIndex].label}
      </div>
    </>
  );
}

describe("Tabs", () => {
  it("switches active tab on click and updates aria-selected/tabIndex on both tabs", async () => {
    const user = userEvent.setup();
    render(<StatefulTabs />);

    const first = screen.getByRole("tab", { name: "Uno" });
    const second = screen.getByRole("tab", { name: "Dos" });
    expect(first).toHaveAttribute("aria-selected", "true");
    expect(first).toHaveAttribute("tabindex", "0");
    expect(second).toHaveAttribute("aria-selected", "false");
    expect(second).toHaveAttribute("tabindex", "-1");

    await user.click(second);

    expect(first).toHaveAttribute("aria-selected", "false");
    expect(first).toHaveAttribute("tabindex", "-1");
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(second).toHaveAttribute("tabindex", "0");
  });

  it("wraps around with ArrowLeft from the first tab to the last", async () => {
    const user = userEvent.setup();
    render(<StatefulTabs />);

    screen.getByRole("tab", { name: "Uno" }).focus();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("tab", { name: "Tres" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Tres" })).toHaveAttribute("aria-selected", "true");
  });

  it("wraps around with ArrowRight from the last tab to the first", async () => {
    const user = userEvent.setup();
    render(<StatefulTabs />);

    await user.click(screen.getByRole("tab", { name: "Tres" }));
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "Uno" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Uno" })).toHaveAttribute("aria-selected", "true");
  });

  it("links the tabpanel to the active tab via aria-controls/aria-labelledby", async () => {
    const user = userEvent.setup();
    render(<StatefulTabs />);

    const panel = screen.getByRole("tabpanel");
    expect(screen.getByRole("tab", { name: "Uno" })).toHaveAttribute("aria-controls", "test-panel");
    expect(panel).toHaveAttribute("id", "test-panel");
    expect(panel).toHaveAttribute("aria-labelledby", "test-panel-tab-0");

    await user.click(screen.getByRole("tab", { name: "Dos" }));
    expect(panel).toHaveAttribute("aria-labelledby", "test-panel-tab-1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Tabs.test.tsx`
Expected: FAIL — cannot find module `./Tabs`.

- [ ] **Step 3: Write `components/ui/Tabs.tsx`**

```tsx
"use client";

import { useRef } from "react";

export interface TabItem {
  label: string;
}

interface TabsProps {
  items: TabItem[];
  activeIndex: number;
  onChange: (index: number) => void;
  panelId: string;
  tablistLabel: string;
}

export function tabPanelLabelledBy(panelId: string, activeIndex: number) {
  return `${panelId}-tab-${activeIndex}`;
}

export function Tabs({ items, activeIndex, onChange, panelId, tablistLabel }: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (activeIndex + dir + items.length) % items.length;
    onChange(next);
    tabRefs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={tablistLabel} className="flex gap-2 overflow-x-auto pb-2 sm:justify-center">
      {items.map((item, i) => (
        <button
          key={item.label}
          id={`${panelId}-tab-${i}`}
          ref={(el) => {
            tabRefs.current[i] = el;
          }}
          role="tab"
          aria-selected={i === activeIndex}
          aria-controls={panelId}
          tabIndex={i === activeIndex ? 0 : -1}
          onClick={() => onChange(i)}
          onKeyDown={handleKeyDown}
          className={`shrink-0 rounded-full border px-5 py-2 text-sm uppercase tracking-wide transition-colors ${
            i === activeIndex ? "border-peach text-peach" : "border-white/10 text-gray-400 hover:text-white"
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Tabs.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/ui/Tabs.tsx components/ui/Tabs.test.tsx
git commit -m "feat: add shared accessible Tabs primitive with roving tabindex"
```

---

### Task 4: Retrofit Facciones to use the shared Tabs primitive

**Files:**
- Modify: `components/sections/Facciones.tsx`
- Test: `components/sections/Facciones.test.tsx` (existing — must pass unmodified)

**Interfaces:**
- Consumes: `Tabs`, `tabPanelLabelledBy` from `components/ui/Tabs.tsx` (Task 3).

- [ ] **Step 1: Rewrite `components/sections/Facciones.tsx`**

```tsx
"use client";

import { useState } from "react";
import { facciones } from "@/lib/content";
import { Tabs, tabPanelLabelledBy } from "@/components/ui/Tabs";

export function Facciones() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = facciones[activeIndex];

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center">
        <h2 className="font-display text-4xl uppercase text-white sm:text-5xl">Facciones y trabajos</h2>
        <p className="mt-2 text-gray-400">Elegí tu camino dentro del barrio.</p>
      </div>

      <div className="mt-10">
        <Tabs
          items={facciones.map((f) => ({ label: f.category }))}
          activeIndex={activeIndex}
          onChange={setActiveIndex}
          panelId="facciones-panel"
          tablistLabel="Categorías de facciones"
        />
      </div>

      <div
        id="facciones-panel"
        role="tabpanel"
        aria-labelledby={tabPanelLabelledBy("facciones-panel", activeIndex)}
        tabIndex={0}
        className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
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

- [ ] **Step 2: Run the existing Facciones tests to confirm nothing broke**

Run: `npm test -- Facciones.test.tsx`
Expected: PASS (4 tests) — same behavioral contract (click switches category, ArrowRight moves focus and selection), unchanged since it queries by role/name/attribute values, not by exact DOM ids.

- [ ] **Step 3: Commit**

```bash
git add components/sections/Facciones.tsx
git commit -m "refactor: retrofit Facciones to use the shared Tabs primitive"
```

---

### Task 5: EmptyState primitive

**Files:**
- Create: `components/ui/EmptyState.tsx`, `components/ui/EmptyState.test.tsx`

**Interfaces:**
- Produces: `EmptyState({ title: string, description: string })`. Consumed by Task 6.

- [ ] **Step 1: Write the failing test**

```tsx
// components/ui/EmptyState.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the title, description, and the fixed availability note", () => {
    render(<EmptyState title="Perfil de Personaje" description="Todavía no hay datos." />);
    expect(screen.getByText("Perfil de Personaje")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay datos.")).toBeInTheDocument();
    expect(screen.getByText("Disponible en una próxima actualización")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- EmptyState.test.tsx`
Expected: FAIL — cannot find module `./EmptyState`.

- [ ] **Step 3: Write `components/ui/EmptyState.tsx`**

```tsx
interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
      <p className="font-display text-xl uppercase text-white">{title}</p>
      <p className="max-w-sm text-sm text-gray-400">{description}</p>
      <p className="mt-2 text-xs uppercase tracking-wide text-cyan">Disponible en una próxima actualización</p>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- EmptyState.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/EmptyState.tsx components/ui/EmptyState.test.tsx
git commit -m "feat: add reusable EmptyState primitive"
```

---

### Task 6: Account tabs shell (Datos de cuenta + 3 empty states)

**Files:**
- Create: `components/account/AccountDetails.tsx`, `components/account/AccountTabs.tsx`, `components/account/AccountTabs.test.tsx`

**Interfaces:**
- Consumes: `Tabs`, `tabPanelLabelledBy` from `components/ui/Tabs.tsx` (Task 3); `EmptyState` from `components/ui/EmptyState.tsx` (Task 5); `AppUser` from `lib/supabase/user.ts` (Task 1); `createClient()` (browser) from `lib/supabase/client.ts` (Task 1).
- Produces: `AccountTabs({ user: AppUser })`, `AccountDetails({ user: AppUser })`. `AccountTabs` is consumed by Task 7.

- [ ] **Step 1: Write `components/account/AccountDetails.tsx`**

```tsx
"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import type { AppUser } from "@/lib/supabase/user";

interface AccountDetailsProps {
  user: AppUser;
}

export function AccountDetails({ user }: AccountDetailsProps) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" width={80} height={80} className="rounded-full" />
      ) : (
        <div className="h-20 w-20 shrink-0 rounded-full bg-purple/10" />
      )}
      <div>
        <p className="font-display text-2xl uppercase text-white">{user.displayName}</p>
        {user.email && <p className="text-sm text-gray-400">{user.email}</p>}
        <Button variant="outline-purple" onClick={handleLogout} className="mt-4">
          Salir
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the failing test for AccountTabs**

```tsx
// components/account/AccountTabs.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AccountTabs } from "./AccountTabs";
import type { AppUser } from "@/lib/supabase/user";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const user: AppUser = { avatarUrl: null, displayName: "Fundador", email: "fundador@example.com" };

describe("AccountTabs", () => {
  it("declares all four tabs and shows account details by default", () => {
    render(<AccountTabs user={user} />);
    expect(screen.getByRole("tab", { name: "Datos de cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Perfil de Personaje" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Historial de compras" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "VIP activo" })).toBeInTheDocument();
    expect(screen.getByText("Fundador")).toBeInTheDocument();
  });

  it("shows the empty state when another tab is selected", async () => {
    const userEvt = userEvent.setup();
    render(<AccountTabs user={user} />);
    await userEvt.click(screen.getByRole("tab", { name: "Perfil de Personaje" }));
    expect(screen.getByText("Disponible en una próxima actualización")).toBeInTheDocument();
    expect(screen.queryByText("Fundador")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- AccountTabs.test.tsx`
Expected: FAIL — cannot find module `./AccountTabs`.

- [ ] **Step 4: Write `components/account/AccountTabs.tsx`**

```tsx
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- AccountTabs.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add components/account/AccountDetails.tsx components/account/AccountTabs.tsx components/account/AccountTabs.test.tsx
git commit -m "feat: add account shell with real account details and empty-state tabs"
```

---

### Task 7: Protected `/mi-cuenta` route

**Files:**
- Create: `app/mi-cuenta/page.tsx`, `app/mi-cuenta/page.test.tsx`

**Interfaces:**
- Consumes: `createClient()` (server) and `toAppUser` from `lib/supabase/server.ts`/`lib/supabase/user.ts` (Task 1), `AccountTabs` from `components/account/AccountTabs.tsx` (Task 6).

- [ ] **Step 1: Write the failing test**

```tsx
// app/mi-cuenta/page.test.tsx
import { describe, expect, it, vi } from "vitest";
import MiCuentaPage from "./page";

const redirectMock = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser },
  }),
}));

describe("MiCuentaPage", () => {
  it("redirects to / when there is no authenticated user", async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });

    await MiCuentaPage();

    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/mi-cuenta/page.test.tsx`
Expected: FAIL — cannot find module `./page`.

- [ ] **Step 3: Write `app/mi-cuenta/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { toAppUser } from "@/lib/supabase/user";
import { AccountTabs } from "@/components/account/AccountTabs";

export default async function MiCuentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl uppercase text-white sm:text-5xl">Mi cuenta</h1>
      <div className="mt-10">
        <AccountTabs user={toAppUser(user)} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- app/mi-cuenta/page.test.tsx`
Expected: PASS.

The "renders account tabs when authenticated" path is intentionally not covered by an automated test here — it's exercised in Task 9's manual end-to-end login verification instead, since faking a full authenticated Server Component render adds more test fragility than value.

- [ ] **Step 5: Commit**

```bash
git add app/mi-cuenta/page.tsx app/mi-cuenta/page.test.tsx
git commit -m "feat: add protected /mi-cuenta route with getUser() gate"
```

---

### Task 8: Session-aware Navbar

**Files:**
- Modify: `components/layout/Navbar.tsx`
- Test: `components/layout/Navbar.test.tsx` (existing — extend)

**Interfaces:**
- Consumes: `createClient()` (browser) from `lib/supabase/client.ts`, `AppUser` from `lib/supabase/user.ts` (Task 1).
- Produces: `Navbar({ user: AppUser | null })` — the `user` prop is now **required**. Consumed by Task 9's `PageShell`.

- [ ] **Step 1: Rewrite the failing/extended test file**

```tsx
// components/layout/Navbar.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Navbar } from "./Navbar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("Navbar", () => {
  it("toggles the mobile menu open and closed", async () => {
    const user = userEvent.setup();
    render(<Navbar user={null} />);

    const toggle = screen.getByRole("button", { name: /menú/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByText("Inicio").length).toBeGreaterThan(0);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("shows the Discord login button enabled and Conectar disabled when there is no session", () => {
    render(<Navbar user={null} />);
    expect(screen.getByRole("button", { name: "Discord" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Conectar" })).toBeDisabled();
  });

  it("shows the avatar, Mi Cuenta link, and Salir button when there is a session", () => {
    render(<Navbar user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    expect(screen.getByRole("link", { name: "Mi Cuenta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salir" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Discord" })).not.toBeInTheDocument();
  });

  it("shows Mi Cuenta and Salir in the mobile menu too when there is a session", async () => {
    const userEvt = userEvent.setup();
    render(<Navbar user={{ avatarUrl: null, displayName: "Fundador", email: null }} />);
    await userEvt.click(screen.getByRole("button", { name: /menú/i }));
    expect(screen.getAllByRole("link", { name: "Mi Cuenta" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Salir" })).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Navbar.test.tsx`
Expected: FAIL — `Navbar` doesn't accept a `user` prop yet, login/logout UI doesn't exist.

- [ ] **Step 3: Rewrite `components/layout/Navbar.tsx`**

```tsx
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
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt="" width={32} height={32} className="rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-purple/10" />
              )}
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
                Discord
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Navbar.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/layout/Navbar.tsx components/layout/Navbar.test.tsx
git commit -m "feat: make Navbar session-aware with Discord login/logout"
```

---

### Task 9: Wire session into the page, handle auth errors, and verify end-to-end

**Files:**
- Create: `components/PageShell.tsx`
- Modify: `app/page.tsx`, `app/page.test.tsx`

**Interfaces:**
- Consumes: `createClient()` (server) + `toAppUser` from Task 1, `Navbar` from Task 8, all section components (unchanged, from sub-project 1).

- [ ] **Step 1: Create `components/PageShell.tsx`** (moves the current content of `app/page.tsx` here, adds the `user` prop and the auth-error banner)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import type { AppUser } from "@/lib/supabase/user";

interface PageShellProps {
  user: AppUser | null;
}

export function PageShell({ user }: PageShellProps) {
  const [loaded, setLoaded] = useState(false);
  const searchParams = useSearchParams();
  const hasAuthError = searchParams.get("auth_error") === "1";

  useEffect(() => {
    document.body.style.overflow = loaded ? "" : "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [loaded]);

  return (
    <>
      {!loaded && <LoadingScreen onFinish={() => setLoaded(true)} />}
      <Navbar user={user} />
      {hasAuthError && (
        <div role="alert" className="bg-coral/10 px-4 py-3 text-center text-sm text-coral">
          No pudimos conectarte con Discord. Probá de nuevo.
        </div>
      )}
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

- [ ] **Step 2: Rewrite `app/page.tsx`**

```tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { toAppUser } from "@/lib/supabase/user";
import { PageShell } from "@/components/PageShell";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <Suspense fallback={null}>
      <PageShell user={session ? toAppUser(session.user) : null} />
    </Suspense>
  );
}
```

- [ ] **Step 3: Update `app/page.test.tsx`** to account for `Home` now being async and session-aware

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

vi.mock("@/components/loading/LoadingScreen", () => ({
  LoadingScreen: ({ onFinish }: { onFinish: () => void }) => (
    <div>
      <p>Cargando...</p>
      <button onClick={onFinish}>Terminar carga (mock)</button>
    </div>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const getSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getSession },
  }),
}));

describe("Home", () => {
  it("keeps section content in the DOM under the loading overlay, then removes the overlay once it finishes", async () => {
    getSession.mockResolvedValueOnce({ data: { session: null } });
    const user = userEvent.setup();

    const element = await Home();
    render(element);

    expect(screen.getByText("Cargando...")).toBeInTheDocument();
    expect(screen.getByText("Qué te espera")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /terminar carga/i }));

    expect(screen.queryByText("Cargando...")).not.toBeInTheDocument();
    expect(screen.getByText("Qué te espera")).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all tests pass across every file (existing sub-project 1 tests plus everything added in this plan).

- [ ] **Step 5: Run typecheck, build, and lint**

Run: `npm run typecheck && npm run build && npm run lint`
Expected: all succeed. The `/` route will now show as dynamic (ƒ) in the build output instead of static (○) — that's expected and correct, since it now reads the session on every request; it is not a regression.

- [ ] **Step 6: Guide the human partner through the manual Discord + Supabase setup**

This is not something to automate — walk the user through it directly in conversation:

1. Discord Developer Portal (discord.com/developers/applications) → New Application → name it (e.g. "Barrio Bravo RP") → OAuth2 tab → copy the **Client ID** and **Client Secret**.
2. In the same OAuth2 tab, add a Redirect: `https://ufuwgdjxrodlwklzlqrx.supabase.co/auth/v1/callback` (Supabase's own callback, not this app's `/auth/callback` — Supabase sits between Discord and the app).
3. Supabase dashboard → this project → Authentication → Providers → Discord → toggle it on → paste the Client ID and Client Secret from step 1 → Save.
4. Supabase dashboard → Authentication → URL Configuration → add `http://localhost:3000/**` to Redirect URLs for local testing (and the production domain once deployed).

- [ ] **Step 7: Manual end-to-end verification in the browser**

Once Step 6 is done, start the dev server and verify:
- Landing loads normally, Navbar shows "Discord" (enabled) and "Conectar" (disabled) when logged out.
- Clicking "Discord" redirects to Discord's consent screen, then back through `/auth/callback`, landing on `/mi-cuenta`.
- `/mi-cuenta` shows the "Datos de cuenta" tab by default with the real Discord avatar/name; the other three tabs show their empty states with "Disponible en una próxima actualización".
- Navbar (desktop and mobile menu) now shows the avatar + "Mi Cuenta" + "Salir" instead of the login buttons.
- Clicking "Salir" logs out and the Navbar reverts to the logged-out state without needing a manual page refresh.
- Visiting `/mi-cuenta` directly while logged out redirects to `/`.
- Denying/cancelling the Discord consent screen redirects back to `/` with the "No pudimos conectarte con Discord" banner visible.
- Facciones tabs (retrofitted in Task 4) still work exactly as before — click to switch, arrow keys to navigate.

Fix anything found during this pass before proceeding.

- [ ] **Step 8: Commit**

```bash
git add components/PageShell.tsx app/page.tsx app/page.test.tsx
git commit -m "feat: wire session into the landing page and handle OAuth errors"
```

**Do not run `git push`** — hand the branch to the user to push themselves, same as every prior sub-project.

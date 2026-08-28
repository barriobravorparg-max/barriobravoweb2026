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

export function getDiscordId(user: User): string | null {
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const providerId = typeof meta.provider_id === "string" ? meta.provider_id : null;
  const sub = typeof meta.sub === "string" ? meta.sub : null;
  return providerId || sub;
}

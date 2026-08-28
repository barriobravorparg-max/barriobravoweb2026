import { describe, expect, it, afterEach } from "vitest";
import { createAdminClient } from "./admin";

describe("createAdminClient", () => {
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => createAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("constructs a client when both env vars are present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    expect(() => createAdminClient()).not.toThrow();
  });
});

import { timingSafeEqual } from "crypto";

export function checkDevlogPassword(password: string | undefined): boolean {
  const adminPassword = process.env.ADMIN_DEVLOG_PASSWORD;
  if (!adminPassword || !password) return false;

  const bufA = Buffer.from(password);
  const bufB = Buffer.from(adminPassword);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

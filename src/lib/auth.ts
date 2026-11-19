import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, gt, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Role } from "./workflow";

// Unique name so it never clashes with other apps on localhost.
const COOKIE = "miserve_session";
const SESSION_DAYS = 7;

function hashToken(token: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return createHash("sha256").update(token).digest("hex");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(schema.sessions).values({ id: hashToken(token), userId, expiresAt });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  }
  store.delete(COOKIE);
}

/** Signs the user out everywhere except the browser making this request. */
export async function revokeOtherSessions(userId: string) {
  const token = (await cookies()).get(COOKIE)?.value;
  const keep = token ? hashToken(token) : "";
  await db
    .delete(schema.sessions)
    .where(and(eq(schema.sessions.userId, userId), ne(schema.sessions.id, keep)));
}

export type CurrentUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId: number | null;
};

/** The signed-in user, or null. Cached for the length of one request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      fullName: schema.users.fullName,
      role: schema.users.role,
      departmentId: schema.users.departmentId,
      active: schema.users.active,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.id, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row || !row.active) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    role: row.role,
    departmentId: row.departmentId,
  };
});

/** Redirects to /login when signed out, and to /dashboard when the role is not allowed. */
export async function requireUser(roles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}

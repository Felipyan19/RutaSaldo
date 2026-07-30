import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "./index";
import { seedWorkspace } from "./seed";
import { users, workspaces } from "./schema";

type GoogleUserProfile = {
  providerAccountId: string;
  email: string;
  name?: string | null;
  image?: string | null;
  consentVersion: string;
};

function workspaceIdForGoogleAccount(providerAccountId: string) {
  const digest = createHash("sha256").update(`google:${providerAccountId}`).digest("hex").slice(0, 32);
  return `workspace_${digest}`;
}

export async function findGoogleUser(providerAccountId: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(and(
    eq(users.provider, "google"),
    eq(users.providerAccountId, providerAccountId),
  ));
  return user ?? null;
}

export async function createGoogleUser(profile: GoogleUserProfile) {
  const db = getDb();
  const userId = `google:${profile.providerAccountId}`;
  const workspaceId = workspaceIdForGoogleAccount(profile.providerAccountId);

  await db.insert(workspaces).values({ id: workspaceId, name: "Mis finanzas" }).onConflictDoNothing();
  await db.insert(users).values({
    id: userId,
    provider: "google",
    providerAccountId: profile.providerAccountId,
    email: profile.email,
    name: profile.name ?? null,
    image: profile.image ?? null,
    workspaceId,
    googleDataConsentAt: new Date(),
    googleDataConsentVersion: profile.consentVersion,
  });

  await seedWorkspace(db, workspaceId);
  return { id: userId, workspaceId };
}

export async function getWorkspaceIdForUser(userId: string) {
  const db = getDb();
  const [user] = await db.select({ workspaceId: users.workspaceId }).from(users).where(eq(users.id, userId));
  return user?.workspaceId ?? null;
}

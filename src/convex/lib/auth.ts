import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export type ReadCtx = QueryCtx | MutationCtx;

export async function getCurrentUserId(ctx: ReadCtx) {
  return await getAuthUserId(ctx);
}

export async function requireUserId(ctx: ReadCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Please sign in to continue.");
  }
  return userId;
}

export async function getMyProfile(ctx: ReadCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

export async function requireProfile(ctx: ReadCtx) {
  const userId = await requireUserId(ctx);
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!profile || !profile.onboardingComplete) {
    throw new Error("Finish setting up your profile first.");
  }
  return { userId, profile };
}

export async function isAdmin(ctx: ReadCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  return user?.role === "admin";
}

export async function requireAdmin(ctx: ReadCtx) {
  const userId = await requireUserId(ctx);
  if (!(await isAdmin(ctx, userId))) {
    throw new Error("Moderator access is required for this action.");
  }
  return userId;
}

/** True when either person has blocked the other. */
export async function isBlockedPair(
  ctx: ReadCtx,
  a: Id<"users">,
  b: Id<"users">,
) {
  const forward = await ctx.db
    .query("blocks")
    .withIndex("by_pair", (q) => q.eq("blockerId", a).eq("blockedId", b))
    .unique();
  if (forward) return true;
  const backward = await ctx.db
    .query("blocks")
    .withIndex("by_pair", (q) => q.eq("blockerId", b).eq("blockedId", a))
    .unique();
  return backward !== null;
}

export async function requireNotBlocked(
  ctx: ReadCtx,
  viewerId: Id<"users">,
  otherId: Id<"users">,
) {
  if (await isBlockedPair(ctx, viewerId, otherId)) {
    throw new Error(
      "This interaction isn't available because one of you has blocked the other.",
    );
  }
}

export async function listBlockedIds(ctx: ReadCtx, userId: Id<"users">) {
  const [outgoing, incoming] = await Promise.all([
    ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", userId))
      .collect(),
    ctx.db
      .query("blocks")
      .withIndex("by_blocked", (q) => q.eq("blockedId", userId))
      .collect(),
  ]);
  return new Set<string>([
    ...outgoing.map((row) => row.blockedId as string),
    ...incoming.map((row) => row.blockerId as string),
  ]);
}

export async function writeAudit(
  ctx: MutationCtx,
  actorId: Id<"users">,
  action: string,
  targetType: string,
  targetId: string,
  note?: string,
) {
  await ctx.db.insert("auditLog", {
    actorId,
    action,
    targetType,
    targetId,
    note,
    createdAt: Date.now(),
  });
}

export function publicProfile(profile: {
  userId: Id<"users">;
  displayName: string;
  city: string;
  area: string;
  bio: string;
  languages: string[];
  interests: string[];
  activities: string[];
  availability: string[];
  groupSize: "one" | "small" | "large";
  budget: "free" | "low" | "flexible";
  comfort: "quiet" | "balanced" | "lively";
  isDemo?: boolean;
}) {
  // Explicit allow-list. Email, phone, exact address, blocks and moderation
  // fields never leave the server through this shape.
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    city: profile.city,
    area: profile.area,
    bio: profile.bio,
    languages: profile.languages,
    interests: profile.interests,
    activities: profile.activities,
    availability: profile.availability,
    groupSize: profile.groupSize,
    budget: profile.budget,
    comfort: profile.comfort,
    isDemo: profile.isDemo ?? false,
  };
}

export async function approvedParticipantIds(
  ctx: ReadCtx,
  activityId: Id<"activities">,
) {
  const requests = await ctx.db
    .query("joinRequests")
    .withIndex("by_activity", (q) => q.eq("activityId", activityId))
    .collect();
  return requests
    .filter((request) => request.status === "approved")
    .map((request) => request.userId);
}

export async function connectionExists(
  ctx: ReadCtx,
  a: Id<"users">,
  b: Id<"users">,
) {
  const [userA, userB] = [a, b].sort();
  const existing = await ctx.db
    .query("connections")
    .withIndex("by_pair", (q) =>
      q.eq("userA", userA as Id<"users">).eq("userB", userB as Id<"users">),
    )
    .unique();
  return existing !== null;
}

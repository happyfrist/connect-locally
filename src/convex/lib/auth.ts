import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { guestDemoEnabled, rateLimitBucket } from "./policy";

export type ReadCtx = QueryCtx | MutationCtx;
export type AccountStatus = "active" | "disabled" | "deleting" | "deleted";

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

export function accountStatusOf(user: Doc<"users"> | null): AccountStatus {
  if (!user) return "deleted";
  return user.accountStatus ?? "active";
}

export async function isAccountActive(ctx: ReadCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  return accountStatusOf(user) === "active";
}

/** All product actions use this check, regardless of which screen calls them. */
export async function requireActiveAccount(ctx: ReadCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  const status = accountStatusOf(user);
  if (status === "disabled") {
    throw new Error("This account is disabled. Contact the operator to appeal.");
  }
  if (status === "deleting") {
    throw new Error("This account is being deleted and can no longer be used.");
  }
  if (status === "deleted") {
    throw new Error("This account has been deleted.");
  }
  return user!;
}

/** Active account plus the production rule that guests are demo-only. */
export async function requireParticipationAccount(
  ctx: ReadCtx,
  userId: Id<"users">,
) {
  const user = await requireActiveAccount(ctx, userId);
  if (user.isAnonymous && !guestDemoEnabled(process.env)) {
    throw new Error(
      "Guest accounts are available only in an explicit demo deployment. Sign in with email to take part.",
    );
  }
  return user;
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
  await requireParticipationAccount(ctx, userId);
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
  if (accountStatusOf(user) !== "active") return false;
  return user?.role === "admin";
}

export async function isModerator(ctx: ReadCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (accountStatusOf(user) !== "active") return false;
  return user?.role === "admin" || user?.role === "moderator";
}

/** Moderation queues are available to moderators and the deployment owner/admin. */
export async function requireModerator(ctx: ReadCtx) {
  const userId = await requireUserId(ctx);
  await requireActiveAccount(ctx, userId);
  if (!(await isModerator(ctx, userId))) {
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

/**
 * The single profile visibility policy for every product surface.
 * Hidden, blocked, disabled, deleting and deleted members are omitted unless
 * the viewer is that member. Moderation must read records directly.
 */
export async function getVisibleProfile(
  ctx: ReadCtx,
  viewerId: Id<"users">,
  targetId: Id<"users">,
) {
  if (viewerId !== targetId) {
    if (await isBlockedPair(ctx, viewerId, targetId)) return null;
    if (!(await isAccountActive(ctx, targetId))) return null;
  }
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", targetId))
    .unique();
  if (!profile || !profile.onboardingComplete) return null;
  if (viewerId !== targetId && profile.hidden) return null;
  return profile;
}

export async function getVisiblePublicProfile(
  ctx: ReadCtx,
  viewerId: Id<"users">,
  targetId: Id<"users">,
) {
  const profile = await getVisibleProfile(ctx, viewerId, targetId);
  return profile ? publicProfile(profile) : null;
}

/**
 * Revoke every Convex Auth session and refresh token for a user. Access JWTs
 * already issued stop working as soon as the account status is not active.
 */
export async function revokeAuthSessions(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const sessions = await ctx.db
    .query("authSessions")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .collect();
  for (const session of sessions) {
    const refreshTokens = await ctx.db
      .query("authRefreshTokens")
      .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
      .collect();
    for (const token of refreshTokens) await ctx.db.delete(token._id);
    await ctx.db.delete(session._id);
  }
}

/**
 * Remove provider identities and outstanding verification codes. The scrubbed
 * users row is kept as a tombstone for moderation/audit references.
 */
export async function revokeAuthAccounts(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  const accounts = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .collect();
  for (const account of accounts) {
    const codes = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .collect();
    for (const code of codes) await ctx.db.delete(code._id);
    await ctx.db.delete(account._id);
  }
}

export async function deleteAuthIdentity(
  ctx: MutationCtx,
  userId: Id<"users">,
) {
  await revokeAuthSessions(ctx, userId);
  await revokeAuthAccounts(ctx, userId);
}

/**
 * Application-level fixed-window throttle for sensitive mutations. Convex
 * serialisable transactions make concurrent increments safe.
 */
export async function enforceRateLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  limit: number,
  windowMs: number,
) {
  const now = Date.now();
  const { bucket, windowStart } = rateLimitBucket(
    `${action}:${userId}`,
    now,
    windowMs,
  );
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_bucket", (q) => q.eq("bucket", bucket))
    .unique();
  if (row && row.count >= limit) {
    throw new Error("Too many attempts. Take a short break and try again.");
  }
  if (row) {
    await ctx.db.patch(row._id, { count: row.count + 1 });
  } else {
    await ctx.db.insert("rateLimits", {
      bucket,
      windowStart,
      count: 1,
    });
  }
}

export async function writeAudit(
  ctx: MutationCtx,
  actorId: Id<"users"> | null,
  action: string,
  targetType: string,
  targetId: string,
  note?: string,
) {
  await ctx.db.insert("auditLog", {
    actorId: actorId ?? undefined,
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

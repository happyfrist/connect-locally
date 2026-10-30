import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
import {
  budgetValidator,
  comfortValidator,
  groupSizeValidator,
} from "./schema";
import {
  accountStatusOf,
  deleteAuthIdentity,
  enforceRateLimit,
  getCurrentUserId,
  getMyProfile,
  getVisiblePublicProfile,
  isModerator,
  publicProfile,
  requireParticipationAccount,
  requireProfile,
  requireUserId,
  writeAudit,
} from "./lib/auth";

const profileFields = {
  displayName: v.string(),
  city: v.string(),
  area: v.string(),
  bio: v.string(),
  languages: v.array(v.string()),
  interests: v.array(v.string()),
  activities: v.array(v.string()),
  availability: v.array(v.string()),
  groupSize: groupSizeValidator,
  budget: budgetValidator,
  comfort: comfortValidator,
};

const DAY = 24 * 60 * 60_000;
const DELETION_BATCH = 20;

function validateProfileInput(args: {
  displayName: string;
  city: string;
  area: string;
  bio: string;
  languages: string[];
  interests: string[];
  activities: string[];
  availability: string[];
}) {
  const displayName = args.displayName.trim();
  if (displayName.length < 2 || displayName.length > 40) {
    throw new Error("Choose a display name between 2 and 40 characters.");
  }
  if (!args.city.trim()) throw new Error("Add the city you live in.");
  if (!args.area.trim()) throw new Error("Add an area or neighbourhood.");
  if (args.bio.length > 280) {
    throw new Error("Keep your introduction under 280 characters.");
  }
  if (args.languages.length === 0) {
    throw new Error("Pick at least one language you're comfortable with.");
  }
  if (args.interests.length === 0) {
    throw new Error("Pick at least one interest so people can find you.");
  }
  if (args.interests.length > 9) {
    throw new Error("Pick up to nine interests.");
  }
  if (args.activities.length > 20) {
    throw new Error("Pick up to twenty preferred activities.");
  }
  if (args.availability.length === 0) {
    throw new Error("Tell people when you're usually free.");
  }
  return {
    ...args,
    displayName,
    city: args.city.trim(),
    area: args.area.trim(),
    bio: args.bio.trim(),
  };
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    const profile = await getMyProfile(ctx);
    const accountStatus = accountStatusOf(user);
    const active = accountStatus === "active";
    return {
      userId,
      email: user?.email ?? null,
      role: user?.role ?? "member",
      accountStatus,
      isModerator: await isModerator(ctx, userId),
      profile: active && profile ? publicProfile(profile) : null,
      onboardingComplete: active && (profile?.onboardingComplete ?? false),
    };
  },
});

export const completeOnboarding = mutation({
  args: {
    ...profileFields,
    confirmedAdult: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await requireParticipationAccount(ctx, userId);
    await enforceRateLimit(ctx, userId, "profile:write", 20, DAY);
    if (!args.confirmedAdult) {
      throw new Error("Connectmaxxing is an 18+ space. Confirm your age to continue.");
    }
    const clean = validateProfileInput(args);
    const existing = await getMyProfile(ctx);
    const payload = {
      displayName: clean.displayName,
      city: clean.city,
      area: clean.area,
      bio: clean.bio,
      languages: clean.languages,
      interests: clean.interests,
      activities: clean.activities,
      availability: clean.availability,
      groupSize: args.groupSize,
      budget: args.budget,
      comfort: args.comfort,
      ageConfirmed: true,
      onboardingComplete: true,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      userId,
      ...payload,
      isDemo: false,
    });
  },
});

export const update = mutation({
  args: profileFields,
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    await enforceRateLimit(ctx, userId, "profile:write", 20, DAY);
    const clean = validateProfileInput(args);
    await ctx.db.patch(profile._id, {
      ...clean,
      groupSize: args.groupSize,
      budget: args.budget,
      comfort: args.comfort,
    });
    return userId;
  },
});

/** Public view of another member. Hidden/blocked/disabled members return null. */
export const byUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId: viewerId } = await requireProfile(ctx);
    return await getVisiblePublicProfile(ctx, viewerId, args.userId);
  },
});

async function authUserForDeletion(ctx: MutationCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  const status = accountStatusOf(user);
  if (!user || status === "deleted") {
    throw new Error("This account has already been deleted.");
  }
  return user;
}

/**
 * Starts a resumable, indexed erasure job. Access is revoked synchronously;
 * bulk records are removed in bounded scheduled batches so a long history
 * cannot exceed one transaction.
 *
 * Retention exceptions (documented in PRIVACY.md): open/resolved moderation
 * reports and the audit log are retained, because erasing them would destroy
 * the safety record. The member row is scrubbed to an unidentified tombstone.
 */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await authUserForDeletion(ctx, userId);

    const existing = await ctx.db
      .query("accountDeletions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (existing && existing.status !== "complete") return { started: true };

    // Revoke access before scheduling any cleanup. A current access JWT may
    // still be cryptographically valid, but every product function checks the
    // account status and will refuse it.
    await deleteAuthIdentity(ctx, userId);
    await ctx.db.patch(userId, {
      accountStatus: "deleting",
      role: undefined,
    });

    const profile = await getMyProfile(ctx);
    if (profile) {
      await ctx.db.patch(profile._id, {
        hidden: true,
        displayName: "Deleting member",
        bio: "",
      });
    }

    const now = Date.now();
    const jobId = await ctx.db.insert("accountDeletions", {
      userId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await writeAudit(
      ctx,
      userId,
      "account.deletion_requested",
      "user",
      userId,
      "Resumable deletion job created; access revoked immediately.",
    );
    await ctx.scheduler.runAfter(0, internal.profiles.continueDeletion, {
      jobId,
    });
    return { started: true };
  },
});

async function deleteChildren(
  ctx: MutationCtx,
  rows: { _id: unknown }[],
) {
  for (const row of rows) await ctx.db.delete(row._id as never);
}

async function hasRowsForActivity(
  ctx: MutationCtx,
  activityId: Id<"activities">,
) {
  const [requests, attendance, decisions, updates] = await Promise.all([
    ctx.db.query("joinRequests").withIndex("by_activity", (q) => q.eq("activityId", activityId)).take(1),
    ctx.db.query("attendance").withIndex("by_activity", (q) => q.eq("activityId", activityId)).take(1),
    ctx.db.query("reconnectDecisions").withIndex("by_activity", (q) => q.eq("activityId", activityId)).take(1),
    ctx.db.query("activityUpdates").withIndex("by_activity", (q) => q.eq("activityId", activityId)).take(1),
  ]);
  return requests.length + attendance.length + decisions.length + updates.length > 0;
}

/** Deletes one bounded batch from a hosted plan, then the plan itself. */
async function stepHostedActivity(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const activity = await ctx.db
    .query("activities")
    .withIndex("by_host", (q) => q.eq("hostId", userId))
    .first();
  if (!activity) return false;

  if (await hasRowsForActivity(ctx, activity._id)) {
    const [requests, attendance, decisions, updates] = await Promise.all([
      ctx.db.query("joinRequests").withIndex("by_activity", (q) => q.eq("activityId", activity._id)).take(DELETION_BATCH),
      ctx.db.query("attendance").withIndex("by_activity", (q) => q.eq("activityId", activity._id)).take(DELETION_BATCH),
      ctx.db.query("reconnectDecisions").withIndex("by_activity", (q) => q.eq("activityId", activity._id)).take(DELETION_BATCH),
      ctx.db.query("activityUpdates").withIndex("by_activity", (q) => q.eq("activityId", activity._id)).take(DELETION_BATCH),
    ]);
    await deleteChildren(ctx, [...requests, ...attendance, ...decisions, ...updates]);
    return true;
  }

  const connections = await ctx.db
    .query("connections")
    .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
    .take(DELETION_BATCH);
  if (connections.length > 0) {
    for (const connection of connections) {
      await ctx.db.patch(connection._id, { activityId: undefined });
    }
    return true;
  }

  await ctx.db.delete(activity._id);
  return true;
}

async function hasRowsForCircle(
  ctx: MutationCtx,
  circleId: Id<"circles">,
) {
  const [members, posts, activities] = await Promise.all([
    ctx.db.query("circleMembers").withIndex("by_circle", (q) => q.eq("circleId", circleId)).take(1),
    ctx.db.query("circlePosts").withIndex("by_circle", (q) => q.eq("circleId", circleId)).take(1),
    ctx.db.query("activities").withIndex("by_circle", (q) => q.eq("circleId", circleId)).take(1),
  ]);
  return members.length + posts.length + activities.length > 0;
}

async function stepHostedCircle(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const circle = await ctx.db
    .query("circles")
    .withIndex("by_host", (q) => q.eq("hostId", userId))
    .first();
  if (!circle) return false;

  if (await hasRowsForCircle(ctx, circle._id)) {
    const [members, posts, activities] = await Promise.all([
      ctx.db.query("circleMembers").withIndex("by_circle", (q) => q.eq("circleId", circle._id)).take(DELETION_BATCH),
      ctx.db.query("circlePosts").withIndex("by_circle", (q) => q.eq("circleId", circle._id)).take(DELETION_BATCH),
      ctx.db.query("activities").withIndex("by_circle", (q) => q.eq("circleId", circle._id)).take(DELETION_BATCH),
    ]);
    await deleteChildren(ctx, [...members, ...posts]);
    for (const activity of activities) {
      if (activity.hostId !== userId) {
        await ctx.db.patch(activity._id, { circleId: undefined });
      }
    }
    return true;
  }

  await ctx.db.delete(circle._id);
  return true;
}

async function stepPersonalRows(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<boolean> {
  const [requests, attendance, decisionsFrom, decisionsTo, connectionsA, connectionsB, blocksByMe, blocksOfMe, memberships, journal, updates, circlePosts] =
    await Promise.all([
      ctx.db.query("joinRequests").withIndex("by_user", (q) => q.eq("userId", userId)).take(DELETION_BATCH),
      ctx.db.query("attendance").withIndex("by_user", (q) => q.eq("userId", userId)).take(DELETION_BATCH),
      ctx.db.query("reconnectDecisions").withIndex("by_from", (q) => q.eq("fromUserId", userId)).take(DELETION_BATCH),
      ctx.db.query("reconnectDecisions").withIndex("by_to", (q) => q.eq("toUserId", userId)).take(DELETION_BATCH),
      ctx.db.query("connections").withIndex("by_userA", (q) => q.eq("userA", userId)).take(DELETION_BATCH),
      ctx.db.query("connections").withIndex("by_userB", (q) => q.eq("userB", userId)).take(DELETION_BATCH),
      ctx.db.query("blocks").withIndex("by_blocker", (q) => q.eq("blockerId", userId)).take(DELETION_BATCH),
      ctx.db.query("blocks").withIndex("by_blocked", (q) => q.eq("blockedId", userId)).take(DELETION_BATCH),
      ctx.db.query("circleMembers").withIndex("by_user", (q) => q.eq("userId", userId)).take(DELETION_BATCH),
      ctx.db.query("journalEntries").withIndex("by_user", (q) => q.eq("userId", userId)).take(DELETION_BATCH),
      ctx.db.query("activityUpdates").withIndex("by_author", (q) => q.eq("authorId", userId)).take(DELETION_BATCH),
      ctx.db.query("circlePosts").withIndex("by_author", (q) => q.eq("authorId", userId)).take(DELETION_BATCH),
    ]);

  const rows = [
    ...requests,
    ...attendance,
    ...decisionsFrom,
    ...decisionsTo,
    ...connectionsA,
    ...connectionsB,
    ...blocksByMe,
    ...blocksOfMe,
    ...memberships,
    ...journal,
    ...updates,
    ...circlePosts,
  ];
  if (rows.length === 0) return false;
  const seen = new Set<string>();
  for (const row of rows) {
    const id = String(row._id);
    if (seen.has(id)) continue;
    seen.add(id);
    await ctx.db.delete(row._id as never);
  }
  return true;
}

async function stillHasData(ctx: MutationCtx, userId: Id<"users">) {
  const checks = await Promise.all([
    ctx.db.query("activities").withIndex("by_host", (q) => q.eq("hostId", userId)).take(1),
    ctx.db.query("circles").withIndex("by_host", (q) => q.eq("hostId", userId)).take(1),
    ctx.db.query("joinRequests").withIndex("by_user", (q) => q.eq("userId", userId)).take(1),
    ctx.db.query("attendance").withIndex("by_user", (q) => q.eq("userId", userId)).take(1),
    ctx.db.query("reconnectDecisions").withIndex("by_from", (q) => q.eq("fromUserId", userId)).take(1),
    ctx.db.query("reconnectDecisions").withIndex("by_to", (q) => q.eq("toUserId", userId)).take(1),
    ctx.db.query("connections").withIndex("by_userA", (q) => q.eq("userA", userId)).take(1),
    ctx.db.query("connections").withIndex("by_userB", (q) => q.eq("userB", userId)).take(1),
    ctx.db.query("blocks").withIndex("by_blocker", (q) => q.eq("blockerId", userId)).take(1),
    ctx.db.query("blocks").withIndex("by_blocked", (q) => q.eq("blockedId", userId)).take(1),
    ctx.db.query("circleMembers").withIndex("by_user", (q) => q.eq("userId", userId)).take(1),
    ctx.db.query("journalEntries").withIndex("by_user", (q) => q.eq("userId", userId)).take(1),
    ctx.db.query("activityUpdates").withIndex("by_author", (q) => q.eq("authorId", userId)).take(1),
    ctx.db.query("circlePosts").withIndex("by_author", (q) => q.eq("authorId", userId)).take(1),
  ]);
  return checks.some((rows) => rows.length > 0);
}

export const continueDeletion = internalMutation({
  args: { jobId: v.id("accountDeletions") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status === "complete") return;
    const userId = job.userId;
    const user = await ctx.db.get(userId);
    if (!user) {
      await ctx.db.patch(args.jobId, {
        status: "complete",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return;
    }

    await ctx.db.patch(args.jobId, { status: "running", updatedAt: Date.now() });

    // Idempotent: a session could theoretically be created between the initial
    // revocation and the status patch.
    await deleteAuthIdentity(ctx, userId);

    if (await stepHostedActivity(ctx, userId)) {
      await ctx.scheduler.runAfter(0, internal.profiles.continueDeletion, { jobId: args.jobId });
      return;
    }
    if (await stepHostedCircle(ctx, userId)) {
      await ctx.scheduler.runAfter(0, internal.profiles.continueDeletion, { jobId: args.jobId });
      return;
    }
    if (await stepPersonalRows(ctx, userId)) {
      await ctx.scheduler.runAfter(0, internal.profiles.continueDeletion, { jobId: args.jobId });
      return;
    }

    if (await stillHasData(ctx, userId)) {
      await ctx.scheduler.runAfter(0, internal.profiles.continueDeletion, { jobId: args.jobId });
      return;
    }

    // Scheduled internal functions have no auth identity, so query directly.
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (profile) await ctx.db.delete(profile._id);
    const historyMarker = await ctx.db
      .query("demoSeed")
      .withIndex("by_key", (q) => q.eq("key", `history:v3:${userId}`))
      .unique();
    if (historyMarker) await ctx.db.delete(historyMarker._id);

    await ctx.db.patch(userId, {
      name: "Deleted member",
      email: undefined,
      image: undefined,
      role: undefined,
      accountStatus: "deleted",
      deletedAt: Date.now(),
    });
    await ctx.db.patch(args.jobId, {
      status: "complete",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    await writeAudit(
      ctx,
      userId,
      "account.deletion_complete",
      "user",
      userId,
      "Product records removed; moderation/audit records retained under the documented policy.",
    );
  },
});

/** Personal data export. Returned to the signed-in member only. */
export const exportMyData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    const status = accountStatusOf(user);
    if (status === "deleted" || status === "deleting") {
      throw new Error("This account is being deleted and its data is no longer exported.");
    }
    const profile = await getMyProfile(ctx);
    const [requests, attendance, decisions, connectionsA, connectionsB, journal, memberships, reports] =
      await Promise.all([
        ctx.db.query("joinRequests").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("attendance").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("reconnectDecisions").withIndex("by_from", (q) => q.eq("fromUserId", userId)).collect(),
        ctx.db.query("connections").withIndex("by_userA", (q) => q.eq("userA", userId)).collect(),
        ctx.db.query("connections").withIndex("by_userB", (q) => q.eq("userB", userId)).collect(),
        ctx.db.query("journalEntries").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("circleMembers").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("reports").withIndex("by_reporter", (q) => q.eq("reporterId", userId)).collect(),
      ]);
    const [hostedActivities, hostedCircles] = await Promise.all([
      ctx.db.query("activities").withIndex("by_host", (q) => q.eq("hostId", userId)).collect(),
      ctx.db.query("circles").withIndex("by_host", (q) => q.eq("hostId", userId)).collect(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      notice:
        "This export contains your own records only. Other members' private reconnect answers and block decisions are never disclosed. Moderation reports and audit entries may be retained after deletion for safety and legal reasons; see PRIVACY.md.",
      profile: profile ? publicProfile(profile) : null,
      joinRequests: requests,
      attendance,
      reconnectDecisionsGiven: decisions,
      connections: [...connectionsA, ...connectionsB],
      journalEntries: journal,
      circleMemberships: memberships,
      reports,
      hostedActivities,
      hostedCircles,
    };
  },
});

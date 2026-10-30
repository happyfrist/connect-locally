import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  budgetValidator,
  comfortValidator,
  groupSizeValidator,
} from "./schema";
import {
  getCurrentUserId,
  getMyProfile,
  isAdmin,
  isBlockedPair,
  publicProfile,
  requireProfile,
  requireUserId,
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
    return {
      userId,
      email: user?.email ?? null,
      role: user?.role ?? "member",
      isModerator: await isAdmin(ctx, userId),
      profile: profile ? publicProfile(profile) : null,
      onboardingComplete: profile?.onboardingComplete ?? false,
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

/** Public view of another member. Blocked pairs cannot read each other. */
export const byUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId: viewerId } = await requireProfile(ctx);
    if (await isBlockedPair(ctx, viewerId, args.userId)) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!profile || !profile.onboardingComplete) return null;
    return publicProfile(profile);
  },
});

/**
 * Deletes everything Connectmaxxing stores about the member. The sign-in identity row
 * is scrubbed rather than removed so Convex Auth sessions are revoked on the
 * next request; the limitation is documented in PRIVACY.md.
 */
export const deleteMyData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const profile = await getMyProfile(ctx);

    const [requests, attendance, decisions, connectionsA, connectionsB, blocksByMe, blocksOfMe, memberships, posts, journal, reportsMade, updates, hostedActivities, hostedCircles] =
      await Promise.all([
        ctx.db.query("joinRequests").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("attendance").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("reconnectDecisions").withIndex("by_from", (q) => q.eq("fromUserId", userId)).collect(),
        ctx.db.query("connections").withIndex("by_userA", (q) => q.eq("userA", userId)).collect(),
        ctx.db.query("connections").withIndex("by_userB", (q) => q.eq("userB", userId)).collect(),
        ctx.db.query("blocks").withIndex("by_blocker", (q) => q.eq("blockerId", userId)).collect(),
        ctx.db.query("blocks").withIndex("by_blocked", (q) => q.eq("blockedId", userId)).collect(),
        ctx.db.query("circleMembers").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("circlePosts").collect(),
        ctx.db.query("journalEntries").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("reports").withIndex("by_reporter", (q) => q.eq("reporterId", userId)).collect(),
        ctx.db.query("activityUpdates").collect(),
        ctx.db.query("activities").withIndex("by_host", (q) => q.eq("hostId", userId)).collect(),
        ctx.db.query("circles").withIndex("by_host", (q) => q.eq("hostId", userId)).collect(),
      ]);

    const allRows: { _id: unknown }[] = [
      ...requests,
      ...attendance,
      ...decisions,
      ...connectionsA,
      ...connectionsB,
      ...blocksByMe,
      ...blocksOfMe,
      ...memberships,
      ...journal,
      ...reportsMade,
      ...posts.filter((post) => post.authorId === userId),
      ...updates.filter((update) => update.authorId === userId),
    ];

    // Content the member hosted is removed too, along with its related rows.
    for (const activity of hostedActivities) {
      allRows.push(activity);
      allRows.push(
        ...(await ctx.db.query("joinRequests").withIndex("by_activity", (q) => q.eq("activityId", activity._id)).collect()),
        ...(await ctx.db.query("attendance").withIndex("by_activity", (q) => q.eq("activityId", activity._id)).collect()),
        ...(await ctx.db.query("reconnectDecisions").withIndex("by_activity", (q) => q.eq("activityId", activity._id)).collect()),
        ...(await ctx.db.query("activityUpdates").withIndex("by_activity", (q) => q.eq("activityId", activity._id)).collect()),
      );
    }

    for (const circle of hostedCircles) {
      allRows.push(circle);
      allRows.push(
        ...(await ctx.db.query("circleMembers").withIndex("by_circle", (q) => q.eq("circleId", circle._id)).collect()),
        ...(await ctx.db.query("circlePosts").withIndex("by_circle", (q) => q.eq("circleId", circle._id)).collect()),
      );
      const linkedActivities = await ctx.db
        .query("activities")
        .withIndex("by_circle", (q) => q.eq("circleId", circle._id))
        .collect();
      for (const linked of linkedActivities) {
        if (linked.hostId !== userId) {
          await ctx.db.patch(linked._id, { circleId: undefined });
        }
      }
    }

    // Other people's private answers about this member go too.
    const decisionsAboutMe = (await ctx.db.query("reconnectDecisions").collect()).filter(
      (row) => row.toUserId === userId,
    );
    allRows.push(...decisionsAboutMe);

    const seen = new Set<string>();
    const deletions: Promise<unknown>[] = [];
    for (const row of allRows) {
      const id = String(row._id);
      if (seen.has(id)) continue;
      seen.add(id);
      deletions.push(ctx.db.delete(row._id as never));
    }
    if (profile) deletions.push(ctx.db.delete(profile._id));
    const historyMarker = await ctx.db
      .query("demoSeed")
      .withIndex("by_key", (q) => q.eq("key", `history:v3:${userId}`))
      .unique();
    if (historyMarker) deletions.push(ctx.db.delete(historyMarker._id));
    await Promise.all(deletions);

    await ctx.db.patch(userId, {
      name: "Deleted member",
      email: undefined,
      image: undefined,
    });
    return true;
  },
});

/** Personal data export. Returned to the signed-in member only. */
export const exportMyData = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
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

import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  connectionExists,
  isBlockedPair,
  listBlockedIds,
  publicProfile,
  requireProfile,
} from "./lib/auth";
import { reconnectDecisionValidator } from "./schema";

/**
 * Private, consent-first reconnection. A member's answer is never returned to
 * the other person before both have said a clear yes.
 */
export const decide = mutation({
  args: {
    activityId: v.id("activities"),
    targetId: v.id("users"),
    decision: reconnectDecisionValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    if (args.targetId === userId) throw new Error("You can't reconnect with yourself.");
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("That plan no longer exists.");
    if (await isBlockedPair(ctx, userId, args.targetId)) {
      throw new Error("This interaction isn't available.");
    }

    const myAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_activity_user", (q) =>
        q.eq("activityId", args.activityId).eq("userId", userId),
      )
      .unique();
    if (!myAttendance) {
      throw new Error("Check in to the plan before asking to reconnect.");
    }

    const targetAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_activity_user", (q) =>
        q.eq("activityId", args.activityId).eq("userId", args.targetId),
      )
      .unique();
    const targetAttended =
      targetAttendance !== null || activity.hostId === args.targetId;
    if (!targetAttended) {
      throw new Error("Reconnection is only offered to people on the plan.");
    }

    const targetProfile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.targetId))
      .unique();
    if (!targetProfile || targetProfile.hidden) {
      throw new Error("That member isn't available.");
    }

    const mine = await ctx.db
      .query("reconnectDecisions")
      .withIndex("by_pair", (q) =>
        q
          .eq("activityId", args.activityId)
          .eq("fromUserId", userId)
          .eq("toUserId", args.targetId),
      )
      .unique();
    if (mine) {
      await ctx.db.patch(mine._id, { decision: args.decision, createdAt: Date.now() });
    } else {
      await ctx.db.insert("reconnectDecisions", {
        activityId: args.activityId,
        fromUserId: userId,
        toUserId: args.targetId,
        decision: args.decision,
        createdAt: Date.now(),
      });
    }

    if (args.decision !== "yes") {
      return { connected: false, mutual: false };
    }

    let theirDecision = await ctx.db
      .query("reconnectDecisions")
      .withIndex("by_pair", (q) =>
        q
          .eq("activityId", args.activityId)
          .eq("fromUserId", args.targetId)
          .eq("toUserId", userId),
      )
      .unique();

    // Seeded demo profiles carry a standing demo interest so the mutual flow
    // can be shown without inventing consent from a real member. The profile
    // is labelled "Demo profile" everywhere it appears.
    if (!theirDecision && targetProfile.isDemo && targetProfile.openToReconnect) {
      const id = await ctx.db.insert("reconnectDecisions", {
        activityId: args.activityId,
        fromUserId: args.targetId,
        toUserId: userId,
        decision: "yes",
        createdAt: Date.now(),
      });
      theirDecision = await ctx.db.get(id);
    }

    if (theirDecision?.decision === "yes") {
      const already = await connectionExists(ctx, userId, args.targetId);
      if (!already) {
        const [userA, userB] = [userId, args.targetId].sort() as Id<"users">[];
        await ctx.db.insert("connections", {
          userA,
          userB,
          activityId: args.activityId,
          createdAt: Date.now(),
        });
      }
      return { connected: true, mutual: true };
    }

    return { connected: false, mutual: false };
  },
});

export const removeConnection = mutation({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const connection = await ctx.db.get(args.connectionId);
    if (!connection) return;
    if (connection.userA !== userId && connection.userB !== userId) {
      throw new Error("That connection isn't yours to remove.");
    }
    const otherId =
      connection.userA === userId ? connection.userB : connection.userA;
    // Both sides' private answers are removed too, so the connection can't be
    // silently recreated and either person can meet again through a new plan.
    const [mine, theirs] = await Promise.all([
      ctx.db
        .query("reconnectDecisions")
        .withIndex("by_from", (q) => q.eq("fromUserId", userId))
        .collect(),
      ctx.db
        .query("reconnectDecisions")
        .withIndex("by_from", (q) => q.eq("fromUserId", otherId))
        .collect(),
    ]);
    for (const row of mine) {
      if (row.toUserId === otherId) await ctx.db.delete(row._id);
    }
    for (const row of theirs) {
      if (row.toUserId === userId) await ctx.db.delete(row._id);
    }
    await ctx.db.delete(args.connectionId);
  },
});

export const myConnections = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const [a, b, blocked] = await Promise.all([
      ctx.db.query("connections").withIndex("by_userA", (q) => q.eq("userA", userId)).collect(),
      ctx.db.query("connections").withIndex("by_userB", (q) => q.eq("userB", userId)).collect(),
      listBlockedIds(ctx, userId),
    ]);

    const rows = [];
    for (const connection of [...a, ...b]) {
      const otherId =
        connection.userA === userId ? connection.userB : connection.userA;
      if (blocked.has(otherId as string)) continue;
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", otherId))
        .unique();
      if (!profile) continue;
      const activity = connection.activityId
        ? await ctx.db.get(connection.activityId)
        : null;
      rows.push({
        _id: connection._id,
        person: publicProfile(profile),
        activityTitle: activity?.title ?? null,
        createdAt: connection.createdAt,
      });
    }
    rows.sort((x, y) => y.createdAt - x.createdAt);
    return rows;
  },
});

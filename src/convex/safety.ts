import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  enforceRateLimit,
  isAccountActive,
  isBlockedPair,
  listBlockedIds,
  publicProfile,
  requireProfile,
} from "./lib/auth";
import { REPORT_REASONS } from "./lib/catalog";
import { reportTargetValidator } from "./schema";

export const block = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    await enforceRateLimit(ctx, userId, "safety:block", 50, 24 * 60 * 60_000);
    if (args.userId === userId) throw new Error("You can't block yourself.");
    if (await isBlockedPair(ctx, userId, args.userId)) return;
    if (!(await ctx.db.get(args.userId))) throw new Error("That member wasn't found.");
    await ctx.db.insert("blocks", {
      blockerId: userId,
      blockedId: args.userId,
      createdAt: Date.now(),
    });

    // Existing one-sided reconnect “yes” answers must not be able to create a
    // connection later, so pending decisions between the pair are removed.
    const [mine, theirs] = await Promise.all([
      ctx.db
        .query("reconnectDecisions")
        .withIndex("by_from_to", (q) =>
          q.eq("fromUserId", userId).eq("toUserId", args.userId),
        )
        .collect(),
      ctx.db
        .query("reconnectDecisions")
        .withIndex("by_from_to", (q) =>
          q.eq("fromUserId", args.userId).eq("toUserId", userId),
        )
        .collect(),
    ]);
    for (const row of [...mine, ...theirs]) await ctx.db.delete(row._id);

    // Blocking ends the connection as well as hiding it, so unblocking cannot
    // silently restore a relationship the blocker exited.
    const [connectionsA, connectionsB] = await Promise.all([
      ctx.db
        .query("connections")
        .withIndex("by_userA", (q) => q.eq("userA", userId))
        .collect(),
      ctx.db
        .query("connections")
        .withIndex("by_userB", (q) => q.eq("userB", userId))
        .collect(),
    ]);
    for (const connection of [...connectionsA, ...connectionsB]) {
      const other =
        connection.userA === userId ? connection.userB : connection.userA;
      if (other === args.userId) await ctx.db.delete(connection._id);
    }
  },
});

export const unblock = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const row = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) => q.eq("blockerId", userId).eq("blockedId", args.userId))
      .unique();
    if (row) await ctx.db.delete(row._id);
  },
});

export const blockedList = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const rows = await ctx.db
      .query("blocks")
      .withIndex("by_blocker", (q) => q.eq("blockerId", userId))
      .collect();
    const people = [];
    for (const row of rows) {
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", row.blockedId))
        .unique();
      if (profile) {
        people.push({
          ...publicProfile(profile),
          blockedAt: row.createdAt,
        });
      }
    }
    return people;
  },
});

export const report = mutation({
  args: {
    targetType: reportTargetValidator,
    targetId: v.string(),
    reason: v.string(),
    details: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    await enforceRateLimit(ctx, userId, "safety:report", 10, 24 * 60 * 60_000);
    const details = args.details.trim();
    if (details.length < 10 || details.length > 1000) {
      throw new Error("Describe what happened in 10–1000 characters.");
    }
    if (!(REPORT_REASONS as readonly string[]).includes(args.reason)) {
      throw new Error("Choose one of the listed report reasons.");
    }

    let targetLabel = "";
    if (args.targetType === "activity") {
      const activity = await ctx.db.get(args.targetId as Id<"activities">);
      if (!activity) throw new Error("That plan wasn't found.");
      targetLabel = activity.title;
    } else if (args.targetType === "circle") {
      const circle = await ctx.db.get(args.targetId as Id<"circles">);
      if (!circle) throw new Error("That circle wasn't found.");
      targetLabel = circle.name;
    } else {
      if (args.targetId === userId) throw new Error("You can't report yourself.");
      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", args.targetId as Id<"users">))
        .unique();
      if (!profile) throw new Error("That member wasn't found.");
      if (!(await isAccountActive(ctx, profile.userId))) {
        throw new Error("That member isn't available.");
      }
      targetLabel = profile.displayName;
    }

    const openReports = await ctx.db
      .query("reports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", userId))
      .take(200);
    const duplicate = openReports.find(
      (row) =>
        row.targetType === args.targetType &&
        row.targetId === args.targetId &&
        (row.status === "open" || row.status === "reviewing"),
    );
    if (duplicate) {
      return { alreadyReported: true, reportId: duplicate._id };
    }

    const reportId = await ctx.db.insert("reports", {
      reporterId: userId,
      targetType: args.targetType,
      targetId: args.targetId,
      targetLabel,
      reason: args.reason,
      details,
      status: "open",
      createdAt: Date.now(),
    });
    return { alreadyReported: false, reportId };
  },
});

export const myReports = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const rows = await ctx.db
      .query("reports")
      .withIndex("by_reporter", (q) => q.eq("reporterId", userId))
      .collect();
    // A reporter sees the outcome, never moderator-only notes or other reports.
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => ({
        _id: row._id,
        targetType: row.targetType,
        targetLabel: row.targetLabel,
        reason: row.reason,
        status: row.status,
        createdAt: row.createdAt,
        resolvedAt: row.resolvedAt ?? null,
      }));
  },
});

export const isBlocked = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const blocked = await listBlockedIds(ctx, userId);
    return blocked.has(args.userId as string);
  },
});

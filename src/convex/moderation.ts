import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  isAdmin,
  publicProfile,
  requireAdmin,
  requireProfile,
  writeAudit,
} from "./lib/auth";
import { reportStatusValidator } from "./schema";

export const status = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const moderator = await isAdmin(ctx, userId);
    const allUsers = await ctx.db.query("users").take(500);
    const adminExists = allUsers.some((user) => user.role === "admin");
    const open = await ctx.db
      .query("reports")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    return {
      isModerator: moderator,
      adminExists,
      openReports: moderator ? open.length : 0,
    };
  },
});

/**
 * First-run bootstrap only: the very first moderator can claim the role while
 * no moderator exists. After that, only the database/owner can grant it.
 */
export const claimModerator = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const allUsers = await ctx.db.query("users").take(500);
    if (allUsers.some((user) => user.role === "admin")) {
      throw new Error("A moderator already exists for this workspace.");
    }
    await ctx.db.patch(userId, { role: "admin" });
    await writeAudit(ctx, userId, "moderator.claimed", "user", userId, "First moderator bootstrap");
    return true;
  },
});

export const queue = query({
  args: {},
  handler: async (ctx) => {
    const moderatorId = await requireAdmin(ctx);
    const reports = await ctx.db.query("reports").collect();
    reports.sort((a, b) => {
      if (a.status === b.status) return b.createdAt - a.createdAt;
      return a.status === "open" ? -1 : 1;
    });

    const rows = [];
    for (const report of reports.slice(0, 100)) {
      const reporterProfile = await ctx.db
        .query("profiles")
        .withIndex("by_user", (q) => q.eq("userId", report.reporterId))
        .unique();
      const handler = report.handledBy ? await ctx.db.get(report.handledBy) : null;

      let target:
        | {
            kind: string;
            title: string;
            subtitle: string;
            statusLabel: string;
            hostName: string | null;
          }
        | null = null;

      if (report.targetType === "activity") {
        const activity = await ctx.db.get(report.targetId as Id<"activities">);
        if (activity) {
          const host = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", activity.hostId))
            .unique();
          target = {
            kind: "plan",
            title: activity.title,
            subtitle: `${activity.venue}, ${activity.area} · ${new Date(activity.startsAt).toLocaleString("en-IN")}`,
            statusLabel: activity.status,
            hostName: host?.displayName ?? null,
          };
        }
      } else if (report.targetType === "circle") {
        const circle = await ctx.db.get(report.targetId as Id<"circles">);
        if (circle) {
          const host = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", circle.hostId))
            .unique();
          target = {
            kind: "circle",
            title: circle.name,
            subtitle: `${circle.area}, ${circle.city}`,
            statusLabel: circle.kind,
            hostName: host?.displayName ?? null,
          };
        }
      } else {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", report.targetId as Id<"users">))
          .unique();
        if (profile) {
          target = {
            kind: "member",
            title: publicProfile(profile).displayName,
            subtitle: `${profile.area}, ${profile.city}`,
            statusLabel: profile.hidden ? "hidden" : "visible",
            hostName: null,
          };
        }
      }

      rows.push({
        _id: report._id,
        targetType: report.targetType,
        targetLabel: report.targetLabel,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt,
        resolution: report.resolution ?? null,
        resolvedAt: report.resolvedAt ?? null,
        reporter: reporterProfile ? publicProfile(reporterProfile).displayName : "Deleted member",
        handledBy: handler?.name ?? null,
        target,
      });
    }

    const audit = (await ctx.db.query("auditLog").collect())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30);

    return { moderatorId, reports: rows, audit };
  },
});

export const resolve = mutation({
  args: {
    reportId: v.id("reports"),
    status: v.union(reportStatusValidator, v.literal("reviewing")),
    resolution: v.string(),
    action: v.union(
      v.literal("none"),
      v.literal("warning"),
      v.literal("content_removed"),
      v.literal("member_restricted"),
    ),
  },
  handler: async (ctx, args) => {
    const moderatorId = await requireAdmin(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("That report no longer exists.");
    const resolution = args.resolution.trim();
    if (resolution.length > 1000) throw new Error("Keep the note under 1000 characters.");

    if (args.action === "content_removed") {
      if (report.targetType === "activity") {
        const activity = await ctx.db.get(report.targetId as Id<"activities">);
        if (activity) {
          await ctx.db.patch(activity._id, {
            status: "cancelled",
            cancelReason: "Removed after a moderation review.",
          });
        }
      } else if (report.targetType === "circle") {
        const circle = await ctx.db.get(report.targetId as Id<"circles">);
        if (circle) {
          await ctx.db.patch(circle._id, { joinPolicy: "request" });
        }
      }
    }

    if (args.action === "member_restricted") {
      if (report.targetType === "member") {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", report.targetId as Id<"users">))
          .unique();
        if (profile) await ctx.db.patch(profile._id, { hidden: true });
      }
      if (report.targetType === "activity") {
        const activity = await ctx.db.get(report.targetId as Id<"activities">);
        if (activity) {
          const host = await ctx.db
            .query("profiles")
            .withIndex("by_user", (q) => q.eq("userId", activity.hostId))
            .unique();
          if (host) await ctx.db.patch(host._id, { hidden: true });
        }
      }
    }

    await ctx.db.patch(args.reportId, {
      status: args.status,
      resolution: resolution || undefined,
      resolvedAt: args.status === "open" || args.status === "reviewing" ? undefined : Date.now(),
      handledBy: moderatorId,
    });
    await writeAudit(
      ctx,
      moderatorId,
      `report.${args.status}`,
      report.targetType,
      report.targetId,
      `${report.reason} → ${args.action}`,
    );
  },
});

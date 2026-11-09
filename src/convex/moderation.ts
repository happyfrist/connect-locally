import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import {
  deleteAuthIdentity,
  getCurrentUserId,
  isModerator,
  requireModerator,
  revokeAuthSessions,
  writeAudit,
} from "./lib/auth";
import { notifyUser } from "./lib/notify";
import { reportStatusValidator } from "./schema";

export const status = query({
  args: {},
  handler: async (ctx) => {
    // AppShell calls this before onboarding. It must be safe for a signed-in
    // member with no profile, or for a disabled/deleting account.
    const userId = await getCurrentUserId(ctx);
    const moderator = userId ? await isModerator(ctx, userId) : false;
    let openReports = 0;
    if (moderator) {
      const [open, reviewing] = await Promise.all([
        ctx.db
          .query("reports")
          .withIndex("by_status", (q) => q.eq("status", "open"))
          .take(100),
        ctx.db
          .query("reports")
          .withIndex("by_status", (q) => q.eq("status", "reviewing"))
          .take(100),
      ]);
      openReports = open.length + reviewing.length;
    }
    return {
      isModerator: moderator,
      openReports,
    };
  },
});

/**
 * Owner-only provisioning. This is an internal function: it is not part of the
 * public client API and can only be run with deployment-admin credentials, e.g.
 *
 *   bunx convex run moderation:grantRole '{"email":"owner@example.com","role":"moderator"}'
 *
 * There is deliberately no public "claim moderator" mutation.
 */
export const grantRole = internalMutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("member"), v.literal("moderator"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new Error("No signed-up account uses that email.");
    if (user.accountStatus && user.accountStatus !== "active") {
      throw new Error("That account is not active.");
    }
    await ctx.db.patch(user._id, { role: args.role });
    await writeAudit(
      ctx,
      null,
      "role.granted",
      "user",
      user._id,
      `Owner deployment procedure granted ${args.role}.`,
    );
    return { userId: user._id, role: args.role };
  },
});

/** Owner-only account disable/re-enable. Disabling revokes live sessions. */
export const setAccountStatus = internalMutation({
  args: {
    email: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
    if (!user) throw new Error("No signed-up account uses that email.");
    if (user.accountStatus === "deleting" || user.accountStatus === "deleted") {
      throw new Error("A deleting or deleted account cannot be re-enabled.");
    }
    await ctx.db.patch(user._id, { accountStatus: args.status });
    if (args.status === "disabled") await revokeAuthSessions(ctx, user._id);
    await writeAudit(
      ctx,
      null,
      `account.${args.status}`,
      "user",
      user._id,
      args.reason?.trim().slice(0, 500) || "Owner deployment procedure.",
    );
    return { userId: user._id, status: args.status };
  },
});

export const listModerators = internalQuery({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").take(500);
    return users
      .filter((user) => user.role === "admin" || user.role === "moderator")
      .map((user) => ({
        userId: user._id,
        email: user.email ?? null,
        role: user.role ?? null,
        accountStatus: user.accountStatus ?? "active",
      }));
  },
});

export const queue = query({
  args: {},
  handler: async (ctx) => {
    const moderatorId = await requireModerator(ctx);
    const [open, reviewing, resolved, dismissed] = await Promise.all([
      ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "open")).take(100),
      ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "reviewing")).take(100),
      ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "resolved")).take(50),
      ctx.db.query("reports").withIndex("by_status", (q) => q.eq("status", "dismissed")).take(50),
    ]);
    const reports = [...open, ...reviewing, ...resolved, ...dismissed].sort((a, b) => {
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
            title: profile.displayName,
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
        reporter: reporterProfile?.displayName ?? "Deleted member",
        handledBy: handler?.name ?? null,
        target,
      });
    }

    const audit = await ctx.db
      .query("auditLog")
      .withIndex("by_createdAt")
      .order("desc")
      .take(30);

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
    const moderatorId = await requireModerator(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new Error("That report no longer exists.");
    const resolution = args.resolution.trim();
    if (resolution.length > 1000) throw new Error("Keep the note under 1000 characters.");

    // Resolve the account behind the reported content once, for consistent
    // least-privilege restriction behaviour.
    let subjectId: Id<"users"> | null = null;
    if (report.targetType === "member") {
      subjectId = report.targetId as Id<"users">;
    } else if (report.targetType === "activity") {
      const activity = await ctx.db.get(report.targetId as Id<"activities">);
      subjectId = activity?.hostId ?? null;
    } else {
      const circle = await ctx.db.get(report.targetId as Id<"circles">);
      subjectId = circle?.hostId ?? null;
    }

    if (args.action === "warning" && subjectId) {
      await notifyUser(ctx, {
        recipientId: subjectId,
        kind: "moderation_warning",
        title: "Moderation warning",
        body: "A moderator reviewed a report connected to your account and issued a warning. Review the community rules in the Safety centre.",
        href: "/safety",
        dedupeKey: `warning:${report._id}:${subjectId}`,
      });
    }

    if (args.action === "content_removed") {
      if (report.targetType === "activity") {
        const activity = await ctx.db.get(report.targetId as Id<"activities">);
        if (activity) {
          await ctx.db.patch(activity._id, {
            status: "cancelled",
            cancelReason: "Removed after a moderation review.",
          });
          const requests = await ctx.db
            .query("joinRequests")
            .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
            .collect();
          const recipients = new Set<Id<"users">>();
          for (const request of requests) {
            if (request.status === "pending") {
              await ctx.db.patch(request._id, {
                status: "declined",
                decidedAt: Date.now(),
              });
            }
            if (
              request.status === "pending" || request.status === "approved"
            ) {
              recipients.add(request.userId);
            }
          }
          // The host also needs to know that their plan was removed.
          recipients.add(activity.hostId);
          for (const recipientId of recipients) {
            await notifyUser(ctx, {
              recipientId,
              kind: "plan_removed",
              title: "Plan removed",
              body: `A moderator removed ${activity.title} after a review.`,
              href: `/activity/${activity._id}`,
              dedupeKey: `moderation-remove:${report._id}:${recipientId}`,
            });
          }
        }
      } else if (report.targetType === "circle") {
        const circle = await ctx.db.get(report.targetId as Id<"circles">);
        if (circle) {
          await ctx.db.patch(circle._id, { joinPolicy: "request" });
          await notifyUser(ctx, {
            recipientId: circle.hostId,
            kind: "circle_restricted",
            title: "Circle restricted",
            body: `A moderator restricted ${circle.name} after a review. New members now need host approval.`,
            href: `/circles/${circle._id}`,
            dedupeKey: `moderation-circle:${report._id}:${circle.hostId}`,
          });
        }
      }
    }

    if (args.action === "member_restricted" && subjectId) {
      const subject = await ctx.db.get(subjectId);
      if (subject?.role === "admin" || subject?.role === "moderator") {
        const actor = await ctx.db.get(moderatorId);
        if (actor?.role !== "admin") {
          throw new Error(
            "Only an admin can restrict another moderator or admin account.",
          );
        }
      }
      await ctx.db.patch(subjectId, { accountStatus: "disabled" });
      await revokeAuthSessions(ctx, subjectId);
      await writeAudit(
        ctx,
        moderatorId,
        "account.disabled",
        "user",
        subjectId,
        `Disabled after report ${report._id}.`,
      );
    }

    await ctx.db.patch(args.reportId, {
      status: args.status,
      resolution: resolution || undefined,
      resolvedAt: args.status === "open" || args.status === "reviewing" ? undefined : Date.now(),
      handledBy: moderatorId,
    });
    if (args.status === "resolved" || args.status === "dismissed") {
      await notifyUser(ctx, {
        recipientId: report.reporterId,
        kind: "report_update",
        title: "Your report was reviewed",
        body: `A moderator ${args.status} your report about ${report.targetLabel}. You can see the outcome in the Safety centre.`,
        href: "/safety",
        dedupeKey: `report:${report._id}:${args.status}:${report.reporterId}`,
      });
    }
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

/**
 * Internal-only erasure helper for a moderation/legal retention workflow.
 * Public account deletion uses the resumable job in profiles.ts instead.
 */
export const purgeAuthIdentity = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await deleteAuthIdentity(ctx, args.userId);
    await writeAudit(
      ctx,
      null,
      "auth.purged",
      "user",
      args.userId,
      "Owner retention procedure.",
    );
  },
});

import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { requireProfile } from "./lib/auth";

const MAX_ERROR_LENGTH = 300;

/**
 * Claims one queued email. Returning null makes repeated schedulings safe:
 * only a pending row can transition to sending.
 */
export const claimEmailJob = internalMutation({
  args: { jobId: v.id("emailOutbox") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "pending") return null;

    const user = await ctx.db.get(job.recipientId);
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", job.recipientId))
      .unique();
    if (
      !user ||
      !user.email ||
      user.isAnonymous ||
      user.accountStatus === "disabled" ||
      user.accountStatus === "deleting" ||
      user.accountStatus === "deleted" ||
      !profile ||
      profile.isDemo ||
      profile.notifyByEmail !== true
    ) {
      await ctx.db.patch(job._id, {
        status: "skipped",
        lastError: "Recipient is no longer eligible for transactional email.",
        updatedAt: Date.now(),
      });
      return null;
    }

    await ctx.db.patch(job._id, {
      status: "sending",
      attempts: job.attempts + 1,
      updatedAt: Date.now(),
    });
    return {
      jobId: job._id,
      to: user.email,
      subject: job.subject,
      html: job.html,
      text: job.text,
    };
  },
});

export const completeEmailJob = internalMutation({
  args: {
    jobId: v.id("emailOutbox"),
    success: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;
    const now = Date.now();
    await ctx.db.patch(job._id, {
      status: args.success ? "sent" : "failed",
      sentAt: args.success ? now : undefined,
      lastError: args.success
        ? undefined
        : (args.error ?? "Email delivery failed.").slice(0, MAX_ERROR_LENGTH),
      updatedAt: now,
    });
  },
});

function gatewayBaseUrl() {
  return (process.env.VLY_INTEGRATION_BASE_URL || "https://integrations.vly.ai")
    .replace(/\/+$/, "");
}

async function sendViaGateway(job: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const key = process.env.VLY_INTEGRATION_KEY;
  if (!key) {
    throw new Error(
      "Email is not configured: VLY_INTEGRATION_KEY is absent from this Convex deployment.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${gatewayBaseUrl()}/v1/email/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        // Matches the version header used by @vly-ai/integrations.
        "X-Vly-Version": "0.1.0",
      },
      body: JSON.stringify({
        to: [job.to],
        from:
          process.env.NOTIFICATION_FROM_EMAIL ||
          "noreply@project.freebuff.dev",
        subject: job.subject,
        html: job.html,
        text: job.text,
      }),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as {
      success?: unknown;
      status?: unknown;
      error?: unknown;
    } | null;
    const rejected =
      !response.ok || data?.success === false || data?.status === "failed";
    if (rejected) {
      const detail =
        typeof data?.error === "string" ? `: ${data.error}` : "";
      throw new Error(
        `Email gateway rejected the message (HTTP ${response.status})${detail}`,
      );
    }
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Delivers one queued transactional email through the deployment's real email
 * gateway. Delivery is deliberately asynchronous: a provider outage cannot
 * fail the join/approval/cancellation action that queued the message.
 */
export const sendEmailJob = internalAction({
  args: { jobId: v.id("emailOutbox") },
  handler: async (ctx, args) => {
    const job = await ctx.runMutation(internal.notifications.claimEmailJob, {
      jobId: args.jobId,
    });
    if (!job) return;
    try {
      await sendViaGateway(job);
      await ctx.runMutation(internal.notifications.completeEmailJob, {
        jobId: job.jobId,
        success: true,
      });
    } catch (error) {
      // Never log the gateway key or full request. Only a bounded provider
      // message is stored for an operator to inspect.
      const message =
        error instanceof Error ? error.message : "Email delivery failed.";
      await ctx.runMutation(internal.notifications.completeEmailJob, {
        jobId: job.jobId,
        success: false,
        error: message,
      });
    }
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    const unread = rows.filter((row) => row.readAt === undefined).length;
    return {
      unread,
      rows: rows.slice(0, 20).map((row) => ({
        _id: row._id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        href: row.href ?? null,
        read: row.readAt !== undefined,
        createdAt: row.createdAt,
      })),
    };
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const row = await ctx.db.get(args.notificationId);
    if (!row || row.userId !== userId) return;
    if (row.readAt === undefined) {
      await ctx.db.patch(row._id, { readAt: Date.now() });
    }
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    const now = Date.now();
    for (const row of rows) {
      if (row.readAt === undefined) await ctx.db.patch(row._id, { readAt: now });
    }
  },
});

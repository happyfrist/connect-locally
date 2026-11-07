import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { accountStatusOf } from "./auth";

export type NotifyInput = {
  recipientId: Id<"users">;
  kind: string;
  title: string;
  body: string;
  href?: string;
  /** Stable per recipient + event. Makes retries idempotent. */
  dedupeKey: string;
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * An absolute link is only added when the deployment sets APP_BASE_URL.
 * Inventing a production domain in an email would be worse than omitting it.
 */
export function absoluteLink(href: string, base: string | undefined) {
  if (!base?.trim()) return null;
  try {
    return new URL(href, base.trim()).toString();
  } catch {
    return null;
  }
}

export function buildEmail(args: {
  title: string;
  body: string;
  href?: string;
  baseUrl?: string;
}) {
  const link = args.href ? absoluteLink(args.href, args.baseUrl) : null;
  // A subject is a header, not a body: flatten line breaks from member content.
  const subject = `Connectmaxxing: ${args.title.replace(/[\r\n]+/g, " ")}`.slice(
    0,
    140,
  );
  const text = [
    args.title,
    "",
    args.body,
    "",
    link ? `Open Connectmaxxing: ${link}` : "Open Connectmaxxing to see the details.",
    "",
    "You are receiving this transactional update because you enabled email updates in the Safety centre. You can turn them off there at any time.",
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f7f3ea;padding:24px;font-family:ui-sans-serif,system-ui,sans-serif;color:#22201c">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e5ddcd;border-radius:16px;padding:28px">
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a5a2b">Connectmaxxing</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;font-weight:600">${escapeHtml(args.title)}</h1>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4d473d">${escapeHtml(args.body)}</p>
    ${
      link
        ? `<p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#2f5d46;color:#fff;text-decoration:none;padding:11px 18px;border-radius:9px;font-size:14px">Open Connectmaxxing</a></p>`
        : ""
    }
    <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #eee5d8;font-size:11px;line-height:1.6;color:#7a7265">
      You enabled transactional email updates in the Safety centre. Turn them off there at any time.
      This message is about a plan, circle or connection you are part of; it is not a marketing email.
    </p>
  </div>
</body></html>`;

  return { subject, html, text };
}

/**
 * Adds an in-app notification and, when the member has opted in, a queued
 * transactional email. This runs inside the product mutation so a failed
 * enqueue cannot leave the two views inconsistent. The email provider call
 * happens later in a scheduled action.
 */
export async function notifyUser(ctx: MutationCtx, input: NotifyInput) {
  const user = await ctx.db.get(input.recipientId);
  if (!user || accountStatusOf(user) !== "active" || user.isAnonymous) return;

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", input.recipientId))
    .unique();
  // Seeded profiles are not people and must never receive email.
  if (!profile || profile.isDemo) return;

  const existing = await ctx.db
    .query("notifications")
    .withIndex("by_dedupe", (q) => q.eq("dedupeKey", input.dedupeKey))
    .unique();
  if (existing) return;

  await ctx.db.insert("notifications", {
    userId: input.recipientId,
    kind: input.kind,
    title: input.title.slice(0, 120),
    body: input.body.slice(0, 500),
    href: input.href,
    dedupeKey: input.dedupeKey,
    createdAt: Date.now(),
  });

  if (profile.notifyByEmail !== true || !user.email) return;

  const email = buildEmail({
    title: input.title,
    body: input.body,
    href: input.href,
    baseUrl: process.env.APP_BASE_URL,
  });
  const now = Date.now();
  const jobId = await ctx.db.insert("emailOutbox", {
    recipientId: input.recipientId,
    kind: input.kind,
    dedupeKey: `${input.dedupeKey}:email`,
    subject: email.subject,
    html: email.html,
    text: email.text,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.notifications.sendEmailJob, {
    jobId,
  });
}

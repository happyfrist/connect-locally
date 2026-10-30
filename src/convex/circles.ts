import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { CATEGORY_MAP } from "./lib/catalog";
import type { ReadCtx } from "./lib/auth";
import {
  isBlockedPair,
  listBlockedIds,
  publicProfile,
  requireProfile,
} from "./lib/auth";
import { circleKindValidator } from "./schema";

const joinPolicyValidator = v.union(v.literal("open"), v.literal("request"));

async function membersOf(ctx: ReadCtx, circleId: Id<"circles">) {
  return await ctx.db
    .query("circleMembers")
    .withIndex("by_circle", (q) => q.eq("circleId", circleId))
    .collect();
}

async function profileFor(ctx: ReadCtx, userId: Id<"users">) {
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return profile ? publicProfile(profile) : null;
}

export const list = query({
  args: { kind: v.optional(circleKindValidator) },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const [circles, memberships, blocked] = await Promise.all([
      ctx.db
        .query("circles")
        .withIndex("by_city", (q) => q.eq("city", profile.city))
        .collect(),
      ctx.db
        .query("circleMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      listBlockedIds(ctx, userId),
    ]);
    const membershipByCircle = new Map(
      memberships.map((membership) => [membership.circleId as string, membership]),
    );

    const rows = [];
    for (const circle of circles) {
      if (args.kind && circle.kind !== args.kind) continue;
      if (blocked.has(circle.hostId as string)) continue;
      const members = await membersOf(ctx, circle._id);
      const approved = members.filter((member) => member.status === "approved");
      rows.push({
        _id: circle._id,
        name: circle.name,
        description: circle.description,
        category: circle.category,
        kind: circle.kind,
        city: circle.city,
        area: circle.area,
        cadence: circle.cadence,
        joinPolicy: circle.joinPolicy,
        maxMembers: circle.maxMembers ?? null,
        isDemo: circle.isDemo ?? false,
        host: await profileFor(ctx, circle.hostId),
        memberCount: approved.length,
        membershipStatus: membershipByCircle.get(circle._id)?.status ?? "none",
      });
    }
    rows.sort((a, b) => b.memberCount - a.memberCount);
    return rows;
  },
});

export const get = query({
  args: { circleId: v.id("circles") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const circle = await ctx.db.get(args.circleId);
    if (!circle) return null;
    if (await isBlockedPair(ctx, userId, circle.hostId)) return null;

    const members = await membersOf(ctx, circle._id);
    const membership = members.find((member) => member.userId === userId) ?? null;
    const isMember = membership?.status === "approved";
    const isHost = circle.hostId === userId;

    const approvedMembers = [];
    for (const member of members.filter((row) => row.status === "approved")) {
      const person = await profileFor(ctx, member.userId);
      if (person) {
        approvedMembers.push({
          ...person,
          role: member.role,
          joinedAt: member.joinedAt,
        });
      }
    }

    const pendingMembers = isHost
      ? await Promise.all(
          members
            .filter((row) => row.status === "pending")
            .map(async (row) => ({
              requestId: row._id,
              person: await profileFor(ctx, row.userId),
              joinedAt: row.joinedAt,
            })),
        )
      : [];

    const posts = isMember
      ? (
          await ctx.db
            .query("circlePosts")
            .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
            .collect()
        )
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 40)
      : [];

    const postsWithAuthors = [];
    for (const post of posts) {
      postsWithAuthors.push({
        _id: post._id,
        body: post.body,
        kind: post.kind,
        createdAt: post.createdAt,
        author: await profileFor(ctx, post.authorId),
        isMine: post.authorId === userId,
      });
    }

    const activities = (
      await ctx.db
        .query("activities")
        .withIndex("by_circle", (q) => q.eq("circleId", args.circleId))
        .collect()
    )
      .filter((activity) => activity.status === "open" && activity.startsAt > Date.now())
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((activity) => ({
        _id: activity._id,
        title: activity.title,
        startsAt: activity.startsAt,
        area: activity.area,
        venue: activity.venue,
        category: activity.category,
      }));

    return {
      circle,
      host: await profileFor(ctx, circle.hostId),
      members: approvedMembers,
      pendingMembers,
      membershipStatus: membership?.status ?? "none",
      isMember,
      isHost,
      posts: postsWithAuthors,
      activities,
      prompts: circle.prompts ?? [],
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
    kind: circleKindValidator,
    area: v.string(),
    cadence: v.string(),
    joinPolicy: joinPolicyValidator,
    maxMembers: v.optional(v.number()),
    rules: v.optional(v.string()),
    prompts: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const name = args.name.trim();
    const description = args.description.trim();
    if (name.length < 3 || name.length > 60) {
      throw new Error("Circle names should be 3–60 characters.");
    }
    if (description.length < 20 || description.length > 600) {
      throw new Error("Describe the circle in 20–600 characters.");
    }
    if (!CATEGORY_MAP[args.category]) throw new Error("Pick a valid category.");
    if (!args.area.trim()) throw new Error("Add the area your circle is based in.");
    if (!args.cadence.trim()) throw new Error("Say how often the circle meets.");
    if (args.maxMembers !== undefined && (args.maxMembers < 2 || args.maxMembers > 100)) {
      throw new Error("Membership limit should be between 2 and 100.");
    }

    const circleId = await ctx.db.insert("circles", {
      name,
      description,
      category: args.category,
      kind: args.kind,
      city: profile.city,
      area: args.area.trim(),
      hostId: userId,
      rules: args.rules?.trim() || undefined,
      cadence: args.cadence.trim(),
      joinPolicy: args.joinPolicy,
      maxMembers: args.maxMembers,
      prompts: args.prompts?.filter((prompt) => prompt.trim().length > 0),
      isDemo: false,
      createdAt: Date.now(),
    });
    await ctx.db.insert("circleMembers", {
      circleId,
      userId,
      role: "host",
      status: "approved",
      joinedAt: Date.now(),
    });
    return circleId;
  },
});

export const join = mutation({
  args: { circleId: v.id("circles") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const circle = await ctx.db.get(args.circleId);
    if (!circle) throw new Error("That circle no longer exists.");
    if (await isBlockedPair(ctx, userId, circle.hostId)) {
      throw new Error("This circle isn't available to you.");
    }
    const existing = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", args.circleId).eq("userId", userId),
      )
      .unique();
    if (existing) return existing.status;

    const members = await membersOf(ctx, circle._id);
    const approvedCount = members.filter((member) => member.status === "approved").length;
    if (circle.maxMembers !== undefined && approvedCount >= circle.maxMembers) {
      throw new Error("This circle is full.");
    }

    const status = circle.joinPolicy === "open" ? "approved" : "pending";
    await ctx.db.insert("circleMembers", {
      circleId: args.circleId,
      userId,
      role: "member",
      status,
      joinedAt: Date.now(),
    });
    return status;
  },
});

export const decideMember = mutation({
  args: {
    circleId: v.id("circles"),
    requestId: v.id("circleMembers"),
    decision: v.union(v.literal("approved"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const circle = await ctx.db.get(args.circleId);
    if (!circle) throw new Error("That circle no longer exists.");
    if (circle.hostId !== userId) throw new Error("Only the host can approve members.");
    const membership = await ctx.db.get(args.requestId);
    if (!membership || membership.circleId !== args.circleId) {
      throw new Error("That membership request no longer exists.");
    }
    if (membership.status !== "pending") throw new Error("Already handled.");
    if (args.decision === "declined") {
      await ctx.db.delete(args.requestId);
      return;
    }
    const members = await membersOf(ctx, circle._id);
    const approvedCount = members.filter((member) => member.status === "approved").length;
    if (circle.maxMembers !== undefined && approvedCount >= circle.maxMembers) {
      throw new Error("This circle is full.");
    }
    await ctx.db.patch(args.requestId, { status: "approved" });
  },
});

export const post = mutation({
  args: {
    circleId: v.id("circles"),
    body: v.string(),
    kind: v.union(v.literal("discussion"), v.literal("announcement")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", args.circleId).eq("userId", userId),
      )
      .unique();
    if (!membership || membership.status !== "approved") {
      throw new Error("Join the circle to take part in discussions.");
    }
    if (args.kind === "announcement" && membership.role !== "host") {
      throw new Error("Only the host can post announcements.");
    }
    const body = args.body.trim();
    if (body.length < 2 || body.length > 600) {
      throw new Error("Posts should be 2–600 characters.");
    }
    await ctx.db.insert("circlePosts", {
      circleId: args.circleId,
      authorId: userId,
      body,
      kind: args.kind,
      createdAt: Date.now(),
    });
  },
});

export const leave = mutation({
  args: { circleId: v.id("circles") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const circle = await ctx.db.get(args.circleId);
    if (!circle) return;
    if (circle.hostId === userId) {
      throw new Error("Hosts can't leave their own circle. Hand it over first.");
    }
    const membership = await ctx.db
      .query("circleMembers")
      .withIndex("by_circle_user", (q) =>
        q.eq("circleId", args.circleId).eq("userId", userId),
      )
      .unique();
    if (membership) await ctx.db.delete(membership._id);
  },
});

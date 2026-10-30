import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { CATEGORY_MAP } from "./lib/catalog";
import type { ReadCtx } from "./lib/auth";
import {
  enforceRateLimit,
  getVisibleProfile,
  isBlockedPair,
  listBlockedIds,
  publicProfile,
  requireProfile,
} from "./lib/auth";
import { checkInState, reconnectState } from "./lib/policy";
import { recurrenceValidator } from "./schema";

const kindValidator = v.union(v.literal("activity"), v.literal("invitation"));
const whenValidator = v.union(
  v.literal("any"),
  v.literal("week"),
  v.literal("weekend"),
);
const budgetFilterValidator = v.union(
  v.literal("any"),
  v.literal("free"),
  v.literal("low"),
);

async function profileFor(ctx: ReadCtx, viewerId: Id<"users">, userId: Id<"users">) {
  const profile = await getVisibleProfile(ctx, viewerId, userId);
  return profile ? publicProfile(profile) : null;
}

function isWeekend(timestamp: number) {
  const day = new Date(timestamp).getDay();
  return day === 0 || day === 6;
}

async function approvedRequests(ctx: ReadCtx, activityId: Id<"activities">) {
  return await ctx.db
    .query("joinRequests")
    .withIndex("by_activity", (q) => q.eq("activityId", activityId))
    .collect();
}

export const list = query({
  args: {
    category: v.optional(v.string()),
    when: v.optional(whenValidator),
    budget: v.optional(budgetFilterValidator),
    beginnerOnly: v.optional(v.boolean()),
    kind: v.optional(v.union(v.literal("all"), kindValidator)),
    area: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const now = Date.now();
    const when = args.when ?? "any";
    const horizon =
      when === "week" ? now + 7 * 864e5 : when === "weekend" ? now + 14 * 864e5 : now + 120 * 864e5;
    const limit = Math.min(Math.max(args.limit ?? 15, 1), 30);

    const raw = await ctx.db
      .query("activities")
      .withIndex("by_city_startsAt", (q) =>
        q.eq("city", profile.city).gte("startsAt", now).lte("startsAt", horizon),
      )
      .take(120);

    const [blocked, myRequests, myAttendance] = await Promise.all([
      listBlockedIds(ctx, userId),
      ctx.db
        .query("joinRequests")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("attendance")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    ]);
    const requestByActivity = new Map(
      myRequests.map((request) => [request.activityId as string, request.status]),
    );
    const attended = new Set(myAttendance.map((row) => row.activityId as string));

    const rows = [];
    for (const activity of raw) {
      if (activity.status !== "open") continue;
      if (blocked.has(activity.hostId as string)) continue;
      if (args.category && activity.category !== args.category) continue;
      if (args.kind && args.kind !== "all" && activity.kind !== args.kind) continue;
      if (args.beginnerOnly && !activity.beginnerFriendly) continue;
      if (when === "weekend" && !isWeekend(activity.startsAt)) continue;
      if (args.budget === "free" && activity.cost !== 0) continue;
      if (args.budget === "low" && activity.cost > 500) continue;
      if (
        args.area &&
        args.area.trim().length > 0 &&
        !`${activity.area} ${activity.venue}`
          .toLowerCase()
          .includes(args.area.trim().toLowerCase())
      ) {
        continue;
      }

      const host = await profileFor(ctx, userId, activity.hostId);
      if (!host) continue;
      const requests = await approvedRequests(ctx, activity._id);
      const approvedCount = requests.filter((r) => r.status === "approved").length;
      if (approvedCount >= activity.maxParticipants) continue;

      rows.push({
        activity: {
          _id: activity._id,
          title: activity.title,
          description: activity.description,
          category: activity.category,
          kind: activity.kind,
          city: activity.city,
          area: activity.area,
          venue: activity.venue,
          startsAt: activity.startsAt,
          durationMins: activity.durationMins,
          cost: activity.cost,
          maxParticipants: activity.maxParticipants,
          beginnerFriendly: activity.beginnerFriendly,
          recurrence: activity.recurrence,
          status: activity.status,
          isDemo: activity.isDemo ?? false,
          autoApprove: activity.autoApprove ?? false,
          circleId: activity.circleId,
        },
        host,
        approvedCount,
        spotsLeft: activity.maxParticipants - approvedCount,
        myStatus: activity.hostId === userId ? "host" : (requestByActivity.get(activity._id) ?? "none"),
        attended: attended.has(activity._id),
      });
      if (rows.length >= limit) break;
    }

    return rows;
  },
});

export const get = query({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    const activity = await ctx.db.get(args.activityId);
    if (!activity) return null;
    if (await isBlockedPair(ctx, userId, activity.hostId)) return null;
    const host = await profileFor(ctx, userId, activity.hostId);
    if (!host) return null;

    const isHost = activity.hostId === userId;
    const requests = await approvedRequests(ctx, activity._id);
    const myRequest = requests.find((request) => request.userId === userId) ?? null;
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_activity_user", (q) =>
        q.eq("activityId", activity._id).eq("userId", userId),
      )
      .unique();
    const updates = await ctx.db
      .query("activityUpdates")
      .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
      .collect();
    const blocked = await listBlockedIds(ctx, userId);
    const [myConnectionsA, myConnectionsB] = await Promise.all([
      ctx.db.query("connections").withIndex("by_userA", (q) => q.eq("userA", userId)).collect(),
      ctx.db.query("connections").withIndex("by_userB", (q) => q.eq("userB", userId)).collect(),
    ]);
    const connectedIds = new Set(
      [...myConnectionsA, ...myConnectionsB].map((row) =>
        (row.userA === userId ? row.userB : row.userA) as string,
      ),
    );

    const participantIds = requests
      .filter((request) => request.status === "approved")
      .map((request) => request.userId)
      .filter((id) => !blocked.has(id as string));

    const participants = [];
    for (const id of participantIds.slice(0, 30)) {
      const person = await profileFor(ctx, userId, id);
      if (person) participants.push(person);
    }

    const circle = activity.circleId ? await ctx.db.get(activity.circleId) : null;
    const updateAuthor = host;
    const attendeeRows = await ctx.db
      .query("attendance")
      .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
      .collect();
    const reconnectIds = Array.from(
      new Set(attendeeRows.map((row) => row.userId)),
    ).filter((id) => id !== userId && !blocked.has(id as string));

    const reconnectCandidates =
      attendance === null ||
      reconnectState(
        activity.startsAt,
        activity.durationMins,
        activity.status,
        Date.now(),
      ) !== "open"
        ? []
        : (
            await Promise.all(
              reconnectIds
                .map(async (id) => {
                  const person = await profileFor(ctx, userId, id);
                  if (!person) return null;
                  const decision = await ctx.db
                    .query("reconnectDecisions")
                    .withIndex("by_pair", (q) =>
                      q
                        .eq("activityId", activity._id)
                        .eq("fromUserId", userId)
                        .eq("toUserId", id),
                    )
                    .unique();
                  return {
                    ...person,
                    myDecision: decision?.decision ?? null,
                    connected: connectedIds.has(id as string),
                  };
                }),
            )
          ).filter((row): row is NonNullable<typeof row> => row !== null);

    return {
      activity,
      host,
      circle: circle
        ? { _id: circle._id, name: circle.name, kind: circle.kind }
        : null,
      participants,
      isHost,
      myRequestStatus: isHost ? "host" : (myRequest?.status ?? "none"),
      myRequestMessage: myRequest?.message ?? null,
      hasAttended: attendance !== null,
      attendanceIsDemo: attendance?.isDemo ?? false,
      updates: updates.map((update) => ({
        _id: update._id,
        body: update.body,
        createdAt: update.createdAt,
        authorName: updateAuthor?.displayName ?? "Host",
      })),
      hostRequests: isHost
        ? (
            await Promise.all(
              requests
                .filter(
                  (request) =>
                    request.status !== "withdrawn" &&
                    !blocked.has(request.userId as string),
                )
                .map(async (request) => ({
                  _id: request._id,
                  status: request.status,
                  message: request.message ?? null,
                  createdAt: request.createdAt,
                  person: await profileFor(ctx, userId, request.userId),
                })),
            )
          ).filter((row) => row.person !== null)
        : [],
      reconnectCandidates,
      cityMatches: activity.city === profile.city,
    };
  },
});

function validateDraft(args: {
  title: string;
  description: string;
  category: string;
  venue: string;
  area: string;
  startsAt: number;
  durationMins: number;
  cost: number;
  maxParticipants: number;
  minParticipants?: number;
}) {
  const title = args.title.trim();
  const description = args.description.trim();
  if (title.length < 4 || title.length > 80) {
    throw new Error("Give your plan a title between 4 and 80 characters.");
  }
  if (description.length < 10 || description.length > 800) {
    throw new Error("Add a description between 10 and 800 characters.");
  }
  if (!CATEGORY_MAP[args.category]) throw new Error("Pick a valid category.");
  if (!args.venue.trim()) throw new Error("Add a public venue.");
  if (!args.area.trim()) throw new Error("Add the area the venue is in.");
  if (!Number.isFinite(args.startsAt) || args.startsAt < Date.now() + 10 * 60_000) {
    throw new Error("Pick a start time at least ten minutes from now.");
  }
  if (args.durationMins < 30 || args.durationMins > 720) {
    throw new Error("Plans should run between 30 minutes and 12 hours.");
  }
  if (args.cost < 0 || args.cost > 100_000) {
    throw new Error("Cost must be between ₹0 and ₹1,00,000.");
  }
  if (args.maxParticipants < 2 || args.maxParticipants > 30) {
    throw new Error("Plans need room for 2 to 30 people.");
  }
  if (args.minParticipants !== undefined) {
    if (args.minParticipants < 2 || args.minParticipants > args.maxParticipants) {
      throw new Error("Minimum participants must be between 2 and the maximum.");
    }
  }
  return { title, description, venue: args.venue.trim(), area: args.area.trim() };
}

export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    kind: kindValidator,
    area: v.string(),
    venue: v.string(),
    startsAt: v.number(),
    durationMins: v.number(),
    cost: v.number(),
    costNote: v.optional(v.string()),
    maxParticipants: v.number(),
    minParticipants: v.optional(v.number()),
    beginnerFriendly: v.boolean(),
    accessibility: v.optional(v.string()),
    rules: v.optional(v.string()),
    cancellationPolicy: v.optional(v.string()),
    equipment: v.optional(v.string()),
    recurrence: recurrenceValidator,
    circleId: v.optional(v.id("circles")),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    await enforceRateLimit(ctx, userId, "activity:create", 10, 24 * 60 * 60_000);
    const clean = validateDraft(args);

    if (args.circleId) {
      const circle = await ctx.db.get(args.circleId);
      if (!circle) throw new Error("That circle no longer exists.");
      const membership = await ctx.db
        .query("circleMembers")
        .withIndex("by_circle_user", (q) =>
          q.eq("circleId", args.circleId!).eq("userId", userId),
        )
        .unique();
      if (!membership || membership.status !== "approved") {
        throw new Error("Join the circle before adding plans to it.");
      }
    }

    const activityId = await ctx.db.insert("activities", {
      hostId: userId,
      title: clean.title,
      description: clean.description,
      category: args.category,
      kind: args.kind,
      city: profile.city,
      area: clean.area,
      venue: clean.venue,
      startsAt: args.startsAt,
      durationMins: args.durationMins,
      cost: args.cost,
      costNote: args.costNote?.trim() || undefined,
      maxParticipants: args.maxParticipants,
      minParticipants: args.minParticipants,
      beginnerFriendly: args.beginnerFriendly,
      accessibility: args.accessibility?.trim() || undefined,
      rules: args.rules?.trim() || undefined,
      cancellationPolicy: args.cancellationPolicy?.trim() || undefined,
      equipment: args.equipment?.trim() || undefined,
      recurrence: args.recurrence,
      circleId: args.circleId,
      status: "open",
      autoApprove: false,
      isDemo: false,
    });

    // Hosts check in through the same time window as everyone else. Creating a
    // plan must never pre-record attendance before the meeting happens.
    return activityId;
  },
});

export const update = mutation({
  args: {
    activityId: v.id("activities"),
    title: v.string(),
    description: v.string(),
    venue: v.string(),
    area: v.string(),
    startsAt: v.number(),
    durationMins: v.number(),
    cost: v.number(),
    maxParticipants: v.number(),
    beginnerFriendly: v.boolean(),
    rules: v.optional(v.string()),
    cancellationPolicy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("That plan no longer exists.");
    if (activity.hostId !== userId) throw new Error("Only the host can edit this plan.");
    if (activity.status === "cancelled") throw new Error("Cancelled plans can't be edited.");
    const clean = validateDraft({ ...args, category: activity.category });
    const approved = (await approvedRequests(ctx, activity._id)).filter(
      (request) => request.status === "approved",
    );
    if (args.maxParticipants < approved.length) {
      throw new Error("You can't reduce capacity below the people already joining.");
    }
    await ctx.db.patch(args.activityId, {
      title: clean.title,
      description: clean.description,
      venue: clean.venue,
      area: clean.area,
      startsAt: args.startsAt,
      durationMins: args.durationMins,
      cost: args.cost,
      maxParticipants: args.maxParticipants,
      beginnerFriendly: args.beginnerFriendly,
      rules: args.rules?.trim() || undefined,
      cancellationPolicy: args.cancellationPolicy?.trim() || undefined,
    });
  },
});

export const requestJoin = mutation({
  args: {
    activityId: v.id("activities"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    await enforceRateLimit(ctx, userId, "activity:join", 30, 24 * 60 * 60_000);
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("That plan no longer exists.");
    if (activity.status !== "open") throw new Error("This plan has been cancelled.");
    if (activity.hostId === userId) throw new Error("You're hosting this plan.");
    if (activity.startsAt < Date.now()) throw new Error("This plan has already started.");
    if (await isBlockedPair(ctx, userId, activity.hostId)) {
      throw new Error("This plan isn't available to you.");
    }
    if (!(await getVisibleProfile(ctx, userId, activity.hostId))) {
      throw new Error("This plan isn't available to you.");
    }

    const existing = await ctx.db
      .query("joinRequests")
      .withIndex("by_activity_user", (q) =>
        q.eq("activityId", args.activityId).eq("userId", userId),
      )
      .unique();

    if (existing) {
      if (existing.status === "pending" || existing.status === "approved") {
        return existing.status;
      }
      if (existing.status === "declined") {
        throw new Error("The host declined this request. Try another plan.");
      }
    }

    const approvedCount = (await approvedRequests(ctx, activity._id)).filter(
      (request) => request.status === "approved",
    ).length;
    if (approvedCount >= activity.maxParticipants) {
      throw new Error("This plan is full.");
    }

    if (args.message && args.message.length > 300) {
      throw new Error("Keep your note under 300 characters.");
    }

    const status = activity.autoApprove ? "approved" : "pending";
    if (existing) {
      await ctx.db.patch(existing._id, {
        status,
        message: args.message?.trim() || undefined,
        createdAt: Date.now(),
        decidedAt: activity.autoApprove ? Date.now() : undefined,
      });
    } else {
      await ctx.db.insert("joinRequests", {
        activityId: args.activityId,
        userId,
        status,
        message: args.message?.trim() || undefined,
        createdAt: Date.now(),
        decidedAt: activity.autoApprove ? Date.now() : undefined,
      });
    }
    return status;
  },
});

export const decideRequest = mutation({
  args: {
    requestId: v.id("joinRequests"),
    decision: v.union(v.literal("approved"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("That request no longer exists.");
    const activity = await ctx.db.get(request.activityId);
    if (!activity) throw new Error("That plan no longer exists.");
    if (activity.status === "cancelled") throw new Error("This plan has been cancelled.");
    if (activity.hostId !== userId) throw new Error("Only the host can decide requests.");
    if (request.status !== "pending") throw new Error("This request was already handled.");
    if (await isBlockedPair(ctx, userId, request.userId)) {
      throw new Error("That request is no longer available.");
    }

    if (args.decision === "approved") {
      const approvedCount = (await approvedRequests(ctx, activity._id)).filter(
        (row) => row.status === "approved",
      ).length;
      if (approvedCount >= activity.maxParticipants) {
        throw new Error("This plan is already full.");
      }
    }
    await ctx.db.patch(args.requestId, {
      status: args.decision,
      decidedAt: Date.now(),
    });
    return args.decision;
  },
});

export const withdraw = mutation({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const request = await ctx.db
      .query("joinRequests")
      .withIndex("by_activity_user", (q) =>
        q.eq("activityId", args.activityId).eq("userId", userId),
      )
      .unique();
    if (!request || request.status === "withdrawn") {
      throw new Error("You don't have a join request for this plan.");
    }
    await ctx.db.patch(request._id, { status: "withdrawn", decidedAt: Date.now() });
  },
});

export const cancel = mutation({
  args: { activityId: v.id("activities"), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("That plan no longer exists.");
    if (activity.hostId !== userId) throw new Error("Only the host can cancel this plan.");
    if (activity.status === "cancelled") return;

    await ctx.db.patch(args.activityId, {
      status: "cancelled",
      cancelReason: args.reason?.trim() || "The host cancelled this plan.",
    });
    const requests = await approvedRequests(ctx, activity._id);
    for (const request of requests) {
      if (request.status === "pending") {
        await ctx.db.patch(request._id, {
          status: "declined",
          decidedAt: Date.now(),
        });
      }
    }
  },
});

export const postUpdate = mutation({
  args: { activityId: v.id("activities"), body: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    await enforceRateLimit(ctx, userId, "activity:update", 60, 60 * 60_000);
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("That plan no longer exists.");
    if (activity.hostId !== userId) throw new Error("Only the host can post updates.");
    const body = args.body.trim();
    if (body.length < 3 || body.length > 500) {
      throw new Error("Updates should be between 3 and 500 characters.");
    }
    await ctx.db.insert("activityUpdates", {
      activityId: args.activityId,
      authorId: userId,
      body,
      createdAt: Date.now(),
    });
  },
});

export const markAttendance = mutation({
  args: { activityId: v.id("activities") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const activity = await ctx.db.get(args.activityId);
    if (!activity) throw new Error("That plan no longer exists.");
    if (activity.status === "cancelled") {
      throw new Error("Cancelled plans can't record attendance.");
    }
    if (activity.hostId !== userId) {
      const request = await ctx.db
        .query("joinRequests")
        .withIndex("by_activity_user", (q) =>
          q.eq("activityId", args.activityId).eq("userId", userId),
        )
        .unique();
      if (!request || request.status !== "approved") {
        throw new Error("Only people on the participant list can check in.");
      }
    }
    const window = checkInState(activity.startsAt, activity.durationMins, Date.now());
    if (window === "before") {
      throw new Error("You can check in from 30 minutes before the plan starts.");
    }
    if (window === "closed") {
      throw new Error("The check-in window closed 24 hours after the plan ended.");
    }
    await enforceRateLimit(ctx, userId, "activity:checkin", 20, 24 * 60 * 60_000);

    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_activity_user", (q) =>
        q.eq("activityId", args.activityId).eq("userId", userId),
      )
      .unique();
    if (existing) return existing._id;

    const attendanceId = await ctx.db.insert("attendance", {
      activityId: args.activityId,
      userId,
      method: activity.hostId === userId ? "host" : "self",
      markedAt: Date.now(),
    });

    const existingJournal = await ctx.db
      .query("journalEntries")
      .withIndex("by_user_activity", (q) =>
        q.eq("userId", userId).eq("activityId", args.activityId),
      )
      .unique();

    if (!existingJournal) {
      const requests = await approvedRequests(ctx, activity._id);
      const approvedCount = requests.filter((r) => r.status === "approved").length;
      await ctx.db.insert("journalEntries", {
        userId,
        activityId: args.activityId,
        title: activity.title,
        category: activity.category,
        occurredAt: activity.startsAt,
        durationMins: activity.durationMins,
        participants: approvedCount + 1,
        createdAt: Date.now(),
      });
    }
    return attendanceId;
  },
});

export const myPlans = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireProfile(ctx);
    const now = Date.now();
    const [hosted, requests, attendanceRows, blocked] = await Promise.all([
      ctx.db
        .query("activities")
        .withIndex("by_host", (q) => q.eq("hostId", userId))
        .collect(),
      ctx.db
        .query("joinRequests")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("attendance")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
      listBlockedIds(ctx, userId),
    ]);

    const hostedIds = new Set(hosted.map((activity) => activity._id as string));
    const joinedActivityIds = requests
      .filter((request) => request.status === "approved")
      .map((request) => request.activityId)
      .filter((id) => !hostedIds.has(id as string));

    const joined: Doc<"activities">[] = [];
    for (const id of joinedActivityIds) {
      const activity = await ctx.db.get(id);
      if (!activity) continue;
      if (blocked.has(activity.hostId as string)) continue;
      if (!(await getVisibleProfile(ctx, userId, activity.hostId))) continue;
      joined.push(activity);
    }

    const decorateHosted = async (activity: (typeof hosted)[number]) => {
      const rows = await approvedRequests(ctx, activity._id);
      const approvedRows = rows.filter((row) => row.status === "approved");
      return {
        activity,
        host: await profileFor(ctx, userId, activity.hostId),
        approvedCount: approvedRows.length,
        pendingCount: rows.filter((row) => row.status === "pending").length,
        spotsLeft: activity.maxParticipants - approvedRows.length,
        myStatus: "host" as const,
        attended: attendanceRows.some(
          (row) => row.activityId === activity._id,
        ),
      };
    };

    const decorateJoined = async (activity: (typeof joined)[number]) => {
      const rows = await approvedRequests(ctx, activity._id);
      const approvedRows = rows.filter((row) => row.status === "approved");
      const request = requests.find((row) => row.activityId === activity._id);
      return {
        activity,
        host: await profileFor(ctx, userId, activity.hostId),
        approvedCount: approvedRows.length,
        pendingCount: 0,
        spotsLeft: activity.maxParticipants - approvedRows.length,
        myStatus: request?.status ?? "none",
        attended: attendanceRows.some((row) => row.activityId === activity._id),
      };
    };

    type PlanCard = {
      activity: Doc<"activities">;
      host: ReturnType<typeof publicProfile> | null;
      approvedCount: number;
      pendingCount: number;
      spotsLeft: number;
      myStatus: string;
      attended: boolean;
    };
    const hostedUpcoming: PlanCard[] = [];
    const hostedPast: PlanCard[] = [];
    for (const activity of hosted) {
      (activity.startsAt >= now || activity.status === "open"
        ? hostedUpcoming
        : hostedPast
      ).push(await decorateHosted(activity));
    }

    const joinedUpcoming: PlanCard[] = [];
    const joinedPast: PlanCard[] = [];
    for (const activity of joined) {
      (activity.startsAt >= now && activity.status === "open"
        ? joinedUpcoming
        : joinedPast
      ).push(await decorateJoined(activity));
    }

    const sortByStart = (a: { activity: { startsAt: number } }, b: { activity: { startsAt: number } }) =>
      a.activity.startsAt - b.activity.startsAt;

    return {
      hosting: hostedUpcoming.sort(sortByStart),
      hostingPast: hostedPast.sort(
        (a, b) => b.activity.startsAt - a.activity.startsAt,
      ),
      upcoming: joinedUpcoming.sort(sortByStart),
      past: joinedPast.sort(
        (a, b) => b.activity.startsAt - a.activity.startsAt,
      ),
      pendingRequests: requests.filter((request) => request.status === "pending").length,
      now,
    };
  },
});

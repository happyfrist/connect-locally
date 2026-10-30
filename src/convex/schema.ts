import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
  v.literal("moderator"),
);
export type Role = Infer<typeof roleValidator>;

// Absent means active for accounts created before this field existed.
export const accountStatusValidator = v.union(
  v.literal("active"),
  v.literal("disabled"),
  v.literal("deleting"),
  v.literal("deleted"),
);

export const groupSizeValidator = v.union(
  v.literal("one"),
  v.literal("small"),
  v.literal("large"),
);

export const budgetValidator = v.union(
  v.literal("free"),
  v.literal("low"),
  v.literal("flexible"),
);

export const comfortValidator = v.union(
  v.literal("quiet"),
  v.literal("balanced"),
  v.literal("lively"),
);

export const recurrenceValidator = v.union(
  v.literal("once"),
  v.literal("weekly"),
  v.literal("biweekly"),
  v.literal("monthly"),
);

export const requestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("declined"),
  v.literal("withdrawn"),
);

export const reconnectDecisionValidator = v.union(
  v.literal("yes"),
  v.literal("maybe"),
  v.literal("no"),
);

export const circleKindValidator = v.union(
  v.literal("pod"),
  v.literal("community"),
  v.literal("conversation"),
);

export const reportStatusValidator = v.union(
  v.literal("open"),
  v.literal("reviewing"),
  v.literal("resolved"),
  v.literal("dismissed"),
);

export const reportTargetValidator = v.union(
  v.literal("activity"),
  v.literal("circle"),
  v.literal("member"),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
      accountStatus: v.optional(accountStatusValidator),
      deletedAt: v.optional(v.number()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Everything below belongs to the Connectmaxxing product.
    profiles: defineTable({
      userId: v.id("users"),
      displayName: v.string(),
      ageConfirmed: v.boolean(),
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
      onboardingComplete: v.boolean(),
      // Demo profiles are clearly marked seeded data, never real members.
      isDemo: v.optional(v.boolean()),
      // Only used by seeded demo profiles so the reconnect flow can be shown
      // end to end without pretending a real person consented.
      openToReconnect: v.optional(v.boolean()),
      hidden: v.optional(v.boolean()),
    })
      .index("by_user", ["userId"])
      .index("by_city", ["city"]),

    activities: defineTable({
      hostId: v.id("users"),
      title: v.string(),
      description: v.string(),
      category: v.string(),
      kind: v.union(v.literal("activity"), v.literal("invitation")),
      city: v.string(),
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
      status: v.union(v.literal("open"), v.literal("cancelled")),
      cancelReason: v.optional(v.string()),
      // Demo hosts approve requests immediately so the join journey can be
      // exercised without a second signed-in account. Flagged in the UI.
      autoApprove: v.optional(v.boolean()),
      isDemo: v.optional(v.boolean()),
    })
      .index("by_startsAt", ["startsAt"])
      .index("by_city_startsAt", ["city", "startsAt"])
      .index("by_host", ["hostId"])
      .index("by_circle", ["circleId"]),

    activityUpdates: defineTable({
      activityId: v.id("activities"),
      authorId: v.id("users"),
      body: v.string(),
      createdAt: v.number(),
    })
      .index("by_activity", ["activityId"])
      .index("by_author", ["authorId"]),

    joinRequests: defineTable({
      activityId: v.id("activities"),
      userId: v.id("users"),
      status: requestStatusValidator,
      message: v.optional(v.string()),
      createdAt: v.number(),
      decidedAt: v.optional(v.number()),
    })
      .index("by_activity", ["activityId"])
      .index("by_user", ["userId"])
      .index("by_activity_user", ["activityId", "userId"]),

    attendance: defineTable({
      activityId: v.id("activities"),
      userId: v.id("users"),
      method: v.union(v.literal("self"), v.literal("host")),
      isDemo: v.optional(v.boolean()),
      markedAt: v.number(),
    })
      .index("by_activity", ["activityId"])
      .index("by_user", ["userId"])
      .index("by_activity_user", ["activityId", "userId"]),

    reconnectDecisions: defineTable({
      activityId: v.id("activities"),
      fromUserId: v.id("users"),
      toUserId: v.id("users"),
      decision: reconnectDecisionValidator,
      createdAt: v.number(),
    })
      .index("by_activity", ["activityId"])
      .index("by_from", ["fromUserId"])
      .index("by_to", ["toUserId"])
      .index("by_from_to", ["fromUserId", "toUserId"])
      .index("by_pair", ["activityId", "fromUserId", "toUserId"]),

    connections: defineTable({
      userA: v.id("users"), // lexicographically smaller id
      userB: v.id("users"),
      activityId: v.optional(v.id("activities")),
      createdAt: v.number(),
    })
      .index("by_userA", ["userA"])
      .index("by_userB", ["userB"])
      .index("by_pair", ["userA", "userB"])
      .index("by_activity", ["activityId"]),

    blocks: defineTable({
      blockerId: v.id("users"),
      blockedId: v.id("users"),
      createdAt: v.number(),
    })
      .index("by_blocker", ["blockerId"])
      .index("by_blocked", ["blockedId"])
      .index("by_pair", ["blockerId", "blockedId"]),

    circles: defineTable({
      name: v.string(),
      description: v.string(),
      category: v.string(),
      kind: circleKindValidator,
      city: v.string(),
      area: v.string(),
      hostId: v.id("users"),
      rules: v.optional(v.string()),
      cadence: v.string(),
      joinPolicy: v.union(v.literal("open"), v.literal("request")),
      maxMembers: v.optional(v.number()),
      prompts: v.optional(v.array(v.string())),
      isDemo: v.optional(v.boolean()),
      createdAt: v.number(),
    })
      .index("by_city", ["city"])
      .index("by_host", ["hostId"]),

    circleMembers: defineTable({
      circleId: v.id("circles"),
      userId: v.id("users"),
      role: v.union(v.literal("host"), v.literal("member")),
      status: v.union(v.literal("approved"), v.literal("pending")),
      joinedAt: v.number(),
    })
      .index("by_circle", ["circleId"])
      .index("by_user", ["userId"])
      .index("by_circle_user", ["circleId", "userId"]),

    circlePosts: defineTable({
      circleId: v.id("circles"),
      authorId: v.id("users"),
      body: v.string(),
      kind: v.union(v.literal("discussion"), v.literal("announcement")),
      createdAt: v.number(),
    })
      .index("by_circle", ["circleId"])
      .index("by_author", ["authorId"]),

    journalEntries: defineTable({
      userId: v.id("users"),
      activityId: v.optional(v.id("activities")),
      title: v.string(),
      category: v.string(),
      occurredAt: v.number(),
      durationMins: v.number(),
      participants: v.number(),
      reflection: v.optional(v.string()),
      isDemo: v.optional(v.boolean()),
      createdAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_activity", ["userId", "activityId"]),

    reports: defineTable({
      reporterId: v.id("users"),
      targetType: reportTargetValidator,
      targetId: v.string(),
      targetLabel: v.string(),
      reason: v.string(),
      details: v.string(),
      status: reportStatusValidator,
      createdAt: v.number(),
      handledBy: v.optional(v.id("users")),
      resolution: v.optional(v.string()),
      resolvedAt: v.optional(v.number()),
    })
      .index("by_status", ["status"])
      .index("by_reporter", ["reporterId"]),

    auditLog: defineTable({
      // System/owner procedures have no signed-in actor. Member rows are kept
      // as a tombstone after account deletion so moderation remains auditable.
      actorId: v.optional(v.id("users")),
      action: v.string(),
      targetType: v.string(),
      targetId: v.string(),
      note: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_createdAt", ["createdAt"]),

    rateLimits: defineTable({
      bucket: v.string(),
      windowStart: v.number(),
      count: v.number(),
    }).index("by_bucket", ["bucket"]),

    accountDeletions: defineTable({
      userId: v.id("users"),
      status: v.union(v.literal("pending"), v.literal("running"), v.literal("complete")),
      createdAt: v.number(),
      updatedAt: v.number(),
      completedAt: v.optional(v.number()),
      lastError: v.optional(v.string()),
    })
      .index("by_user", ["userId"])
      .index("by_status", ["status"]),

    demoSeed: defineTable({
      key: v.string(),
      city: v.string(),
      seededAt: v.number(),
    }).index("by_key", ["key"]),
  },
  {
    schemaValidation: true,
  },
);

export default schema;
